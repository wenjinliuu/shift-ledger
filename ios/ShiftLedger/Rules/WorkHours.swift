import Foundation

/// 基本工时推算与周期加班汇总，对应 web 版 page.tsx 里的
/// `estimateMonthlyTarget` / `getMonthlyTarget` / `getPeriodOvertime` 等一组函数。
enum WorkHours {

    /// 某月的预计基本工时：周一至周五 × 日标准工时 − 落在工作日的法定节假日。
    ///
    /// 每年的调休与补班另行公布、并非固定规则，所以这里只给推算值，
    /// 设置页保留逐月手动修正入口。
    static func estimateMonthlyTarget(year: Int, month: Int, dailyStandard: Double) -> Double {
        var workdays = 0
        for day in 1...ScheduleCalendar.daysInMonth(year: year, month: month) {
            let key = ScheduleCalendar.key(year: year, month: month, day: day)
            if !ScheduleCalendar.isWeekend(key), !Holidays.isHoliday(key) { workdays += 1 }
        }
        return Double(workdays) * dailyStandard
    }

    /// 某月的基本工时：有手动修正就用修正值。
    static func monthlyTarget(_ document: ScheduleDocument, year: Int, month: Int) -> Double {
        let key = ScheduleCalendar.monthKey(year: year, month: month)
        if let override = document.targets[key] { return override }
        // 综合计算工时的基本工时按法定的每日 8 小时算，不随个人日标准工时变化。
        let daily = document.work.system == .comprehensive ? 8 : document.work.dailyStandard
        return estimateMonthlyTarget(year: year, month: month, dailyStandard: daily)
    }

    static func monthlyTarget(_ document: ScheduleDocument, month: ReportingMonth) -> Double {
        monthlyTarget(document, year: month.year, month: month.month)
    }

    /// 包含指定月份的统计年度。只有综合计算工时才允许自定义年度起点。
    static func reportingCycle(for document: ScheduleDocument, year: Int, month: Int) -> AnnualCycle {
        AnnualCycle.containing(year: year,
                               month: month,
                               annualStartMonth: document.work.system == .comprehensive
                                   ? document.work.annualStartMonth : 1)
    }

    static func target(_ document: ScheduleDocument, months: [ReportingMonth]) -> Double {
        months.reduce(0) { $0 + monthlyTarget(document, month: $1) }
    }

    /// 一段月份区间的加班合计。
    static func periodOvertime(_ document: ScheduleDocument,
                               records: [DayRecord],
                               months: [ReportingMonth]) -> Double {
        let work = document.work

        if work.system == .custom && work.customRule == .monthly {
            return months.reduce(0) { sum, month in
                sum + OvertimeRules.overtime(records: records.filter { $0.monthKey == month.key },
                                             settings: work,
                                             standardTarget: 0)
            }
        }

        guard work.system == .comprehensive else {
            return OvertimeRules.overtime(records: records,
                                          settings: work,
                                          standardTarget: target(document, months: months))
        }

        switch work.period {
        case .month:
            return months.reduce(0) { sum, month in
                sum + OvertimeRules.overtime(records: records.filter { $0.monthKey == month.key },
                                             settings: work,
                                             standardTarget: monthlyTarget(document, month: month))
            }
        case .quarter, .halfYear:
            let size = work.period == .quarter ? 3 : 6
            var overtime: Double = 0
            var start = 0
            while start < months.count {
                let slice = Array(months[start..<min(start + size, months.count)])
                let keys = Set(slice.map(\.key))
                overtime += OvertimeRules.overtime(records: records.filter { keys.contains($0.monthKey) },
                                                   settings: work,
                                                   standardTarget: target(document, months: slice))
                start += size
            }
            return overtime
        case .week:
            return OvertimeRules.overtime(records: records, settings: weeklySettings(work), standardTarget: 0)
        case .year, .custom:
            return OvertimeRules.overtime(records: records,
                                          settings: work,
                                          standardTarget: target(document, months: months))
        }
    }

    /// 综合计算工时按周结算时借用的标准工时设置。
    static func weeklySettings(_ work: WorkSettings) -> WorkSettings {
        var settings = work
        settings.system = .standard
        settings.standardDailyEnabled = false
        settings.standardWeeklyEnabled = true
        return settings
    }

    /// 日历页顶部展示的加班：预计（整段周期）与实际（已完成部分）。
    struct OvertimeSummary: Equatable, Sendable {
        var label: String = ""
        var projected: Double = 0
        var actual: Double = 0
    }

    static func overtimeForCalendarMonth(_ document: ScheduleDocument,
                                         year: Int,
                                         month: Int,
                                         today: String) -> OvertimeSummary {
        guard document.work.trackHours, document.work.trackOvertime else { return OvertimeSummary() }

        if document.work.system == .comprehensive {
            return comprehensiveScope(document, year: year, month: month, today: today)
        }
        let monthRecords = document.records.filter { $0.monthKey == ScheduleCalendar.monthKey(year: year, month: month) }
        let target = monthlyTarget(document, year: year, month: month)
        return OvertimeSummary(
            label: "\(month + 1)月",
            projected: OvertimeRules.overtime(records: monthRecords, settings: document.work, standardTarget: target),
            actual: OvertimeRules.overtime(records: monthRecords.filter { $0.countsAsCompleted(today: today) },
                                           settings: document.work, standardTarget: target)
        )
    }

    /// 综合计算工时下，这个月归属的结算范围（月 / 季度 / 半年 / 年 / 周）。
    static func comprehensiveScope(_ document: ScheduleDocument,
                                   year: Int,
                                   month: Int,
                                   today: String) -> OvertimeSummary {
        let cycle = reportingCycle(for: document, year: year, month: month)
        let activeIndex = cycle.months.firstIndex { $0.year == year && $0.month == month } ?? 0

        if document.work.period == .week {
            let monthKey = ScheduleCalendar.monthKey(year: year, month: month)
            let monthRecords = document.records.filter { $0.monthKey == monthKey }
            let settings = weeklySettings(document.work)
            return OvertimeSummary(
                label: "\(month + 1)月各周",
                projected: OvertimeRules.overtime(records: monthRecords, settings: settings, standardTarget: 0),
                actual: OvertimeRules.overtime(records: monthRecords.filter { $0.countsAsCompleted(today: today) },
                                               settings: settings, standardTarget: 0)
            )
        }

        var scopeMonths = [cycle.months[activeIndex]]
        var label = "\(month + 1)月"
        switch document.work.period {
        case .quarter:
            let start = (activeIndex / 3) * 3
            scopeMonths = Array(cycle.months[start..<min(start + 3, cycle.months.count)])
            label = "第 \(activeIndex / 3 + 1) 季度"
        case .halfYear:
            let start = activeIndex < 6 ? 0 : 6
            scopeMonths = Array(cycle.months[start..<min(start + 6, cycle.months.count)])
            label = start == 0 ? "上半年" : "下半年"
        case .year:
            scopeMonths = cycle.months
            label = cycle.label
        case .custom:
            scopeMonths = cycle.months
            label = "\(cycle.label)自定义周期"
        default:
            break
        }

        let keys = Set(scopeMonths.map(\.key))
        let scoped = document.records.filter { keys.contains($0.monthKey) }
        let target = target(document, months: scopeMonths)
        return OvertimeSummary(
            label: label,
            projected: OvertimeRules.overtime(records: scoped, settings: document.work, standardTarget: target),
            actual: OvertimeRules.overtime(records: scoped.filter { $0.countsAsCompleted(today: today) },
                                           settings: document.work, standardTarget: target)
        )
    }

    /// 加班能否按月拆开展示。综合计算工时按季度以上结算时就不能。
    static func canAllocateByMonth(_ document: ScheduleDocument) -> Bool {
        document.work.trackOvertime
            && (document.work.system != .comprehensive
                || document.work.period == .month
                || document.work.period == .week)
    }
}

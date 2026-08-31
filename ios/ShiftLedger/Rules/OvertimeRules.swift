import Foundation

/// 加班判定。逐条移植自 web 版 `calculateOvertime`，
/// `Tests/ShiftLedgerTests/OvertimeRulesTests.swift` 就是照着
/// web 版 `tests/schedule.test.ts` 写的，两端结论必须一致。
enum OvertimeRules {

    /// - Parameter standardTarget: 综合计算工时下这段周期的基本工时。
    static func overtime(records: [DayRecord],
                         settings: WorkSettings,
                         standardTarget: Double) -> Double {
        guard settings.trackHours, settings.trackOvertime else { return 0 }
        let total = records.reduce(0) { $0 + max(0, $1.hours) }

        if settings.system == .comprehensive {
            return max(0, total - standardTarget)
        }

        if settings.system == .manual || settings.system == .irregular
            || (settings.system == .custom && settings.customRule == .manual) {
            return records.reduce(0) { $0 + max(0, $1.manualOvertime ?? 0) }
        }

        if settings.system == .custom {
            switch settings.customRule {
            case .daily:
                return records.reduce(0) { $0 + max(0, $1.hours - settings.customThreshold) }
            case .weekly:
                return weeklyTotals(records).reduce(0) { $0 + max(0, $1 - settings.customThreshold) }
            default:
                return max(0, total - settings.customThreshold)
            }
        }

        // 标准工时：日、周两个口径各算一遍，取大的那个。
        let daily = settings.standardDailyEnabled
            ? records.reduce(0) { $0 + max(0, $1.hours - settings.dailyStandard) }
            : 0
        let weekly = settings.standardWeeklyEnabled
            ? weeklyTotals(records).reduce(0) { $0 + max(0, $1 - settings.weeklyStandard) }
            : 0
        return max(daily, weekly)
    }

    private static func weeklyTotals(_ records: [DayRecord]) -> [Double] {
        var weeks: [String: Double] = [:]
        for record in records {
            let key = ScheduleCalendar.startOfWeek(record.date)
            weeks[key, default: 0] += record.hours
        }
        return Array(weeks.values)
    }
}

import Foundation

/// 工时制度。
enum WorkSystem: String, Codable, Sendable, CaseIterable, Identifiable {
    /// 标准工时：按日 / 周标准判加班。
    case standard
    /// 综合计算工时：按周期总工时与基本工时之差判加班。
    case comprehensive
    /// 不定时工时：不自动判加班，只手动登记。
    case irregular
    /// 自定义规则。
    case custom
    /// 全部手动记录。
    case manual

    var id: String { rawValue }

    var label: String {
        switch self {
        case .standard: "标准工时"
        case .comprehensive: "综合计算工时"
        case .irregular: "不定时工时"
        case .custom: "自定义"
        case .manual: "手动记录"
        }
    }

    var caption: String {
        switch self {
        case .standard: "按日 8 小时 / 周 40 小时判定加班"
        case .comprehensive: "按周期总工时与基本工时之差判定加班"
        case .irregular: "不自动判定，加班全部手动登记"
        case .custom: "自己设定判定规则和阈值"
        case .manual: "工时和加班都逐日手动填写"
        }
    }
}

/// 统计周期。综合计算工时下同时决定加班的结算范围。
enum StatisticsPeriod: String, Codable, Sendable, CaseIterable, Identifiable {
    case week, month, quarter, halfYear, year, custom

    var id: String { rawValue }

    var label: String {
        switch self {
        case .week: "周"
        case .month: "月"
        case .quarter: "季度"
        case .halfYear: "半年"
        case .year: "年"
        case .custom: "自定义"
        }
    }
}

/// 加班的兑现方式，只影响文案展示。
enum CompensationMode: String, Codable, Sendable, CaseIterable, Identifiable {
    case hours, salary, timeOff, fixed, custom, none

    var id: String { rawValue }

    var label: String {
        switch self {
        case .hours: "按小时累计"
        case .salary: "折算工资"
        case .timeOff: "调休"
        case .fixed: "固定补贴"
        case .custom: "自定义"
        case .none: "不统计"
        }
    }
}

/// 自定义工时制下的加班判定口径。
enum CustomOvertimeRule: String, Codable, Sendable, CaseIterable, Identifiable {
    case daily, weekly, monthly, period, manual

    var id: String { rawValue }

    var label: String {
        switch self {
        case .daily: "每日超出阈值"
        case .weekly: "每周超出阈值"
        case .monthly: "每月超出阈值"
        case .period: "整个周期超出阈值"
        case .manual: "手动登记"
        }
    }
}

/// 职业预设，只影响初始推荐的班次、标签和模板。
enum CareerPreset: String, Codable, Sendable, CaseIterable, Identifiable {
    case manufacturing, medical, transport, safety, service, custom

    var id: String { rawValue }

    var label: String {
        switch self {
        case .manufacturing: "制造业 / 工厂"
        case .medical: "医疗护理"
        case .transport: "交通运输"
        case .safety: "公共安全"
        case .service: "服务业"
        case .custom: "自定义"
        }
    }
}

/// 日历上显示哪些信息。
struct CalendarDisplaySettings: Codable, Hashable, Sendable {
    var showShift: Bool = true
    var showTags: Bool = true
    var showShiftTime: Bool = false
    var showHours: Bool = false
    var showHolidays: Bool = true
}

/// 工时与加班的统计设置。
struct WorkSettings: Codable, Hashable, Sendable {
    var trackHours: Bool = true
    var trackOvertime: Bool = true
    var system: WorkSystem = .comprehensive
    var period: StatisticsPeriod = .month
    /// 年度周期的起始月份，1–12，与 web 版一样按人类习惯存一基。
    var annualStartMonth: Int = 1
    var dailyStandard: Double = 8
    var weeklyStandard: Double = 40
    var standardDailyEnabled: Bool = true
    var standardWeeklyEnabled: Bool = true
    var customRule: CustomOvertimeRule = .manual
    var customThreshold: Double = 0
    var compensation: CompensationMode = .hours
}

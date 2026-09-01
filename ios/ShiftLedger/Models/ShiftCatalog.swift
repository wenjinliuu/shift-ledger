import Foundation

/// 内置班次的固定 ID。与 web 版 `SHIFT_IDS` 一致，备份互导时才能对得上。
enum ShiftID {
    static let day = "shift-day"
    static let night = "shift-night"
    static let morning = "shift-morning"
    static let middle = "shift-middle"
    static let late = "shift-late"
    static let rest = "shift-rest"
    static let leave = "shift-leave"
    static let custom = "shift-custom"
    static let smallNight = "shift-small-night"
    static let bigNight = "shift-big-night"
    static let standby = "shift-standby"
    static let duty = "shift-medical-duty"
    static let clinic = "shift-medical-clinic"

    /// v1 数据里的班次类型到新 ID 的映射。
    static let legacyMap: [String: String] = [
        "day": day, "night": night, "morning": morning, "middle": middle,
        "late": late, "rest": rest, "leave": leave, "custom": custom,
    ]

    /// 设置页与选择器里的固定顺序。
    static let displayOrder = [
        day, night, rest, leave, morning, middle, late,
        smallNight, bigNight, duty, clinic, standby,
    ]
}

/// 强调色，色值与 web 版 `ACCENT_COLORS` 完全一致。
enum AccentHex {
    static let gray = "#8e8e8e"
    static let blue = "#3a83f6"
    static let green = "#53b559"
    static let yellow = "#f6c543"
    static let pink = "#ed77af"
    static let orange = "#ed7c37"
    static let purple = "#a67df2"
    static let red = "#e66770"
    static let cyan = "#55a8c7"

    static let shiftPalette = [blue, purple, green, yellow, orange, pink, gray, cyan]
    static let tagPalette = [purple, green, orange, pink, blue, gray, yellow, cyan]

    /// v1 里用过的旧色值，导入时统一收敛到新色板。
    static let legacyMap: [String: String] = [
        "#2f7df4": blue, "#3377cc": blue, "#5368e8": blue,
        "#665ce8": purple, "#7459d9": purple, "#6a62de": purple,
        "#9b63d9": purple, "#433f9e": purple,
        "#17a878": green, "#0d9b82": green,
        "#ef7d36": yellow, "#e89135": orange, "#d66a38": orange,
        "#d65374": pink, "#d14f72": pink,
        "#7a879b": gray, "#7b8799": gray, "#8793a5": gray,
        "#08a2b8": cyan,
    ]

    static func normalize(_ color: String) -> String {
        legacyMap[color.trimmingCharacters(in: .whitespaces).lowercased()] ?? color
    }

    /// 渐变下端。黄配橙、蓝配紫，其余用同色。
    static func gradientEnd(for color: String) -> String {
        let normalized = normalize(color).lowercased()
        if normalized == yellow { return orange }
        if normalized == blue { return purple }
        return normalized
    }
}

/// 内置班次与内置循环模板。
enum ShiftCatalog {

    /// 全部可选的内置班次。`hours` 用于 v1 数据迁移时带入原来的时长。
    static func all(hours: [String: Double] = [:]) -> [ShiftDefinition] {
        [
            ShiftDefinition(id: ShiftID.day, name: "白班", shortName: "白", color: AccentHex.yellow,
                            startTime: "08:00", endTime: "20:00",
                            defaultHours: hours["day"] ?? 12, legacyType: "day"),
            ShiftDefinition(id: ShiftID.night, name: "夜班", shortName: "夜", color: AccentHex.blue,
                            startTime: "20:00", endTime: "08:00", crossesMidnight: true,
                            defaultHours: hours["night"] ?? 12, legacyType: "night"),
            ShiftDefinition(id: ShiftID.morning, name: "早班", shortName: "早", color: AccentHex.orange,
                            startTime: "08:00", endTime: "16:00",
                            defaultHours: hours["morning"] ?? 8, legacyType: "morning"),
            ShiftDefinition(id: ShiftID.middle, name: "中班", shortName: "中", color: AccentHex.cyan,
                            startTime: "16:00", endTime: "00:00",
                            defaultHours: hours["middle"] ?? 8, legacyType: "middle"),
            ShiftDefinition(id: ShiftID.late, name: "晚班", shortName: "晚", color: AccentHex.purple,
                            startTime: "00:00", endTime: "08:00",
                            defaultHours: hours["late"] ?? 8, legacyType: "late"),
            ShiftDefinition(id: ShiftID.rest, name: "休息", shortName: "休", color: AccentHex.gray,
                            isRest: true, defaultHours: 0, countsAsWork: false, legacyType: "rest"),
            ShiftDefinition(id: ShiftID.leave, name: "请假", shortName: "假", color: AccentHex.pink,
                            isRest: true, defaultHours: 0, countsAsWork: false, legacyType: "leave"),
            ShiftDefinition(id: ShiftID.custom, name: "其他", shortName: "工", color: AccentHex.green,
                            defaultHours: 0, legacyType: "custom"),
            ShiftDefinition(id: ShiftID.duty, name: "责班", shortName: "责", color: AccentHex.purple,
                            startTime: "08:00", endTime: "16:00", defaultHours: 8),
            ShiftDefinition(id: ShiftID.clinic, name: "门诊", shortName: "诊", color: AccentHex.green,
                            startTime: "08:00", endTime: "16:00", defaultHours: 8),
        ]
    }

    /// 首次启动带的班次。
    static func base(hours: [String: Double] = [:]) -> [ShiftDefinition] {
        let order = [ShiftID.day, ShiftID.night, ShiftID.rest, ShiftID.leave,
                     ShiftID.morning, ShiftID.middle, ShiftID.late]
        let catalog = Dictionary(uniqueKeysWithValues: all(hours: hours).map { ($0.id, $0) })
        return order.compactMap { catalog[$0] }
    }

    /// 医护 / 公共安全预设额外补的班次。
    static func extra(_ id: String) -> ShiftDefinition? {
        switch id {
        case ShiftID.smallNight:
            ShiftDefinition(id: ShiftID.smallNight, name: "小夜", shortName: "小夜", color: AccentHex.blue,
                            startTime: "16:00", endTime: "00:00", defaultHours: 8)
        case ShiftID.bigNight:
            ShiftDefinition(id: ShiftID.bigNight, name: "大夜", shortName: "大夜", color: AccentHex.purple,
                            startTime: "00:00", endTime: "08:00", defaultHours: 8)
        case ShiftID.standby:
            ShiftDefinition(id: ShiftID.standby, name: "备班", shortName: "备", color: AccentHex.green,
                            defaultHours: 0, countsAsWork: false)
        default: nil
        }
    }

    /// 内置循环模板。
    static func builtInTemplates() -> [CycleTemplate] {
        let day = ShiftID.day, night = ShiftID.night, rest = ShiftID.rest
        let morning = ShiftID.morning, middle = ShiftID.middle, late = ShiftID.late
        return [
            CycleTemplate(id: "tpl-four-two", name: "4白2休 · 4夜2休",
                          caption: "白白白白休休 · 夜夜夜夜休休",
                          shiftIds: [day, day, day, day, rest, rest, night, night, night, night, rest, rest],
                          category: .manufacturing, builtIn: true),
            CycleTemplate(id: "tpl-two-rest-two", name: "2白2休 · 2夜2休",
                          caption: "白白休休 · 夜夜休休",
                          shiftIds: [day, day, rest, rest, night, night, rest, rest],
                          category: .manufacturing, builtIn: true),
            CycleTemplate(id: "tpl-one-one-two", name: "1白1夜 · 休2天",
                          caption: "白夜休休",
                          shiftIds: [day, night, rest, rest],
                          category: .manufacturing, builtIn: true),
            CycleTemplate(id: "tpl-two-two-two", name: "2白2夜 · 休2天",
                          caption: "白白夜夜休休",
                          shiftIds: [day, day, night, night, rest, rest],
                          category: .manufacturing, builtIn: true),
            CycleTemplate(id: "tpl-work-two-rest-two", name: "做二休二",
                          caption: "白白休休",
                          shiftIds: [day, day, rest, rest],
                          category: .manufacturing, builtIn: true),
            CycleTemplate(id: "tpl-three-four", name: "3上4休 / 4上3休",
                          caption: "白白白休休休休 · 白白白白休休休",
                          shiftIds: [day, day, day, rest, rest, rest, rest,
                                     day, day, day, day, rest, rest, rest],
                          category: .manufacturing, builtIn: true),
            CycleTemplate(id: "tpl-three-shift", name: "早 → 中 → 夜 → 休",
                          caption: "早中晚休",
                          shiftIds: [morning, middle, late, rest],
                          category: .threeShift, builtIn: true),
            CycleTemplate(id: "tpl-double-three", name: "夜夜 → 中中 → 早早 → 休休",
                          caption: "晚晚中中早早休休",
                          shiftIds: [late, late, middle, middle, morning, morning, rest, rest],
                          category: .threeShift, builtIn: true),
            CycleTemplate(id: "tpl-four-team-three-shift", name: "四班三倒 · 8小时",
                          caption: "早早中中晚晚休休",
                          shiftIds: [morning, morning, middle, middle, late, late, rest, rest],
                          category: .threeShift, builtIn: true),
        ]
    }

    /// 首次启动预置的四个模板。
    static let starterTemplateIDs: Set<String> = [
        "tpl-four-two", "tpl-two-rest-two", "tpl-one-one-two", "tpl-three-shift",
    ]

    static func makeId(_ prefix: String) -> String {
        "\(prefix)-\(UUID().uuidString.prefix(8).lowercased())"
    }
}

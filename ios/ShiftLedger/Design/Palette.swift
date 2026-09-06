import SwiftUI

extension Color {
    /// 从 web 版沿用的 `#rrggbb` 色值构造颜色，认不出来时回落到强调蓝。
    init(hexString: String) {
        var text = hexString.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if text.hasPrefix("#") { text.removeFirst() }
        guard text.count == 6, let value = UInt32(text, radix: 16) else {
            self = Color(hexString: AccentHex.blue)
            return
        }
        self.init(.sRGB,
                  red: Double((value >> 16) & 0xFF) / 255,
                  green: Double((value >> 8) & 0xFF) / 255,
                  blue: Double(value & 0xFF) / 255,
                  opacity: 1)
    }
}

/// 语义色与页面层次。
///
/// 底色、卡片、格子三层直接用系统的分组背景色，深浅两套由系统给，
/// 和「设置」「健康」这些系统 App 是同一套灰度关系。
/// 班次色沿用 web 版的强调色，只用在内容上，不参与背景层次。
enum Palette {
    static let blue = Color(hexString: AccentHex.blue)
    static let green = Color(hexString: AccentHex.green)
    static let orange = Color(hexString: AccentHex.orange)
    static let purple = Color(hexString: AccentHex.purple)
    static let pink = Color(hexString: AccentHex.pink)
    static let yellow = Color(hexString: AccentHex.yellow)
    static let gray = Color(hexString: AccentHex.gray)
    static let cyan = Color(hexString: AccentHex.cyan)
    static let red = Color(hexString: AccentHex.red)

    /// 法定节假日标记。
    static let holiday = Color(hexString: AccentHex.red)

    // MARK: - 背景层次

    /// 页面底色。
    static let canvas = Color(.systemGroupedBackground)
    /// 卡片。
    static let card = Color(.secondarySystemGroupedBackground)
    /// 卡片里的格子、输入框这类更内层的面。
    static let inset = Color(.tertiarySystemGroupedBackground)
    /// 分隔线。
    static let hairline = Color(.separator)
}

extension ShiftDefinition {
    var tint: Color { Color(hexString: color) }

    /// 班次色块用的微渐变，只在色球与日历胶囊这种小面积上用。
    var gradient: LinearGradient {
        LinearGradient(colors: [Color(hexString: color),
                                Color(hexString: AccentHex.gradientEnd(for: color))],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

extension DutyTag {
    var tint: Color { Color(hexString: color) }
}

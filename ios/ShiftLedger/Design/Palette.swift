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

/// 语义色与页面底色。色值与 web 版 `ACCENT_COLORS` 完全一致，
/// 深浅两套由系统动态色提供，不再手写两份主题变量。
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

    /// 法定节假日的标记色。
    static let holiday = Color(hexString: AccentHex.red)

    /// 页面底色。液态玻璃需要底下有内容才好看，所以用一层极淡的辉光而不是纯色。
    static func canvas(_ tint: Color = Palette.blue) -> some View {
        ZStack {
            Color(.systemGroupedBackground)
            RadialGradient(colors: [tint.opacity(0.14), .clear],
                           center: .init(x: 0.85, y: 0.05), startRadius: 0, endRadius: 420)
            RadialGradient(colors: [Palette.purple.opacity(0.10), .clear],
                           center: .init(x: 0.05, y: 0.98), startRadius: 0, endRadius: 380)
        }
        .ignoresSafeArea()
    }
}

extension ShiftDefinition {
    var tint: Color { Color(hexString: color) }

    /// 班次色块用的微渐变，和 web 版的 `--entity-color / --entity-color-2` 同一套。
    var gradient: LinearGradient {
        LinearGradient(colors: [Color(hexString: color),
                                Color(hexString: AccentHex.gradientEnd(for: color))],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

extension DutyTag {
    var tint: Color { Color(hexString: color) }
}

import SwiftUI

/// 液态玻璃的统一封装。
///
/// 所有 iOS 26 的 Liquid Glass 系统 API 都只在这一个文件里出现，
/// 页面代码一律走下面这些语义化修饰符。SDK 若调整签名，
/// 改动范围就锁在这里，不会散落到各个视图。
extension View {

    /// 卡片级玻璃：日历面板、统计卡、设置分组。
    func glassCard(cornerRadius: CGFloat = 26, tint: Color? = nil) -> some View {
        glassEffect(GlassStyle.card(tint: tint),
                    in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }

    /// 胶囊玻璃：筛选 chip、月份切换、轻提示。
    func glassPill(tint: Color? = nil, interactive: Bool = true) -> some View {
        glassEffect(GlassStyle.pill(tint: tint, interactive: interactive), in: Capsule())
    }

    /// 圆形玻璃：日历上的悬浮按钮。
    func glassCircle(tint: Color? = nil) -> some View {
        glassEffect(GlassStyle.pill(tint: tint, interactive: true), in: Circle())
    }

    /// 让相邻的玻璃元素在动画中融合。
    func glassMorph(id: some Hashable, in namespace: Namespace.ID) -> some View {
        glassEffectID(id, in: namespace)
    }
}

/// Glass 配置的集中定义。
enum GlassStyle {
    static func card(tint: Color?) -> Glass {
        guard let tint else { return .regular }
        // 淡淡染上班次色，让卡片"知道"自己属于哪个班，但不喧宾夺主。
        return Glass.regular.tint(tint.opacity(0.14))
    }

    static func pill(tint: Color?, interactive: Bool) -> Glass {
        var glass = Glass.regular
        if let tint { glass = glass.tint(tint.opacity(0.22)) }
        if interactive { glass = glass.interactive() }
        return glass
    }
}

/// 一组会互相融合的玻璃元素。
struct GlassGroup<Content: View>: View {
    var spacing: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        GlassEffectContainer(spacing: spacing) { content }
    }
}

/// 主操作按钮（"应用这套循环"这类）。
struct ProminentGlassButton: ButtonStyle {
    var tint: Color = Palette.blue

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(
                LinearGradient(colors: [tint.opacity(0.92), tint], startPoint: .top, endPoint: .bottom),
                in: Capsule()
            )
            .overlay(Capsule().strokeBorder(.white.opacity(0.30), lineWidth: 0.8))
            .shadow(color: tint.opacity(0.35), radius: 14, y: 6)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// 次级操作按钮：玻璃底 + 强调色文字。
struct SecondaryGlassButton: ButtonStyle {
    var tint: Color = Palette.blue

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .glassPill(tint: tint)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.72), value: configuration.isPressed)
    }
}

/// 分区标题，对应 web 版的 `.section-heading`。
struct SectionHeader: View {
    let title: String
    var eyebrow: String?
    var badge: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                if let eyebrow {
                    Text(eyebrow)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                }
                Text(title).font(.headline)
            }
            Spacer(minLength: 12)
            if let badge {
                Text(badge)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .glassPill(interactive: false)
            }
        }
    }
}

/// 统计数字卡片，对应 web 版的 `MetricCard`。
struct MetricCard: View {
    let label: String
    let value: String
    var detail: String?
    var tint: Color = Palette.blue

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title2.weight(.bold))
                .foregroundStyle(tint)
                .contentTransition(.numericText())
            if let detail {
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .glassCard(cornerRadius: 20, tint: tint)
    }
}

/// 班次色球，日历和列表里都用它表示一个班次。
struct ShiftOrb: View {
    let shift: ShiftDefinition
    var size: CGFloat = 38

    var body: some View {
        Text(shift.shortName)
            .font(.system(size: size * 0.38, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(shift.gradient, in: Circle())
            .overlay(Circle().strokeBorder(.white.opacity(0.35), lineWidth: 0.8))
            .shadow(color: shift.tint.opacity(0.35), radius: 6, y: 3)
    }
}

/// 标签小胶囊。
struct TagChip: View {
    let tag: DutyTag
    var body: some View {
        Text(tag.shortName)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(tag.tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tag.tint.opacity(0.16), in: Capsule())
    }
}

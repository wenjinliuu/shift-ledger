import SwiftUI

/// 三个主页面：日历、统计、设置。
/// 标签栏用系统原生的液态玻璃，向下滚动时自动收起。
struct RootView: View {
    @Environment(ScheduleStore.self) private var store

    @State private var selection: MainTab = .calendar
    @State private var toast: ToastMessage?

    var body: some View {
        TabView(selection: $selection) {
            Tab("日历", systemImage: "calendar", value: MainTab.calendar) {
                CalendarScreen()
            }
            Tab("统计", systemImage: "chart.bar.xaxis", value: MainTab.stats) {
                StatsScreen()
            }
            Tab("设置", systemImage: "gearshape", value: MainTab.settings) {
                SettingsScreen()
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .environment(\.showToast, ShowToastAction { message in
            withAnimation(.spring(response: 0.36, dampingFraction: 0.8)) { toast = message }
        })
        .overlay(alignment: .bottom) {
            if let toast {
                ToastBanner(message: toast)
                    .padding(.bottom, 96)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .task(id: toast.id) {
                        try? await Task.sleep(for: .seconds(2.2))
                        withAnimation(.easeOut(duration: 0.25)) { self.toast = nil }
                    }
            }
        }
    }
}

enum MainTab: Hashable {
    case calendar, stats, settings
}

// MARK: - 轻提示

struct ToastMessage: Identifiable, Equatable {
    let id = UUID()
    let text: String
    var symbol: String = "checkmark.circle.fill"
}

struct ToastBanner: View {
    let message: ToastMessage

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: message.symbol)
            Text(message.text).font(.subheadline.weight(.medium))
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .glassPill(interactive: false)
        .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
    }
}

/// 让任意子视图弹提示，不必层层传闭包。
struct ShowToastAction {
    let handler: (ToastMessage) -> Void

    func callAsFunction(_ text: String, symbol: String = "checkmark.circle.fill") {
        handler(ToastMessage(text: text, symbol: symbol))
    }
}

private struct ShowToastKey: EnvironmentKey {
    static let defaultValue = ShowToastAction { _ in }
}

extension EnvironmentValues {
    var showToast: ShowToastAction {
        get { self[ShowToastKey.self] }
        set { self[ShowToastKey.self] = newValue }
    }
}

import SwiftUI

/// 设置页：职业预设、班次与标签、工时制度、日历显示、基本工时修正、备份与关于。
struct SettingsScreen: View {
    @Environment(ScheduleStore.self) private var store
    @Environment(AppPreferences.self) private var preferences
    @Environment(\.showToast) private var showToast

    @State private var editingShift: ShiftDefinition?
    @State private var editingTag: DutyTag?
    @State private var isCreatingShift = false
    @State private var isCreatingTag = false

    private var document: ScheduleDocument { store.document }

    var body: some View {
        NavigationStack {
            Form {
                careerSection
                shiftsSection
                tagsSection
                workSection
                displaySection
                appearanceSection

                Section("工时修正与备份") {
                    NavigationLink {
                        MonthlyTargetsView()
                    } label: {
                        Label("每月基本工时", systemImage: "calendar.badge.clock")
                    }
                    NavigationLink {
                        BackupView()
                    } label: {
                        HStack {
                            Label("备份与恢复", systemImage: "arrow.up.arrow.down.circle")
                            if preferences.backupNeedsAttention {
                                Spacer()
                                Text("建议导出")
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(Palette.orange)
                            }
                        }
                    }
                }

                Section {
                    NavigationLink {
                        AboutView()
                    } label: {
                        Label("关于循环班表", systemImage: "info.circle")
                    }
                }
            }
            .navigationTitle("设置")
            .sheet(item: $editingShift) { shift in
                ShiftEditorView(shift: shift)
            }
            .sheet(isPresented: $isCreatingShift) {
                ShiftEditorView(shift: nil)
            }
            .sheet(item: $editingTag) { tag in
                TagEditorView(tag: tag)
            }
            .sheet(isPresented: $isCreatingTag) {
                TagEditorView(tag: nil)
            }
        }
    }

    // MARK: - 职业预设

    private var careerSection: some View {
        Section {
            Picker("工作类型", selection: Binding(
                get: { document.careerPreset },
                set: { preset in
                    store.applyCareerPreset(preset)
                    showToast("已切换为\(preset.label)预设")
                }
            )) {
                ForEach(CareerPreset.allCases) { preset in
                    Text(preset.label).tag(preset)
                }
            }
        } header: {
            Text("工作类型")
        } footer: {
            Text("只影响推荐的班次、标签和循环模板，不限制任何功能；切换只做加法，正在用的标签不会丢。")
        }
    }

    // MARK: - 班次

    private var shiftsSection: some View {
        Section {
            ForEach(document.orderedShifts) { shift in
                Button {
                    editingShift = shift
                } label: {
                    HStack(spacing: 12) {
                        ShiftOrb(shift: shift, size: 34)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(shift.name).foregroundStyle(.primary)
                            Text(detail(for: shift))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                }
            }
            Button {
                isCreatingShift = true
            } label: {
                Label("新增班次", systemImage: "plus.circle")
            }
        } header: {
            Text("班次")
        } footer: {
            Text("名称、简称、颜色、时间、跨天、休息属性和默认工时都可以改。")
        }
    }

    private func detail(for shift: ShiftDefinition) -> String {
        var parts: [String] = []
        if !shift.fullRange.isEmpty { parts.append(shift.fullRange) }
        if shift.isRest {
            parts.append("休息")
        } else if document.work.trackHours {
            parts.append("默认 \(HoursFormatter.hours(shift.defaultHours))")
        }
        return parts.joined(separator: " · ")
    }

    // MARK: - 标签

    private var tagsSection: some View {
        Section {
            if document.tags.isEmpty {
                Text("还没有职责标签。标签和班次相互独立，一天可以挂多个。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            ForEach(document.tags) { tag in
                Button {
                    editingTag = tag
                } label: {
                    HStack(spacing: 12) {
                        Circle().fill(tag.tint).frame(width: 14, height: 14)
                        Text(tag.name).foregroundStyle(.primary)
                        Spacer()
                        Text(tag.shortName).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            Button {
                isCreatingTag = true
            } label: {
                Label("新增标签", systemImage: "plus.circle")
            }
        } header: {
            Text("职责标签")
        }
    }

    // MARK: - 工时

    private var workSection: some View {
        Section {
            Toggle("统计工时与加班", isOn: Binding(
                get: { document.work.trackHours },
                set: { enabled in
                    store.update { document in
                        document.work.trackHours = enabled
                        document.work.trackOvertime = enabled
                    }
                }
            ))

            if document.work.trackHours {
                Picker("工时制度", selection: Binding(
                    get: { document.work.system },
                    set: { system in
                        store.update { document in
                            document.work.system = system
                            // 综合计算工时固定按月结算，和 web 版一致
                            if system == .comprehensive { document.work.period = .month }
                        }
                    }
                )) {
                    ForEach(WorkSystem.allCases) { system in
                        Text(system.label).tag(system)
                    }
                }
                Text(document.work.system.caption)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if document.work.system == .comprehensive {
                    Picker("结算周期", selection: bind(\.period)) {
                        ForEach([StatisticsPeriod.week, .month, .quarter, .halfYear, .year]) { period in
                            Text(period.label).tag(period)
                        }
                    }
                    Picker("年度起始月", selection: Binding(
                        get: { document.work.annualStartMonth },
                        set: { month in store.update { $0.work.annualStartMonth = month } }
                    )) {
                        ForEach(1...12, id: \.self) { month in
                            Text("\(month)月").tag(month)
                        }
                    }
                }

                if document.work.system == .standard {
                    Toggle("按每日标准判定", isOn: bind(\.standardDailyEnabled))
                    if document.work.standardDailyEnabled {
                        LabeledStepper(label: "每日标准工时", value: bind(\.dailyStandard), step: 0.5, range: 0...24)
                    }
                    Toggle("按每周标准判定", isOn: bind(\.standardWeeklyEnabled))
                    if document.work.standardWeeklyEnabled {
                        LabeledStepper(label: "每周标准工时", value: bind(\.weeklyStandard), step: 1, range: 0...80)
                    }
                }

                if document.work.system == .custom {
                    Picker("判定口径", selection: bind(\.customRule)) {
                        ForEach(CustomOvertimeRule.allCases) { rule in
                            Text(rule.label).tag(rule)
                        }
                    }
                    if document.work.customRule != .manual {
                        LabeledStepper(label: "阈值", value: bind(\.customThreshold), step: 1, range: 0...400)
                    }
                }

                Picker("加班兑现方式", selection: bind(\.compensation)) {
                    ForEach(CompensationMode.allCases) { mode in
                        Text(mode.label).tag(mode)
                    }
                }
            }
        } header: {
            Text("工时与加班")
        } footer: {
            Text("工时为个人预估，最终以公司考勤记录和适用制度为准。")
        }
    }

    /// 把 `document.work` 的某个字段变成可绑定值，改动直接落进 store。
    private func bind<Value>(_ keyPath: WritableKeyPath<WorkSettings, Value>) -> Binding<Value> {
        Binding(
            get: { document.work[keyPath: keyPath] },
            set: { newValue in store.update { $0.work[keyPath: keyPath] = newValue } }
        )
    }

    // MARK: - 显示

    private var displaySection: some View {
        Section("日历显示") {
            Toggle("显示班次简称", isOn: displayBind(\.showShift))
            Toggle("显示职责标签", isOn: displayBind(\.showTags))
            Toggle("显示班次时间", isOn: displayBind(\.showShiftTime))
            Toggle("显示当日工时", isOn: displayBind(\.showHours))
            Toggle("显示法定节假日", isOn: displayBind(\.showHolidays))
        }
    }

    private func displayBind(_ keyPath: WritableKeyPath<CalendarDisplaySettings, Bool>) -> Binding<Bool> {
        Binding(
            get: { document.display[keyPath: keyPath] },
            set: { newValue in store.update { $0.display[keyPath: keyPath] = newValue } }
        )
    }

    private var appearanceSection: some View {
        Section("外观") {
            Picker("主题", selection: Binding(
                get: { preferences.appearance },
                set: { preferences.appearance = $0 }
            )) {
                ForEach(AppPreferences.Appearance.allCases) { item in
                    Label(item.label, systemImage: item.symbol).tag(item)
                }
            }
        }
    }
}

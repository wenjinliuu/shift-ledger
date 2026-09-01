import SwiftUI

/// 日历页：月度排班 + 本月展望。
/// 左右滑动切月，点某一天进逐日编辑，"批量修改"依次点起止日改整段。
struct CalendarScreen: View {
    @Environment(ScheduleStore.self) private var store
    @Environment(\.showToast) private var showToast

    @State private var editingDate: String?
    @State private var isGeneratorPresented = false
    @State private var batchMode = false
    @State private var batchDates: [String] = []
    @State private var isBatchEditorPresented = false

    private var document: ScheduleDocument { store.document }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    monthPanel
                    nextShiftCard
                    outlookSection
                }
                .padding(.horizontal, 16)
            }
            // 标签栏是浮动玻璃，内容底部要自己让出这段高度
            .contentMargins(.bottom, 96, for: .scrollContent)
            .background { Palette.canvas() }
            .navigationTitle("循环班表")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(batchMode ? "退出多选" : "批量修改") {
                        batchMode.toggle()
                        batchDates = []
                    }
                    .font(.subheadline.weight(.semibold))
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isGeneratorPresented = true
                    } label: {
                        Label("循环排班", systemImage: "sparkles")
                    }
                }
            }
            .sheet(item: Binding(get: { editingDate.map(DateKeyBox.init) },
                                 set: { editingDate = $0?.key })) { box in
                DayEditorSheet(date: box.key)
            }
            .sheet(isPresented: $isGeneratorPresented) {
                CycleGeneratorSheet()
            }
            .sheet(isPresented: $isBatchEditorPresented, onDismiss: {
                batchDates = []
                batchMode = false
            }) {
                BatchEditorSheet(dates: batchDates)
            }
        }
    }

    // MARK: - 月历

    private var monthPanel: some View {
        VStack(spacing: 12) {
            MonthSwitcher(label: store.focusedMonthLabel,
                          onPrevious: { store.changeMonth(by: -1) },
                          onNext: { store.changeMonth(by: 1) },
                          onToday: { store.goToCurrentMonth() })

            if batchMode {
                batchHint
            }

            CalendarMonthGrid(year: store.focusedYear,
                              month: store.focusedMonth,
                              document: document,
                              todayKey: store.todayKey,
                              batchMode: batchMode,
                              batchDates: batchDates,
                              onSelect: handleTap)
                .id("\(store.focusedYear)-\(store.focusedMonth)")
                .transition(.opacity)

            Text("‹ 左右滑动切换月份 ›")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(16)
        .glassCard()
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 24)
                .onEnded { value in
                    guard !batchMode, abs(value.translation.width) > abs(value.translation.height) * 1.2 else { return }
                    withAnimation(.snappy(duration: 0.22)) {
                        store.changeMonth(by: value.translation.width < 0 ? 1 : -1)
                    }
                }
        )
    }

    private var batchHint: some View {
        HStack(spacing: 8) {
            Image(systemName: "square.dashed.inset.filled")
            VStack(alignment: .leading, spacing: 2) {
                Text(batchDates.isEmpty ? "请选择起始日期" : "起点：\(batchDates[0])")
                    .font(.subheadline.weight(.semibold))
                Text(batchDates.isEmpty ? "单日修改不会影响后续循环" : "再选截止日，将统一修改整个区间")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .glassPill(tint: Palette.blue, interactive: false)
    }

    private func handleTap(_ date: String) {
        guard batchMode else {
            editingDate = date
            return
        }
        if batchDates.isEmpty {
            batchDates = [date]
        } else {
            batchDates = ScheduleCalendar.range(batchDates[0], date)
            isBatchEditorPresented = true
        }
    }

    // MARK: - 下一班

    private var monthRecords: [DayRecord] {
        document.records.filter { $0.monthKey == ScheduleCalendar.monthKey(year: store.focusedYear, month: store.focusedMonth) }
    }

    private var workRecords: [DayRecord] {
        monthRecords.filter { document.shift($0.shiftId)?.countsAsWork == true }
    }

    private var upcoming: DayRecord? {
        monthRecords.first { $0.date >= store.todayKey && document.shift($0.shiftId)?.countsAsWork == true }
    }

    @ViewBuilder
    private var nextShiftCard: some View {
        if let upcoming, let shift = document.shift(upcoming.shiftId) {
            Button {
                editingDate = upcoming.date
            } label: {
                HStack(spacing: 12) {
                    ShiftOrb(shift: shift, size: 42)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("下一班 · \(shift.name)").font(.subheadline.weight(.semibold))
                        Text(document.work.trackHours
                             ? "\(upcoming.date) · \(HoursFormatter.compact(upcoming.hours)) 小时"
                             : upcoming.date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.tertiary)
                }
                .padding(14)
                .glassCard(cornerRadius: 22, tint: shift.tint)
            }
            .buttonStyle(.plain)
        } else {
            HStack(spacing: 12) {
                Image(systemName: "calendar")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 2) {
                    Text("本月暂无后续班次").font(.subheadline.weight(.semibold))
                    Text("可逐日添加，或使用循环排班。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding(14)
            .glassCard(cornerRadius: 22)
        }
    }

    // MARK: - 本月展望

    private var outlookSection: some View {
        let restDays = monthRecords.filter { document.shift($0.shiftId)?.isRest == true }.count
        let completed = workRecords.filter { $0.countsAsCompleted(today: store.todayKey) }
        let projectedHours = workRecords.reduce(0) { $0 + $1.hours }
        let actualHours = completed.reduce(0) { $0 + $1.hours }
        let basic = WorkHours.monthlyTarget(document, year: store.focusedYear, month: store.focusedMonth)
        let overtime = WorkHours.overtimeForCalendarMonth(document,
                                                         year: store.focusedYear,
                                                         month: store.focusedMonth,
                                                         today: store.todayKey)

        return VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: document.work.trackHours ? "排班与累计工时" : "我的班表",
                          eyebrow: "本月展望",
                          badge: "\(workRecords.count) 个工作日")

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                      spacing: 12) {
                MetricCard(label: "计划工作日",
                           value: "\(workRecords.count)天",
                           detail: "\(restDays) 个休息日",
                           tint: Palette.blue)
                MetricCard(label: "已完成班次",
                           value: "\(completed.count)天",
                           detail: "剩余 \(max(0, workRecords.count - completed.count)) 个班次",
                           tint: Palette.green)
                if document.work.trackHours {
                    MetricCard(label: "本月计划工时",
                               value: HoursFormatter.hours(projectedHours),
                               detail: "基本工时 \(HoursFormatter.hours(basic)) · 已完成 \(HoursFormatter.hours(actualHours))",
                               tint: Palette.purple)
                }
                if document.work.trackHours && document.work.trackOvertime {
                    MetricCard(label: document.work.system == .comprehensive ? "本周期额外工时" : "本月额外工时",
                               value: HoursFormatter.hours(overtime.projected),
                               detail: "\(overtime.label) · 已确认 \(HoursFormatter.hours(overtime.actual))",
                               tint: Palette.orange)
                }
            }
        }
        .padding(16)
        .glassCard()
    }
}

/// `sheet(item:)` 需要一个 Identifiable，日期字符串包一层。
struct DateKeyBox: Identifiable {
    let key: String
    var id: String { key }
}

/// 月份切换条。
struct MonthSwitcher: View {
    let label: String
    let onPrevious: () -> Void
    let onNext: () -> Void
    let onToday: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button(action: onPrevious) {
                Image(systemName: "chevron.left").font(.footnote.weight(.bold))
            }
            .buttonStyle(SecondaryGlassButton())

            Text(label)
                .font(.title3.weight(.bold))
                .contentTransition(.numericText())
                .frame(maxWidth: .infinity)

            Button(action: onNext) {
                Image(systemName: "chevron.right").font(.footnote.weight(.bold))
            }
            .buttonStyle(SecondaryGlassButton())

            Button("今天", action: onToday)
                .buttonStyle(SecondaryGlassButton(tint: Palette.green))
        }
    }
}

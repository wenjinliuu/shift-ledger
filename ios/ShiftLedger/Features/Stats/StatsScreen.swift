import Charts
import SwiftUI

/// 统计页。按功能开关切换成三种形态：仅排班、仅工时、工时与加班。
struct StatsScreen: View {
    @Environment(ScheduleStore.self) private var store
    @State private var scope: StatsScope = .month

    private var document: ScheduleDocument { store.document }

    var body: some View {
        NavigationStack {
            ZStack {
                Palette.canvas(Palette.purple)
                ScrollView {
                    VStack(spacing: 16) {
                        scopePicker
                        summarySection
                        if document.work.trackHours {
                            progressSection
                        }
                        compositionSection
                        if document.work.trackHours {
                            monthlyChartSection
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 28)
                }
            }
            .navigationTitle("统计")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - 范围

    enum StatsScope: String, CaseIterable, Identifiable {
        case month, year
        var id: String { rawValue }
        var label: String { self == .month ? "本月" : "年度周期" }
    }

    private var cycle: AnnualCycle {
        WorkHours.reportingCycle(for: document, year: store.focusedYear, month: store.focusedMonth)
    }

    private var scopeMonths: [ReportingMonth] {
        scope == .month
            ? [ReportingMonth(year: store.focusedYear, month: store.focusedMonth)]
            : cycle.months
    }

    private var scopeLabel: String {
        scope == .month ? store.focusedMonthLabel : cycle.label
    }

    private var scopeRecords: [DayRecord] {
        document.records(inMonths: scopeMonths)
    }

    private var workRecords: [DayRecord] {
        scopeRecords.filter { document.shift($0.shiftId)?.countsAsWork == true }
    }

    private var completedRecords: [DayRecord] {
        workRecords.filter { $0.countsAsCompleted(today: store.todayKey) }
    }

    private var plannedHours: Double { workRecords.reduce(0) { $0 + $1.hours } }
    private var actualHours: Double { completedRecords.reduce(0) { $0 + $1.hours } }
    private var basicHours: Double { WorkHours.target(document, months: scopeMonths) }
    private var overtime: Double {
        WorkHours.periodOvertime(document, records: workRecords, months: scopeMonths)
    }

    private var scopePicker: some View {
        Picker("统计范围", selection: $scope) {
            ForEach(StatsScope.allCases) { item in
                Text(item.label).tag(item)
            }
        }
        .pickerStyle(.segmented)
        .padding(.top, 4)
    }

    // MARK: - 概览

    private var summarySection: some View {
        let restDays = scopeRecords.filter { document.shift($0.shiftId)?.isRest == true }.count
        return VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: document.work.trackHours ? "工时概览" : "出勤概览",
                          eyebrow: scopeLabel,
                          badge: "\(workRecords.count) 个班")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                      spacing: 12) {
                MetricCard(label: "出勤天数", value: "\(workRecords.count)天",
                           detail: "休息 \(restDays) 天", tint: Palette.blue)
                MetricCard(label: "已完成", value: "\(completedRecords.count)天",
                           detail: "剩余 \(max(0, workRecords.count - completedRecords.count)) 天", tint: Palette.green)
                if document.work.trackHours {
                    MetricCard(label: "计划工时", value: HoursFormatter.hours(plannedHours),
                               detail: "已完成 \(HoursFormatter.hours(actualHours))", tint: Palette.purple)
                    MetricCard(label: "基本工时", value: HoursFormatter.hours(basicHours),
                               detail: basicDetail, tint: Palette.cyan)
                }
                if document.work.trackHours && document.work.trackOvertime {
                    MetricCard(label: "额外工时", value: HoursFormatter.hours(overtime),
                               detail: "\(document.work.system.label) · \(document.work.compensation.label)",
                               tint: Palette.orange)
                }
            }
        }
        .padding(16)
        .glassCard()
    }

    private var basicDetail: String {
        let diff = plannedHours - basicHours
        if diff > 0 { return "计划高出 \(HoursFormatter.hours(diff))" }
        if diff < 0 { return "计划少 \(HoursFormatter.hours(-diff))" }
        return "与基本工时持平"
    }

    // MARK: - 进度

    private var progressSection: some View {
        let ratio = basicHours > 0 ? min(actualHours / basicHours, 1.6) : 0
        return VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "已完成 / 基本工时", eyebrow: "进度")
            HStack(spacing: 20) {
                ProgressRing(progress: ratio,
                             caption: HoursFormatter.compact(actualHours),
                             subcaption: "／\(HoursFormatter.compact(basicHours))h")
                VStack(alignment: .leading, spacing: 8) {
                    ProgressLegend(color: Palette.green, label: "已完成", value: HoursFormatter.hours(actualHours))
                    ProgressLegend(color: Palette.purple, label: "计划中", value: HoursFormatter.hours(plannedHours))
                    ProgressLegend(color: Palette.cyan, label: "基本工时", value: HoursFormatter.hours(basicHours))
                    if document.work.trackOvertime {
                        ProgressLegend(color: Palette.orange, label: "额外工时", value: HoursFormatter.hours(overtime))
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(16)
        .glassCard()
    }

    // MARK: - 班次构成

    private var composition: [(shift: ShiftDefinition, count: Int)] {
        var counts: [String: Int] = [:]
        for record in scopeRecords { counts[record.shiftId, default: 0] += 1 }
        return counts.compactMap { id, count in
            document.shift(id).map { ($0, count) }
        }
        .sorted { $0.count > $1.count }
    }

    private var compositionSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "班次构成", eyebrow: scopeLabel, badge: "\(scopeRecords.count) 天")
            if composition.isEmpty {
                Text("这段时间还没有排班记录。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                let total = max(1, scopeRecords.count)
                // 一条按比例分段的色带，比饼图更省空间也更好读
                GeometryReader { proxy in
                    HStack(spacing: 2) {
                        ForEach(composition, id: \.shift.id) { item in
                            Capsule()
                                .fill(item.shift.gradient)
                                .frame(width: max(4, proxy.size.width * CGFloat(item.count) / CGFloat(total)))
                        }
                    }
                }
                .frame(height: 12)

                VStack(spacing: 8) {
                    ForEach(composition, id: \.shift.id) { item in
                        HStack(spacing: 10) {
                            ShiftOrb(shift: item.shift, size: 26)
                            Text(item.shift.name).font(.subheadline)
                            Spacer()
                            Text("\(item.count) 天")
                                .font(.subheadline.weight(.semibold))
                                .monospacedDigit()
                            Text("\(Int((Double(item.count) / Double(total) * 100).rounded()))%")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(width: 42, alignment: .trailing)
                        }
                    }
                }
            }
        }
        .padding(16)
        .glassCard()
    }

    // MARK: - 每月工时

    private struct MonthlyPoint: Identifiable {
        let id: String
        let label: String
        let planned: Double
        let basic: Double
    }

    private var monthlyPoints: [MonthlyPoint] {
        cycle.months.map { month in
            let records = document.records(inMonth: month)
                .filter { document.shift($0.shiftId)?.countsAsWork == true }
            return MonthlyPoint(id: month.key,
                                label: month.label,
                                planned: records.reduce(0) { $0 + $1.hours },
                                basic: WorkHours.monthlyTarget(document, month: month))
        }
    }

    private var monthlyChartSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "每月工时与基本工时", eyebrow: cycle.label)
            Chart {
                ForEach(monthlyPoints) { point in
                    BarMark(x: .value("月份", point.label),
                            y: .value("计划工时", point.planned))
                        .foregroundStyle(Palette.purple.gradient)
                        .cornerRadius(4)
                    LineMark(x: .value("月份", point.label),
                             y: .value("基本工时", point.basic))
                        .foregroundStyle(Palette.orange)
                        .interpolationMethod(.catmullRom)
                        .symbol(.circle)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 200)

            HStack(spacing: 14) {
                ProgressLegend(color: Palette.purple, label: "计划工时", value: "")
                ProgressLegend(color: Palette.orange, label: "基本工时", value: "")
                Spacer()
            }
        }
        .padding(16)
        .glassCard()
    }
}

/// 圆环进度。
struct ProgressRing: View {
    let progress: Double
    let caption: String
    let subcaption: String

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.primary.opacity(0.08), lineWidth: 12)
            Circle()
                .trim(from: 0, to: max(0.001, min(progress, 1)))
                .stroke(LinearGradient(colors: [Palette.green, Palette.cyan],
                                       startPoint: .top, endPoint: .bottomTrailing),
                        style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
            if progress > 1 {
                // 超出基本工时的部分再叠一圈橙色
                Circle()
                    .trim(from: 0, to: min(progress - 1, 1))
                    .stroke(Palette.orange, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(9)
            }
            VStack(spacing: 1) {
                Text(caption).font(.title3.weight(.bold)).monospacedDigit()
                Text(subcaption).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .frame(width: 116, height: 116)
        .animation(.spring(response: 0.5, dampingFraction: 0.85), value: progress)
    }
}

struct ProgressLegend: View {
    let color: Color
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).font(.caption).foregroundStyle(.secondary)
            if !value.isEmpty {
                Text(value).font(.caption.weight(.semibold)).monospacedDigit()
            }
        }
    }
}

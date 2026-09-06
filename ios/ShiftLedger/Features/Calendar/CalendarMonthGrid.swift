import SwiftUI

/// 月历网格。
///
/// 每个格子的信息都落在固定槽位上，自上而下：日期与状态点、法定节假日、
/// 班次时间、班次、工时与标签。同一列信息在整月里始终在同一高度，
/// 不靠自动伸缩去挤，也就不会出现有的格子错位、有的被压扁。
struct CalendarMonthGrid: View {
    let year: Int
    let month: Int
    let document: ScheduleDocument
    let todayKey: String
    var batchMode: Bool = false
    var batchDates: [String] = []
    let onSelect: (String) -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)

    /// 槽位高度。开关关掉的信息整月一起消失，格子高度仍然统一。
    private var cellHeight: CGFloat {
        var height: CGFloat = DayCellMetrics.date + DayCellMetrics.holiday + DayCellMetrics.shift
        if document.display.showShiftTime { height += DayCellMetrics.time }
        if showsFooter { height += DayCellMetrics.footer }
        return height + DayCellMetrics.verticalPadding * 2 + DayCellMetrics.spacing * 3
    }

    private var showsFooter: Bool {
        (document.display.showHours && document.work.trackHours) || document.display.showTags
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 4) {
                ForEach(Array(ScheduleCalendar.weekdaySymbols.enumerated()), id: \.offset) { index, symbol in
                    Text(symbol)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(index > 4 ? Palette.red.opacity(0.75) : Color.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(Array(0..<ScheduleCalendar.leadingBlanks(year: year, month: month)), id: \.self) { index in
                    Color.clear
                        .frame(height: cellHeight)
                        .id("blank-\(index)")
                }
                ForEach(Array(1...ScheduleCalendar.daysInMonth(year: year, month: month)), id: \.self) { day in
                    let key = ScheduleCalendar.key(year: year, month: month, day: day)
                    DayCell(day: day,
                            key: key,
                            record: document.record(on: key),
                            document: document,
                            isToday: key == todayKey,
                            holiday: document.display.showHolidays ? Holidays.name(of: key) : "",
                            batchMode: batchMode,
                            batchIndex: batchDates.firstIndex(of: key),
                            batchCount: batchDates.count,
                            height: cellHeight,
                            showsFooter: showsFooter)
                        .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .onTapGesture { onSelect(key) }
                }
            }
        }
    }
}

/// 格子里每一段信息的固定高度。
enum DayCellMetrics {
    static let date: CGFloat = 14
    static let holiday: CGFloat = 10
    static let time: CGFloat = 19
    static let shift: CGFloat = 18
    static let footer: CGFloat = 11
    static let spacing: CGFloat = 2
    static let verticalPadding: CGFloat = 4
}

private struct DayCell: View {
    let day: Int
    let key: String
    let record: DayRecord?
    let document: ScheduleDocument
    let isToday: Bool
    let holiday: String
    let batchMode: Bool
    let batchIndex: Int?
    let batchCount: Int
    let height: CGFloat
    let showsFooter: Bool

    private var shift: ShiftDefinition? { record.flatMap { document.shift($0.shiftId) } }
    private var tags: [DutyTag] { (record?.tagIds ?? []).compactMap { document.tag($0) } }

    /// 已计入实际工时的班次。
    private var isCompleted: Bool {
        guard let record, let shift, shift.countsAsWork else { return false }
        return record.completed || key < ScheduleCalendar.todayKey
    }

    private var showsHours: Bool {
        guard let shift, let record else { return false }
        return document.display.showHours && document.work.trackHours
            && shift.countsAsWork && !shift.isRest && record.hours > 0
    }

    var body: some View {
        VStack(spacing: DayCellMetrics.spacing) {
            dateRow
            holidayRow
            if document.display.showShiftTime { timeRow }
            shiftRow
            if showsFooter { footerRow }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, DayCellMetrics.verticalPadding)
        .frame(height: height)
        .frame(maxWidth: .infinity)
        .insetSurface(cornerRadius: 12)
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(borderColor, lineWidth: batchIndex != nil || isToday ? 1.6 : 0)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("day-\(key)")
        .accessibilityLabel(accessibilityText)
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - 槽位

    /// 日期在左，状态点固定在右上角。
    private var dateRow: some View {
        HStack(spacing: 0) {
            Text("\(day)")
                .font(.system(size: 13, weight: isToday ? .bold : .semibold))
                .foregroundStyle(isToday ? Palette.blue : .primary)
                .monospacedDigit()
            Spacer(minLength: 0)
            statusDot
        }
        .frame(height: DayCellMetrics.date)
    }

    @ViewBuilder
    private var statusDot: some View {
        if batchMode {
            Text(batchBadge)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(batchIndex == nil ? Color.secondary.opacity(0.5) : Palette.blue)
        } else if isCompleted {
            Circle()
                .fill(Palette.green)
                .frame(width: 5, height: 5)
                .accessibilityLabel("已计入工时")
        }
    }

    private var holidayRow: some View {
        Text(holiday.isEmpty ? " " : Holidays.shortName(holiday))
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(Palette.holiday)
            .lineLimit(1)
            .minimumScaleFactor(0.85)
            .frame(height: DayCellMetrics.holiday)
            .opacity(holiday.isEmpty ? 0 : 1)
    }

    /// 起止时间各占一行，写全 `7:00` / `19:00`，字号让位给班次和工时。
    private var timeRow: some View {
        VStack(spacing: -1) {
            Text(shift?.startTime ?? " ")
            Text(shift?.endTime ?? " ")
        }
        .font(.system(size: 8.5, weight: .medium))
        .monospacedDigit()
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .frame(height: DayCellMetrics.time)
        .opacity((shift?.startTime.isEmpty == false) ? 1 : 0)
    }

    @ViewBuilder
    private var shiftRow: some View {
        if let shift, document.display.showShift {
            Text(shift.shortName)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.horizontal, 3)
                .frame(maxWidth: .infinity)
                .frame(height: DayCellMetrics.shift)
                .background(shift.isRest ? AnyShapeStyle(shift.tint.opacity(0.75)) : AnyShapeStyle(shift.gradient),
                            in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        } else if record == nil {
            Text("＋")
                .font(.system(size: 12))
                .foregroundStyle(.tertiary)
                .frame(height: DayCellMetrics.shift)
        } else {
            Color.clear.frame(height: DayCellMetrics.shift)
        }
    }

    /// 工时在左（这一格里最该看清的数字），标签用彩点在右，不抢位置。
    private var footerRow: some View {
        HStack(spacing: 2) {
            if showsHours, let record {
                // 工时是这一格最该看清的数字，用主文本色而不是班次色——
                // 浅黄这类班次色压在浅底上对比度不够。
                Text(HoursFormatter.hours(record.hours))
                    .font(.system(size: 10, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            Spacer(minLength: 0)
            if document.display.showTags, !tags.isEmpty {
                HStack(spacing: 2) {
                    ForEach(tags.prefix(3)) { tag in
                        Circle().fill(tag.tint).frame(width: 4, height: 4)
                    }
                }
            }
        }
        .frame(height: DayCellMetrics.footer)
    }

    // MARK: - 细节

    private var batchBadge: String {
        guard let batchIndex else { return "" }
        if batchIndex == 0 { return "始" }
        if batchIndex == batchCount - 1, batchCount > 1 { return "止" }
        return "✓"
    }

    private var borderColor: Color {
        if batchIndex != nil { return Palette.blue }
        if isToday { return Palette.blue.opacity(0.55) }
        return .clear
    }

    private var accessibilityText: String {
        var parts = ["\(day)日"]
        if !holiday.isEmpty { parts.append(holiday) }
        if let shift {
            parts.append(shift.name)
            if !shift.fullRange.isEmpty { parts.append(shift.fullRange) }
        }
        if showsHours, let record { parts.append("\(HoursFormatter.compact(record.hours))小时") }
        parts.append(contentsOf: tags.map(\.name))
        if isCompleted { parts.append("已计入工时") }
        return parts.joined(separator: "，")
    }
}

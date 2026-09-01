import SwiftUI

/// 月历网格。一格显示：日期、法定节假日标记、班次简称，
/// 以及设置页里勾选的附加信息（时间段、职责标签、工时）。
struct CalendarMonthGrid: View {
    let year: Int
    let month: Int
    let document: ScheduleDocument
    let todayKey: String
    var batchMode: Bool = false
    var batchDates: [String] = []
    let onSelect: (String) -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 4) {
                ForEach(Array(ScheduleCalendar.weekdaySymbols.enumerated()), id: \.offset) { index, symbol in
                    Text("周\(symbol)")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(index > 4 ? Palette.red.opacity(0.8) : Color.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(Array(0..<ScheduleCalendar.leadingBlanks(year: year, month: month)), id: \.self) { index in
                    Color.clear.frame(height: 62).id("blank-\(index)")
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
                            batchCount: batchDates.count)
                        .onTapGesture { onSelect(key) }
                }
            }
        }
    }
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

    private var shift: ShiftDefinition? { record.flatMap { document.shift($0.shiftId) } }

    private var visibleTags: [DutyTag] {
        (record?.tagIds ?? []).compactMap { document.tag($0) }
    }

    private var isCompleted: Bool {
        guard let record, let shift, shift.countsAsWork else { return false }
        return record.completed || key < ScheduleCalendar.todayKey
    }

    private var showsHours: Bool {
        guard let shift else { return false }
        return document.display.showHours && document.work.trackHours && shift.countsAsWork && !shift.isRest
    }

    var body: some View {
        VStack(spacing: 3) {
            HStack(spacing: 2) {
                Text("\(day)")
                    .font(.caption.weight(isToday ? .bold : .semibold))
                    .foregroundStyle(isToday ? Palette.blue : .primary)
                if isCompleted {
                    Circle()
                        .fill(Palette.green)
                        .frame(width: 4, height: 4)
                }
                Spacer(minLength: 0)
                if batchMode {
                    Text(batchBadge)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(batchIndex == nil ? Color.secondary : Palette.blue)
                }
            }

            if !holiday.isEmpty {
                Text("法·\(Holidays.shortName(holiday))")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(Palette.red)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }

            Spacer(minLength: 0)

            if let shift {
                if document.display.showShiftTime, !shift.compactRange.isEmpty {
                    Text(shift.compactRange)
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                if document.display.showTags, !visibleTags.isEmpty {
                    HStack(spacing: 2) {
                        ForEach(visibleTags.prefix(2)) { tag in
                            Text(tag.shortName)
                                .font(.system(size: 8, weight: .semibold))
                                .foregroundStyle(tag.tint)
                                .lineLimit(1)
                        }
                        if visibleTags.count > 2 {
                            Text("+\(visibleTags.count - 2)")
                                .font(.system(size: 8, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                HStack(spacing: 3) {
                    if document.display.showShift {
                        Text(shift.shortName)
                            .font(.system(size: 11, weight: .bold))
                    }
                    if showsHours, let record {
                        Text(HoursFormatter.hours(record.hours))
                            .font(.system(size: 9, weight: .medium))
                            .opacity(0.85)
                    }
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .frame(maxWidth: .infinity)
                .background(shift.isRest ? AnyShapeStyle(shift.tint.opacity(0.65)) : AnyShapeStyle(shift.gradient),
                            in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            } else {
                Text("＋")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(5)
        .frame(height: 62)
        .frame(maxWidth: .infinity)
        .background {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(.ultraThinMaterial.opacity(0.6))
        }
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(borderColor, lineWidth: batchIndex != nil || isToday ? 1.5 : 0.5)
        }
        .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("day-\(key)")
        .accessibilityLabel(accessibilityText)
        .accessibilityAddTraits(.isButton)
    }

    private var batchBadge: String {
        guard let batchIndex else { return "" }
        if batchIndex == 0 { return "始" }
        if batchIndex == batchCount - 1, batchCount > 1 { return "止" }
        return "✓"
    }

    private var borderColor: Color {
        if batchIndex != nil { return Palette.blue }
        if isToday { return Palette.blue.opacity(0.6) }
        return Color.primary.opacity(0.06)
    }

    private var accessibilityText: String {
        [String(day) + "日", holiday, shift?.name]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: "，")
    }
}

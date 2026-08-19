export const DATA_VERSION = 2;
export const STORAGE_DATA = "shift-ledger-data-v2";
export const STORAGE_LEGACY_SETTINGS = "shift-ledger-settings-v1";
export const STORAGE_LEGACY_RECORDS = "shift-ledger-records-v1";

export type WorkSystem =
  | "standard"
  | "comprehensive"
  | "irregular"
  | "custom"
  | "manual";
export type StatisticsPeriod =
  | "week"
  | "month"
  | "quarter"
  | "halfYear"
  | "year"
  | "custom";
export type CompensationMode =
  | "hours"
  | "salary"
  | "timeOff"
  | "fixed"
  | "custom"
  | "none";
export type CareerPreset =
  | "manufacturing"
  | "medical"
  | "transport"
  | "safety"
  | "service"
  | "custom";
export type CustomOvertimeRule =
  | "daily"
  | "weekly"
  | "monthly"
  | "period"
  | "manual";

export type CalendarDisplaySettings = {
  showShift: boolean;
  showTags: boolean;
  showShiftTime: boolean;
  showHours: boolean;
  showHolidays: boolean;
};

export type Shift = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  isRest: boolean;
  defaultHours: number;
  countsAsWork: boolean;
  note?: string;
  legacyType?: string;
};

export type DutyTag = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

export type CycleTemplate = {
  id: string;
  name: string;
  caption: string;
  shiftIds: string[];
  category: "manufacturing" | "threeShift" | "medical" | "custom";
  builtIn?: boolean;
};

export type ActiveCycle = {
  id: string;
  name: string;
  startDate: string;
  shiftIds: string[];
};

export type DayRecord = {
  date: string;
  shiftId: string;
  hours: number;
  tagIds: string[];
  completed: boolean;
  planned: boolean;
  note?: string;
  manualOvertime?: number;
  source: "cycle" | "manual" | "legacy";
  cycleId?: string;
};

export type WorkSettings = {
  trackHours: boolean;
  trackOvertime: boolean;
  system: WorkSystem;
  period: StatisticsPeriod;
  annualStartMonth: number;
  dailyStandard: number;
  weeklyStandard: number;
  standardDailyEnabled: boolean;
  standardWeeklyEnabled: boolean;
  customRule: CustomOvertimeRule;
  customThreshold: number;
  compensation: CompensationMode;
};

export type AppData = {
  dataVersion: 2;
  careerPreset: CareerPreset;
  shifts: Shift[];
  tags: DutyTag[];
  cycleTemplates: CycleTemplate[];
  activeCycle: ActiveCycle | null;
  display: CalendarDisplaySettings;
  work: WorkSettings;
  targets: Record<string, number>;
  records: DayRecord[];
};

export type AnnualCycleMonth = {
  year: number;
  month: number;
  key: string;
};

export type AnnualCycle = {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  startDate: string;
  endDate: string;
  label: string;
  months: AnnualCycleMonth[];
};

/**
 * Returns the 12-month reporting cycle containing a calendar month.
 * `annualStartMonth` is one-based so persisted settings stay human-readable.
 */
export function getAnnualCycle(
  year: number,
  month: number,
  annualStartMonth = 1,
): AnnualCycle {
  const safeStart =
    Number.isInteger(annualStartMonth) &&
    annualStartMonth >= 1 &&
    annualStartMonth <= 12
      ? annualStartMonth
      : 1;
  const startMonth = safeStart - 1;
  const startYear = month >= startMonth ? year : year - 1;
  const months = Array.from({ length: 12 }, (_, index) => {
    const cursor = new Date(startYear, startMonth + index, 1);
    const cursorYear = cursor.getFullYear();
    const cursorMonth = cursor.getMonth();
    return {
      year: cursorYear,
      month: cursorMonth,
      key: `${cursorYear}-${String(cursorMonth + 1).padStart(2, "0")}`,
    };
  });
  const first = months[0];
  const last = months[months.length - 1];
  const lastDay = new Date(last.year, last.month + 1, 0).getDate();
  return {
    startYear: first.year,
    startMonth: first.month,
    endYear: last.year,
    endMonth: last.month,
    startDate: `${first.key}-01`,
    endDate: `${last.key}-${String(lastDay).padStart(2, "0")}`,
    label:
      first.year === last.year
        ? `${first.year}年${first.month + 1}月–${last.month + 1}月`
        : `${first.year}年${first.month + 1}月–${last.year}年${last.month + 1}月`,
    months,
  };
}

export const SHIFT_IDS = {
  day: "shift-day",
  night: "shift-night",
  morning: "shift-morning",
  middle: "shift-middle",
  late: "shift-late",
  rest: "shift-rest",
  leave: "shift-leave",
  custom: "shift-custom",
  smallNight: "shift-small-night",
  bigNight: "shift-big-night",
  standby: "shift-standby",
  duty: "shift-medical-duty",
  clinic: "shift-medical-clinic",
} as const;

const LEGACY_SHIFT_MAP: Record<string, string> = {
  day: SHIFT_IDS.day,
  night: SHIFT_IDS.night,
  morning: SHIFT_IDS.morning,
  middle: SHIFT_IDS.middle,
  late: SHIFT_IDS.late,
  rest: SHIFT_IDS.rest,
  leave: SHIFT_IDS.leave,
  custom: SHIFT_IDS.custom,
};

export const ACCENT_COLORS = {
  gray: "#8e8e8e",
  blue: "#3a83f6",
  green: "#53b559",
  yellow: "#f6c543",
  pink: "#ed77af",
  orange: "#ed7c37",
  purple: "#a67df2",
  red: "#e66770",
  cyan: "#55a8c7",
} as const;

export const SHIFT_COLORS = [
  ACCENT_COLORS.blue,
  ACCENT_COLORS.purple,
  ACCENT_COLORS.green,
  ACCENT_COLORS.yellow,
  ACCENT_COLORS.orange,
  ACCENT_COLORS.pink,
  ACCENT_COLORS.gray,
  ACCENT_COLORS.cyan,
];
export const TAG_COLORS = [
  ACCENT_COLORS.purple,
  ACCENT_COLORS.green,
  ACCENT_COLORS.orange,
  ACCENT_COLORS.pink,
  ACCENT_COLORS.blue,
  ACCENT_COLORS.gray,
  ACCENT_COLORS.yellow,
  ACCENT_COLORS.cyan,
];

const LEGACY_COLOR_MAP: Record<string, string> = {
  "#2f7df4": ACCENT_COLORS.blue,
  "#3377cc": ACCENT_COLORS.blue,
  "#5368e8": ACCENT_COLORS.blue,
  "#665ce8": ACCENT_COLORS.purple,
  "#7459d9": ACCENT_COLORS.purple,
  "#6a62de": ACCENT_COLORS.purple,
  "#9b63d9": ACCENT_COLORS.purple,
  "#433f9e": ACCENT_COLORS.purple,
  "#17a878": ACCENT_COLORS.green,
  "#0d9b82": ACCENT_COLORS.green,
  "#ef7d36": ACCENT_COLORS.yellow,
  "#e89135": ACCENT_COLORS.orange,
  "#d66a38": ACCENT_COLORS.orange,
  "#d65374": ACCENT_COLORS.pink,
  "#d14f72": ACCENT_COLORS.pink,
  "#7a879b": ACCENT_COLORS.gray,
  "#7b8799": ACCENT_COLORS.gray,
  "#8793a5": ACCENT_COLORS.gray,
  "#08a2b8": ACCENT_COLORS.cyan,
};

export function normalizeThemeColor(color: string) {
  return LEGACY_COLOR_MAP[color.trim().toLowerCase()] ?? color;
}

export function gradientEndForColor(color: string) {
  const normalized = normalizeThemeColor(color).toLowerCase();
  if (normalized === ACCENT_COLORS.yellow) return ACCENT_COLORS.orange;
  if (normalized === ACCENT_COLORS.blue) return ACCENT_COLORS.purple;
  return normalized;
}

function shiftCatalog(hours: Partial<Record<string, number>> = {}): Shift[] {
  return [
    {
      id: SHIFT_IDS.day,
      name: "白班",
      shortName: "白",
      color: ACCENT_COLORS.yellow,
      startTime: "08:00",
      endTime: "20:00",
      crossesMidnight: false,
      isRest: false,
      defaultHours: hours.day ?? 12,
      countsAsWork: true,
      legacyType: "day",
    },
    {
      id: SHIFT_IDS.night,
      name: "夜班",
      shortName: "夜",
      color: ACCENT_COLORS.blue,
      startTime: "20:00",
      endTime: "08:00",
      crossesMidnight: true,
      isRest: false,
      defaultHours: hours.night ?? 12,
      countsAsWork: true,
      legacyType: "night",
    },
    {
      id: SHIFT_IDS.morning,
      name: "早班",
      shortName: "早",
      color: ACCENT_COLORS.orange,
      startTime: "08:00",
      endTime: "16:00",
      crossesMidnight: false,
      isRest: false,
      defaultHours: hours.morning ?? 8,
      countsAsWork: true,
      legacyType: "morning",
    },
    {
      id: SHIFT_IDS.middle,
      name: "中班",
      shortName: "中",
      color: ACCENT_COLORS.cyan,
      startTime: "16:00",
      endTime: "00:00",
      crossesMidnight: false,
      isRest: false,
      defaultHours: hours.middle ?? 8,
      countsAsWork: true,
      legacyType: "middle",
    },
    {
      id: SHIFT_IDS.late,
      name: "晚班",
      shortName: "晚",
      color: ACCENT_COLORS.purple,
      startTime: "00:00",
      endTime: "08:00",
      crossesMidnight: false,
      isRest: false,
      defaultHours: hours.late ?? 8,
      countsAsWork: true,
      legacyType: "late",
    },
    {
      id: SHIFT_IDS.rest,
      name: "休息",
      shortName: "休",
      color: ACCENT_COLORS.gray,
      startTime: "",
      endTime: "",
      crossesMidnight: false,
      isRest: true,
      defaultHours: 0,
      countsAsWork: false,
      legacyType: "rest",
    },
    {
      id: SHIFT_IDS.leave,
      name: "请假",
      shortName: "假",
      color: ACCENT_COLORS.pink,
      startTime: "",
      endTime: "",
      crossesMidnight: false,
      isRest: true,
      defaultHours: 0,
      countsAsWork: false,
      legacyType: "leave",
    },
    {
      id: SHIFT_IDS.custom,
      name: "其他",
      shortName: "工",
      color: ACCENT_COLORS.green,
      startTime: "",
      endTime: "",
      crossesMidnight: false,
      isRest: false,
      defaultHours: 0,
      countsAsWork: true,
      legacyType: "custom",
    },
    {
      id: SHIFT_IDS.duty,
      name: "责班",
      shortName: "责",
      color: ACCENT_COLORS.purple,
      startTime: "08:00",
      endTime: "16:00",
      crossesMidnight: false,
      isRest: false,
      defaultHours: 8,
      countsAsWork: true,
    },
    {
      id: SHIFT_IDS.clinic,
      name: "门诊",
      shortName: "诊",
      color: ACCENT_COLORS.green,
      startTime: "08:00",
      endTime: "16:00",
      crossesMidnight: false,
      isRest: false,
      defaultHours: 8,
      countsAsWork: true,
    },
  ];
}

function baseShifts(hours: Partial<Record<string, number>> = {}) {
  const initialOrder: string[] = [
    SHIFT_IDS.day,
    SHIFT_IDS.night,
    SHIFT_IDS.rest,
    SHIFT_IDS.leave,
    SHIFT_IDS.morning,
    SHIFT_IDS.middle,
    SHIFT_IDS.late,
  ];
  const byId = new Map(shiftCatalog(hours).map((shift) => [shift.id, shift]));
  return initialOrder.flatMap((id) => (byId.get(id) ? [byId.get(id)!] : []));
}

export function builtInTemplates(): CycleTemplate[] {
  const { day, night, morning, middle, late, rest } = SHIFT_IDS;
  return [
    {
      id: "tpl-four-two",
      name: "4白2休 · 4夜2休",
      caption: "白白白白休休 · 夜夜夜夜休休",
      shiftIds: [
        day,
        day,
        day,
        day,
        rest,
        rest,
        night,
        night,
        night,
        night,
        rest,
        rest,
      ],
      category: "manufacturing",
      builtIn: true,
    },
    {
      id: "tpl-two-rest-two",
      name: "2白2休 · 2夜2休",
      caption: "白白休休 · 夜夜休休",
      shiftIds: [day, day, rest, rest, night, night, rest, rest],
      category: "manufacturing",
      builtIn: true,
    },
    {
      id: "tpl-one-one-two",
      name: "1白1夜 · 休2天",
      caption: "白夜休休",
      shiftIds: [day, night, rest, rest],
      category: "manufacturing",
      builtIn: true,
    },
    {
      id: "tpl-two-two-two",
      name: "2白2夜 · 休2天",
      caption: "白白夜夜休休",
      shiftIds: [day, day, night, night, rest, rest],
      category: "manufacturing",
      builtIn: true,
    },
    {
      id: "tpl-work-two-rest-two",
      name: "做二休二",
      caption: "白白休休",
      shiftIds: [day, day, rest, rest],
      category: "manufacturing",
      builtIn: true,
    },
    {
      id: "tpl-three-four",
      name: "3上4休 / 4上3休",
      caption: "白白白休休休休 · 白白白白休休休",
      shiftIds: [
        day,
        day,
        day,
        rest,
        rest,
        rest,
        rest,
        day,
        day,
        day,
        day,
        rest,
        rest,
        rest,
      ],
      category: "manufacturing",
      builtIn: true,
    },
    {
      id: "tpl-three-shift",
      name: "早 → 中 → 夜 → 休",
      caption: "早中晚休",
      shiftIds: [morning, middle, late, rest],
      category: "threeShift",
      builtIn: true,
    },
    {
      id: "tpl-double-three",
      name: "夜夜 → 中中 → 早早 → 休休",
      caption: "晚晚中中早早休休",
      shiftIds: [late, late, middle, middle, morning, morning, rest, rest],
      category: "threeShift",
      builtIn: true,
    },
    {
      id: "tpl-four-team-three-shift",
      name: "四班三倒 · 8小时",
      caption: "早早中中晚晚休休",
      shiftIds: [morning, morning, middle, middle, late, late, rest, rest],
      category: "threeShift",
      builtIn: true,
    },
  ];
}

export function createDefaultData(): AppData {
  const shifts = baseShifts();
  const shiftIds = new Set(shifts.map((shift) => shift.id));
  return {
    dataVersion: DATA_VERSION,
    careerPreset: "manufacturing",
    shifts,
    tags: [],
    cycleTemplates: builtInTemplates().filter(
      (template) =>
        [
          "tpl-four-two",
          "tpl-two-rest-two",
          "tpl-one-one-two",
          "tpl-three-shift",
        ].includes(template.id) &&
        template.shiftIds.every((id) => shiftIds.has(id)),
    ),
    activeCycle: null,
    display: {
      showShift: true,
      showTags: true,
      showShiftTime: false,
      showHours: false,
      showHolidays: true,
    },
    work: {
      trackHours: true,
      trackOvertime: true,
      system: "comprehensive",
      period: "month",
      annualStartMonth: 1,
      dailyStandard: 8,
      weeklyStandard: 40,
      standardDailyEnabled: true,
      standardWeeklyEnabled: true,
      customRule: "manual",
      customThreshold: 0,
      compensation: "hours",
    },
    targets: {},
    records: [],
  };
}

export function makeId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

export function calculateShiftDuration(
  startTime: string,
  endTime: string,
  crossesMidnight: boolean,
) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite))
    return 0;
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (crossesMidnight || end <= start) end += 24 * 60;
  return Math.max(0, (end - start) / 60);
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter(
    (item) => item.id && !seen.has(item.id) && seen.add(item.id),
  );
}

function normalizeShift(raw: unknown): Shift | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.name !== "string") return null;
  return {
    id: item.id,
    name: item.name.trim() || "未命名班次",
    shortName:
      typeof item.shortName === "string" && item.shortName.trim()
        ? item.shortName.trim().slice(0, 4)
        : item.name.slice(0, 2),
    color:
      item.id === "shift-rest"
        ? ACCENT_COLORS.gray
        : typeof item.color === "string"
        ? normalizeThemeColor(item.color)
        : SHIFT_COLORS[0],
    startTime: typeof item.startTime === "string" ? item.startTime : "",
    endTime: typeof item.endTime === "string" ? item.endTime : "",
    crossesMidnight: Boolean(item.crossesMidnight),
    isRest: Boolean(item.isRest),
    defaultHours: numberValue(item.defaultHours, 0),
    countsAsWork: item.countsAsWork !== false && !item.isRest,
    note: typeof item.note === "string" ? item.note : undefined,
    legacyType:
      typeof item.legacyType === "string" ? item.legacyType : undefined,
  };
}

function normalizeRecord(
  raw: unknown,
  validShiftIds: Set<string>,
  validTagIds: Set<string>,
): DayRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const legacyShift =
    typeof item.shift === "string" ? LEGACY_SHIFT_MAP[item.shift] : "";
  const shiftId = typeof item.shiftId === "string" ? item.shiftId : legacyShift;
  if (typeof item.date !== "string" || !validShiftIds.has(shiftId)) return null;
  return {
    date: item.date,
    shiftId,
    hours: numberValue(item.hours, 0),
    tagIds: Array.isArray(item.tagIds)
      ? item.tagIds.filter(
          (id): id is string => typeof id === "string" && validTagIds.has(id),
        )
      : [],
    completed: Boolean(item.completed),
    planned: item.planned !== false,
    note: typeof item.note === "string" ? item.note : undefined,
    manualOvertime: numberValue(item.manualOvertime, 0),
    source:
      item.source === "cycle" ||
      item.source === "manual" ||
      item.source === "legacy"
        ? item.source
        : "legacy",
    cycleId: typeof item.cycleId === "string" ? item.cycleId : undefined,
  };
}

export function normalizeAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") return createDefaultData();
  const item = raw as Record<string, unknown>;
  if (item.dataVersion !== DATA_VERSION || !Array.isArray(item.shifts))
    return migrateLegacyData(item.settings, item.records);
  const fallback = createDefaultData();
  const shifts = uniqueById(
    item.shifts
      .map(normalizeShift)
      .filter((shift): shift is Shift => Boolean(shift)),
  );
  const safeShifts = shifts.length ? shifts : fallback.shifts;
  const tags = uniqueById(
    (Array.isArray(item.tags) ? item.tags : []).flatMap((rawTag): DutyTag[] => {
      if (!rawTag || typeof rawTag !== "object") return [];
      const tag = rawTag as Record<string, unknown>;
      if (typeof tag.id !== "string" || typeof tag.name !== "string") return [];
      return [
        {
          id: tag.id,
          name: tag.name.trim() || "未命名标签",
          shortName:
            typeof tag.shortName === "string"
              ? tag.shortName.trim().slice(0, 6)
              : tag.name.slice(0, 3),
          color:
            typeof tag.color === "string"
              ? normalizeThemeColor(tag.color)
              : TAG_COLORS[0],
        },
      ];
    }),
  );
  const shiftIds = new Set(safeShifts.map((shift) => shift.id));
  const tagIds = new Set(tags.map((tag) => tag.id));
  const rawWork =
    item.work && typeof item.work === "object"
      ? (item.work as Record<string, unknown>)
      : {};
  const rawDisplay =
    item.display && typeof item.display === "object"
      ? (item.display as Record<string, unknown>)
      : {};
  const templates = uniqueById(
    (Array.isArray(item.cycleTemplates)
      ? item.cycleTemplates
      : builtInTemplates()
    ).flatMap((rawTemplate): CycleTemplate[] => {
      if (!rawTemplate || typeof rawTemplate !== "object") return [];
      const template = rawTemplate as Record<string, unknown>;
      const ids = Array.isArray(template.shiftIds)
        ? template.shiftIds.filter(
            (id): id is string => typeof id === "string" && shiftIds.has(id),
          )
        : [];
      if (
        typeof template.id !== "string" ||
        typeof template.name !== "string" ||
        !ids.length
      )
        return [];
      const category =
        template.category === "threeShift" ||
        template.category === "medical" ||
        template.category === "custom"
          ? template.category
          : "manufacturing";
      return [
        {
          id: template.id,
          name: template.name,
          caption: typeof template.caption === "string" ? template.caption : "",
          shiftIds: ids,
          category,
          builtIn: Boolean(template.builtIn),
        },
      ];
    }),
  );
  const activeRaw =
    item.activeCycle && typeof item.activeCycle === "object"
      ? (item.activeCycle as Record<string, unknown>)
      : null;
  const activeIds =
    activeRaw && Array.isArray(activeRaw.shiftIds)
      ? activeRaw.shiftIds.filter(
          (id): id is string => typeof id === "string" && shiftIds.has(id),
        )
      : [];
  const activeCycle =
    activeRaw && activeIds.length && typeof activeRaw.startDate === "string"
      ? {
          id: typeof activeRaw.id === "string" ? activeRaw.id : makeId("cycle"),
          name:
            typeof activeRaw.name === "string" ? activeRaw.name : "我的循环",
          startDate: activeRaw.startDate,
          shiftIds: activeIds,
        }
      : null;
  const rawTargets =
    item.targets && typeof item.targets === "object"
      ? (item.targets as Record<string, unknown>)
      : {};
  const targets = Object.fromEntries(
    Object.entries(rawTargets).flatMap(([key, value]) =>
      Number.isFinite(Number(value)) && Number(value) >= 0
        ? [[key, Number(value)]]
        : [],
    ),
  );
  const normalizedSystem: WorkSystem =
    rawWork.system === "standard" ||
    rawWork.system === "irregular" ||
    rawWork.system === "custom" ||
    rawWork.system === "manual"
      ? rawWork.system
      : "comprehensive";
  return {
    dataVersion: DATA_VERSION,
    careerPreset:
      item.careerPreset === "medical" ||
      item.careerPreset === "transport" ||
      item.careerPreset === "safety" ||
      item.careerPreset === "service" ||
      item.careerPreset === "custom"
        ? item.careerPreset
        : "manufacturing",
    shifts: safeShifts,
    tags,
    cycleTemplates: templates.length
      ? templates
      : builtInTemplates().filter((template) =>
          template.shiftIds.every((id) => shiftIds.has(id)),
        ),
    activeCycle,
    display: {
      showShift: rawDisplay.showShift !== false,
      showTags: rawDisplay.showTags !== false,
      showShiftTime: rawDisplay.showShiftTime === true,
      showHours: rawDisplay.showHours === true,
      showHolidays: rawDisplay.showHolidays !== false,
    },
    work: {
      trackHours: rawWork.trackHours !== false,
      trackOvertime: rawWork.trackHours !== false,
      system: normalizedSystem,
      period:
        normalizedSystem === "comprehensive"
          ? "month"
          : rawWork.period === "week" ||
              rawWork.period === "month" ||
              rawWork.period === "quarter" ||
              rawWork.period === "halfYear" ||
              rawWork.period === "custom"
            ? rawWork.period
            : "year",
      annualStartMonth:
        Number.isInteger(Number(rawWork.annualStartMonth)) &&
        Number(rawWork.annualStartMonth) >= 1 &&
        Number(rawWork.annualStartMonth) <= 12
          ? Number(rawWork.annualStartMonth)
          : 1,
      dailyStandard: numberValue(rawWork.dailyStandard, 8),
      weeklyStandard: numberValue(rawWork.weeklyStandard, 40),
      standardDailyEnabled: rawWork.standardDailyEnabled !== false,
      standardWeeklyEnabled: rawWork.standardWeeklyEnabled !== false,
      customRule:
        rawWork.customRule === "daily" ||
        rawWork.customRule === "weekly" ||
        rawWork.customRule === "monthly" ||
        rawWork.customRule === "period"
          ? rawWork.customRule
          : "manual",
      customThreshold: numberValue(rawWork.customThreshold, 0),
      compensation:
        rawWork.compensation === "salary" ||
        rawWork.compensation === "timeOff" ||
        rawWork.compensation === "fixed" ||
        rawWork.compensation === "custom" ||
        rawWork.compensation === "none"
          ? rawWork.compensation
          : "hours",
    },
    targets,
    records: (Array.isArray(item.records) ? item.records : [])
      .map((record) => normalizeRecord(record, shiftIds, tagIds))
      .filter((record): record is DayRecord => Boolean(record))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function migrateLegacyData(
  settingsRaw: unknown,
  recordsRaw: unknown,
): AppData {
  const settings =
    settingsRaw && typeof settingsRaw === "object"
      ? (settingsRaw as Record<string, unknown>)
      : {};
  const rawCycle = Array.isArray(settings.cycle)
    ? settings.cycle.filter(
        (value): value is string =>
          typeof value === "string" && Boolean(LEGACY_SHIFT_MAP[value]),
      )
    : [];
  const shifts = shiftCatalog({
    day: numberValue(settings.dayHours, 12),
    night: numberValue(settings.nightHours, 12),
    morning: numberValue(settings.morningHours, 8),
    middle: numberValue(settings.middleHours, 8),
    late: numberValue(settings.lateHours, 8),
  });
  const validShiftIds = new Set(shifts.map((shift) => shift.id));
  const rawTargets =
    settings.targets && typeof settings.targets === "object"
      ? (settings.targets as Record<string, unknown>)
      : {};
  const data = createDefaultData();
  data.shifts = shifts;
  data.work.dailyStandard = numberValue(settings.dailyStandard, 8);
  data.targets = Object.fromEntries(
    Object.entries(rawTargets).flatMap(([key, value]) =>
      Number.isFinite(Number(value)) && Number(value) >= 0
        ? [[key, Number(value)]]
        : [],
    ),
  );
  data.activeCycle =
    rawCycle.length &&
    typeof settings.cycleStart === "string" &&
    settings.cycleStart
      ? {
          id: "cycle-migrated",
          name: "原有循环",
          startDate: settings.cycleStart,
          shiftIds: rawCycle.map((shift) => LEGACY_SHIFT_MAP[shift]),
        }
      : null;
  data.records = (Array.isArray(recordsRaw) ? recordsRaw : [])
    .map((record) => normalizeRecord(record, validShiftIds, new Set()))
    .filter((record): record is DayRecord => Boolean(record));
  return data;
}

export function applyCareerPreset(
  data: AppData,
  preset: CareerPreset,
): AppData {
  const catalog = shiftCatalog();
  const recommendedIds: Record<CareerPreset, string[]> = {
    manufacturing: [SHIFT_IDS.day, SHIFT_IDS.night, SHIFT_IDS.rest],
    medical: [
      SHIFT_IDS.day,
      SHIFT_IDS.morning,
      SHIFT_IDS.smallNight,
      SHIFT_IDS.bigNight,
      SHIFT_IDS.rest,
      SHIFT_IDS.standby,
      SHIFT_IDS.duty,
      SHIFT_IDS.clinic,
    ],
    transport: [
      SHIFT_IDS.morning,
      SHIFT_IDS.middle,
      SHIFT_IDS.late,
      SHIFT_IDS.night,
      SHIFT_IDS.rest,
    ],
    safety: [SHIFT_IDS.day, SHIFT_IDS.night, SHIFT_IDS.standby, SHIFT_IDS.rest],
    service: [
      SHIFT_IDS.morning,
      SHIFT_IDS.middle,
      SHIFT_IDS.late,
      SHIFT_IDS.rest,
    ],
    custom: [SHIFT_IDS.rest],
  };
  const additions = catalog.filter((shift) =>
    recommendedIds[preset].includes(shift.id),
  );
  const tags: DutyTag[] = [];
  if (preset === "medical") {
    additions.push(
      {
        id: SHIFT_IDS.smallNight,
        name: "小夜",
        shortName: "小夜",
        color: ACCENT_COLORS.blue,
        startTime: "16:00",
        endTime: "00:00",
        crossesMidnight: false,
        isRest: false,
        defaultHours: 8,
        countsAsWork: true,
      },
      {
        id: SHIFT_IDS.bigNight,
        name: "大夜",
        shortName: "大夜",
        color: ACCENT_COLORS.purple,
        startTime: "00:00",
        endTime: "08:00",
        crossesMidnight: false,
        isRest: false,
        defaultHours: 8,
        countsAsWork: true,
      },
      {
        id: SHIFT_IDS.standby,
        name: "备班",
        shortName: "备",
        color: ACCENT_COLORS.green,
        startTime: "",
        endTime: "",
        crossesMidnight: false,
        isRest: false,
        defaultHours: 0,
        countsAsWork: false,
      },
    );
    ["责班", "主班", "门诊", "ICU"].forEach((name, index) =>
      tags.push({
        id: `tag-medical-${index}`,
        name,
        shortName: name,
        color: TAG_COLORS[index % TAG_COLORS.length],
      }),
    );
  }
  if (preset === "safety")
    additions.push({
      id: SHIFT_IDS.standby,
      name: "备班",
      shortName: "备",
      color: ACCENT_COLORS.green,
      startTime: "",
      endTime: "",
      crossesMidnight: false,
      isRest: false,
      defaultHours: 0,
      countsAsWork: false,
    });
  if (preset === "manufacturing")
    ["带班", "机台", "培训"].forEach((name, index) =>
      tags.push({
        id: `tag-manufacturing-${index}`,
        name,
        shortName: name,
        color: TAG_COLORS[index % TAG_COLORS.length],
      }),
    );
  if (preset === "transport")
    ["值乘", "调度", "站务"].forEach((name, index) =>
      tags.push({
        id: `tag-transport-${index}`,
        name,
        shortName: name,
        color: TAG_COLORS[index % TAG_COLORS.length],
      }),
    );
  if (preset === "safety")
    ["值守", "巡检", "备勤"].forEach((name, index) =>
      tags.push({
        id: `tag-safety-${index}`,
        name,
        shortName: name,
        color: TAG_COLORS[index % TAG_COLORS.length],
      }),
    );
  if (preset === "service")
    ["前台", "夜审", "领班"].forEach((name, index) =>
      tags.push({
        id: `tag-service-${index}`,
        name,
        shortName: name,
        color: TAG_COLORS[index % TAG_COLORS.length],
      }),
    );
  const shifts = uniqueById([...data.shifts, ...additions]);
  const usedTagIds = new Set(data.records.flatMap((record) => record.tagIds));
  const presetTagPattern =
    /^tag-(medical|manufacturing|transport|safety|service)-/;
  const retainedTags = data.tags.filter(
    (tag) =>
      !presetTagPattern.test(tag.id) ||
      tag.id.startsWith(`tag-${preset}-`) ||
      usedTagIds.has(tag.id),
  );
  const nextTags = uniqueById([...retainedTags, ...tags]);
  const templates = [...data.cycleTemplates];
  const availableShiftIds = new Set(shifts.map((shift) => shift.id));
  const recommendedCategories =
    preset === "transport" || preset === "service"
      ? new Set(["threeShift"])
      : preset === "manufacturing" || preset === "safety"
        ? new Set(["manufacturing"])
        : new Set<string>();
  builtInTemplates()
    .filter(
      (template) =>
        recommendedCategories.has(template.category) &&
        template.shiftIds.every((id) => availableShiftIds.has(id)),
    )
    .forEach((template) => {
      if (!templates.some((item) => item.id === template.id))
        templates.push(template);
    });
  if (
    preset === "medical" &&
    !templates.some((template) => template.id === "tpl-medical-start")
  ) {
    templates.push({
      id: "tpl-medical-start",
      name: "白白 · 小夜 · 大夜 · 休休",
      caption: "医疗起始模板，可自由修改",
      shiftIds: [
        SHIFT_IDS.day,
        SHIFT_IDS.day,
        SHIFT_IDS.smallNight,
        SHIFT_IDS.bigNight,
        SHIFT_IDS.rest,
        SHIFT_IDS.rest,
      ],
      category: "medical",
      builtIn: true,
    });
  }
  return {
    ...data,
    careerPreset: preset,
    shifts,
    tags: nextTags,
    cycleTemplates: templates,
  };
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayDifference(a: string, b: string) {
  const aa = parseDateKey(a);
  const bb = parseDateKey(b);
  return Math.round(
    (new Date(aa.getFullYear(), aa.getMonth(), aa.getDate()).getTime() -
      new Date(bb.getFullYear(), bb.getMonth(), bb.getDate()).getTime()) /
      86400000,
  );
}

export function generateCycleRecords(
  activeCycle: ActiveCycle,
  shifts: Shift[],
  startDate: string,
  endDate: string,
): DayRecord[] {
  const shiftMap = new Map(shifts.map((shift) => [shift.id, shift]));
  const start = parseDateKey(
    startDate < activeCycle.startDate ? activeCycle.startDate : startDate,
  );
  const end = parseDateKey(endDate);
  const generated: DayRecord[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const date = formatDateKey(cursor);
    const index =
      ((dayDifference(date, activeCycle.startDate) %
        activeCycle.shiftIds.length) +
        activeCycle.shiftIds.length) %
      activeCycle.shiftIds.length;
    const shiftId = activeCycle.shiftIds[index];
    const shift = shiftMap.get(shiftId);
    if (!shift) continue;
    generated.push({
      date,
      shiftId,
      hours: shift.defaultHours,
      tagIds: [],
      completed: false,
      planned: true,
      source: "cycle",
      cycleId: activeCycle.id,
    });
  }
  return generated;
}

export function materializeCycleYear(data: AppData, year: number): AppData {
  if (
    !data.activeCycle ||
    Number(data.activeCycle.startDate.slice(0, 4)) > year
  )
    return data;
  const start =
    `${year}-01-01` < data.activeCycle.startDate
      ? data.activeCycle.startDate
      : `${year}-01-01`;
  const generated = generateCycleRecords(
    data.activeCycle,
    data.shifts,
    start,
    `${year}-12-31`,
  );
  const existing = new Map(data.records.map((record) => [record.date, record]));
  generated.forEach((record) => {
    const current = existing.get(record.date);
    if (!current || current.source === "cycle")
      existing.set(
        record.date,
        current?.source === "cycle" && current.cycleId === data.activeCycle?.id
          ? current
          : record,
      );
  });
  return {
    ...data,
    records: [...existing.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}

export function replaceCycleFromDate(
  data: AppData,
  activeCycle: ActiveCycle,
  throughYear: number,
): AppData {
  const kept = data.records.filter(
    (record) => record.date < activeCycle.startDate,
  );
  const generated = generateCycleRecords(
    activeCycle,
    data.shifts,
    activeCycle.startDate,
    `${throughYear}-12-31`,
  );
  return {
    ...data,
    activeCycle,
    records: [...kept, ...generated].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}

export function recordsInRange(
  records: DayRecord[],
  startDate: string,
  endDate: string,
) {
  return records.filter(
    (record) => record.date >= startDate && record.date <= endDate,
  );
}

export function completedRecord(record: DayRecord, today: string) {
  return record.planned && record.hours > 0 && record.date <= today;
}

function startOfWeek(date: string) {
  const value = parseDateKey(date);
  const day = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - day);
  return formatDateKey(value);
}

export function calculateOvertime(
  records: DayRecord[],
  settings: WorkSettings,
  standardTarget: number,
) {
  if (!settings.trackHours || !settings.trackOvertime) return 0;
  const total = records.reduce(
    (sum, record) => sum + Math.max(0, record.hours),
    0,
  );
  if (settings.system === "comprehensive")
    return Math.max(0, total - standardTarget);
  if (
    settings.system === "manual" ||
    settings.system === "irregular" ||
    (settings.system === "custom" && settings.customRule === "manual")
  )
    return records.reduce(
      (sum, record) => sum + Math.max(0, record.manualOvertime ?? 0),
      0,
    );
  if (settings.system === "custom") {
    if (settings.customRule === "daily")
      return records.reduce(
        (sum, record) =>
          sum + Math.max(0, record.hours - settings.customThreshold),
        0,
      );
    if (settings.customRule === "weekly") {
      const weeks = new Map<string, number>();
      records.forEach((record) =>
        weeks.set(
          startOfWeek(record.date),
          (weeks.get(startOfWeek(record.date)) ?? 0) + record.hours,
        ),
      );
      return [...weeks.values()].reduce(
        (sum, hours) => sum + Math.max(0, hours - settings.customThreshold),
        0,
      );
    }
    return Math.max(0, total - settings.customThreshold);
  }
  const daily = settings.standardDailyEnabled
    ? records.reduce(
        (sum, record) =>
          sum + Math.max(0, record.hours - settings.dailyStandard),
        0,
      )
    : 0;
  let weekly = 0;
  if (settings.standardWeeklyEnabled) {
    const weeks = new Map<string, number>();
    records.forEach((record) =>
      weeks.set(
        startOfWeek(record.date),
        (weeks.get(startOfWeek(record.date)) ?? 0) + record.hours,
      ),
    );
    weekly = [...weeks.values()].reduce(
      (sum, hours) => sum + Math.max(0, hours - settings.weeklyStandard),
      0,
    );
  }
  return Math.max(daily, weekly);
}

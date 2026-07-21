"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Solar } from "lunar-typescript";

type View = "home" | "calendar" | "stats" | "settings";
type ShiftType = "day" | "night" | "morning" | "middle" | "late" | "rest" | "leave" | "custom";
type ShiftSystem = "two" | "three";
type WorkMode = "comprehensive" | "monthly";

type DayRecord = {
  date: string;
  shift: ShiftType;
  hours: number;
  completed: boolean;
  planned: boolean;
  isHoliday?: boolean;
  note?: string;
};

type Settings = {
  workMode: WorkMode;
  baseSalary: number;
  dailyStandard: number;
  weekdayMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  holidaySeparate: boolean;
  shiftSystem: ShiftSystem;
  dayHours: number;
  nightHours: number;
  morningHours: number;
  middleHours: number;
  lateHours: number;
  cycleStart: string;
  cycle: ShiftType[];
  targets: Record<string, number>;
};

type EditableSettingKey = "baseSalary" | "weekdayMultiplier" | "weekendMultiplier" | "holidayMultiplier" | "dayHours" | "nightHours" | "morningHours" | "middleHours" | "lateHours" | "dailyStandard";
type NumberEditorConfig = {
  key: EditableSettingKey | string;
  target?: boolean;
  title: string;
  unit: string;
  value: number;
  min: number;
  step: number;
};

const TARGETS_2026: Record<string, number> = {
  "2026-01": 168,
  "2026-02": 128,
  "2026-03": 176,
  "2026-04": 168,
  "2026-05": 152,
  "2026-06": 168,
  "2026-07": 184,
  "2026-08": 168,
  "2026-09": 176,
  "2026-10": 144,
  "2026-11": 168,
  "2026-12": 184,
};

const DEFAULT_CYCLE: ShiftType[] = [
  "day", "day", "day", "day",
  "rest", "rest",
  "night", "night", "night", "night",
  "rest", "rest",
];
const LEGACY_DEFAULT_CYCLE: ShiftType[] = ["day", "day", "day", "day", "day", "rest", "rest"];
const CYCLE_TEMPLATES: { id: string; name: string; caption: string; cycle: ShiftType[] }[] = [
  { id: "four-two", name: "四白两休 · 四夜两休", caption: "12 天 · 上四休二", cycle: DEFAULT_CYCLE },
  { id: "one-one-two", name: "一白一夜 · 休两天", caption: "4 天 · 快速轮换", cycle: ["day", "night", "rest", "rest"] },
  { id: "two-two", name: "两白两休 · 两夜两休", caption: "8 天 · 两天一换", cycle: ["day", "day", "rest", "rest", "night", "night", "rest", "rest"] },
  { id: "four-three", name: "四班三倒 · 8 小时", caption: "8 天 · 早早中中晚晚休休", cycle: ["morning", "morning", "middle", "middle", "late", "late", "rest", "rest"] },
];

const DEFAULT_SETTINGS: Settings = {
  workMode: "comprehensive",
  baseSalary: 0,
  dailyStandard: 8,
  weekdayMultiplier: 1.5,
  weekendMultiplier: 1,
  holidayMultiplier: 3,
  holidaySeparate: false,
  shiftSystem: "two",
  dayHours: 8,
  nightHours: 8,
  morningHours: 8,
  middleHours: 8,
  lateHours: 8,
  cycleStart: "2026-01-01",
  cycle: DEFAULT_CYCLE,
  targets: TARGETS_2026,
};

const SHIFT_META: Record<ShiftType, { label: string; short: string; className: string }> = {
  day: { label: "白班", short: "白", className: "shift-day" },
  night: { label: "夜班", short: "夜", className: "shift-night" },
  morning: { label: "早班", short: "早", className: "shift-morning" },
  middle: { label: "中班", short: "中", className: "shift-middle" },
  late: { label: "晚班", short: "晚", className: "shift-late" },
  rest: { label: "休息", short: "休", className: "shift-rest" },
  leave: { label: "请假", short: "假", className: "shift-leave" },
  custom: { label: "其他", short: "工", className: "shift-custom" },
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_LABELS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const STORAGE_RECORDS = "shift-ledger-records-v1";
const STORAGE_SETTINGS = "shift-ledger-settings-v1";
const STORAGE_PRIVACY = "shift-ledger-money-visible-v1";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayDiff(a: Date, b: Date) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((aa - bb) / 86400000);
}

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function compactHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function privateMoney(value: number, visible: boolean) {
  return visible ? `¥${money(value)}` : "¥••••••";
}

function getShiftHours(settings: Settings, shift: ShiftType) {
  if (shift === "day") return settings.dayHours;
  if (shift === "night") return settings.nightHours;
  if (shift === "morning") return settings.morningHours;
  if (shift === "middle") return settings.middleHours;
  if (shift === "late") return settings.lateHours;
  return 0;
}

function getEditorShifts(settings: Settings): ShiftType[] {
  return settings.shiftSystem === "three"
    ? ["morning", "middle", "late", "rest", "leave", "custom"]
    : ["day", "night", "rest", "leave", "custom"];
}

function statutoryHolidayName(key: string) {
  const date = parseDate(key);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 1 && day === 1) return "元旦";
  if (month === 5 && (day === 1 || day === 2)) return "劳动节";
  if (month === 10 && day >= 1 && day <= 3) return "国庆节";
  // 中秋与国庆法定日重合时，按既有的人社部门口径把第 13 个三倍日顺延到 10 月 4 日。
  if (month === 10 && day === 4) {
    const hasOverlappingMidAutumn = [1, 2, 3].some((nationalDay) => {
      const nationalLunar = Solar.fromYmd(date.getFullYear(), 10, nationalDay).getLunar();
      return nationalLunar.getMonth() === 8 && nationalLunar.getDay() === 15;
    });
    if (hasOverlappingMidAutumn) return "中秋节补假";
  }

  const lunar = Solar.fromYmd(date.getFullYear(), month, day).getLunar();
  const lunarMonth = lunar.getMonth();
  const lunarDay = lunar.getDay();
  if (lunarMonth === 1 && lunarDay >= 1 && lunarDay <= 3) return "春节";
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const nextLunar = Solar.fromYmd(next.getFullYear(), next.getMonth() + 1, next.getDate()).getLunar();
  if (nextLunar.getMonth() === 1 && nextLunar.getDay() === 1) return "除夕";
  if (lunar.getJieQi() === "清明") return "清明节";
  if (lunarMonth === 5 && lunarDay === 5) return "端午节";
  if (lunarMonth === 8 && lunarDay === 15) return "中秋节";
  return "";
}

function isStatutoryHoliday(key: string) {
  return Boolean(statutoryHolidayName(key));
}

function statutoryHolidayShortName(name: string) {
  const labels: Record<string, string> = {
    元旦: "元旦",
    劳动节: "劳动",
    国庆节: "国庆",
    中秋节补假: "中秋补",
    春节: "春节",
    除夕: "除夕",
    清明节: "清明",
    端午节: "端午",
    中秋节: "中秋",
  };
  return labels[name] ?? name;
}

function countOvertimeDays(records: DayRecord[], target: number, projected: boolean) {
  const included = records
    .filter((item) => item.hours > 0 && (projected ? item.planned : isAutomaticallyCompleted(item)))
    .sort((a, b) => a.date.localeCompare(b.date));
  let cumulative = 0;
  let days = 0;
  for (const item of included) {
    if (cumulative >= target) days += 1;
    cumulative += item.hours;
  }
  return days;
}

function inclusiveDateRange(first: string, second: string) {
  const start = parseDate(first < second ? first : second);
  const end = parseDate(first < second ? second : first);
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function normalizeSettings(value?: Partial<Settings>): Settings {
  const isLegacy = Boolean(value && !Array.isArray(value.cycle));
  let cycle = Array.isArray(value?.cycle) && value.cycle.length
    ? value.cycle.filter((item): item is ShiftType => ["day", "night", "morning", "middle", "late", "rest"].includes(item))
    : DEFAULT_SETTINGS.cycle;
  if (cycle.length === LEGACY_DEFAULT_CYCLE.length && cycle.every((item, index) => item === LEGACY_DEFAULT_CYCLE[index])) {
    cycle = DEFAULT_CYCLE;
  }
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    weekendMultiplier: isLegacy ? 1 : (value?.weekendMultiplier ?? 1),
    cycle: cycle.length ? cycle : DEFAULT_SETTINGS.cycle,
    targets: { ...TARGETS_2026, ...(value?.targets ?? {}) },
  };
}

function createYearSchedule(settings: Settings, year: number, existing: DayRecord[] = []) {
  const byDate = new Map(existing.map((item) => [item.date, item]));
  const start = parseDate(settings.cycleStart);
  const now = new Date();
  const next: DayRecord[] = [];
  const cursor = new Date(year, 0, 1);

  while (cursor.getFullYear() === year) {
    const key = dateKey(cursor);
    const old = byDate.get(key);
    if (old) {
      next.push(old);
    } else {
      const cycle = settings.cycle.length ? settings.cycle : DEFAULT_SETTINGS.cycle;
      const offset = ((dayDiff(cursor, start) % cycle.length) + cycle.length) % cycle.length;
      const shift = cycle[offset];
      const hours = getShiftHours(settings, shift);
      next.push({
        date: key,
        shift,
        hours,
        planned: true,
        completed: cursor <= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && hours > 0,
        isHoliday: isStatutoryHoliday(key),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return [...existing.filter((item) => parseDate(item.date).getFullYear() !== year), ...next].sort((a, b) => a.date.localeCompare(b.date));
}

function createScheduleFromDate(settings: Settings, year: number, effectiveDate: string, existing: DayRecord[]) {
  const start = parseDate(effectiveDate);
  if (start.getFullYear() !== year) return existing;
  const cycle = settings.cycle.length ? settings.cycle : DEFAULT_SETTINGS.cycle;
  const preserved = existing.filter((item) => parseDate(item.date).getFullYear() !== year || item.date < effectiveDate);
  const generated: DayRecord[] = [];
  const cursor = new Date(start);

  while (cursor.getFullYear() === year) {
    const offset = dayDiff(cursor, start) % cycle.length;
    const shift = cycle[offset];
    const key = dateKey(cursor);
    const hours = getShiftHours(settings, shift);
    generated.push({
      date: key,
      shift,
      hours,
      planned: true,
      completed: false,
      isHoliday: isStatutoryHoliday(key),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return [...preserved, ...generated].sort((a, b) => a.date.localeCompare(b.date));
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array(leading).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
}

function isWeekend(key: string) {
  const day = parseDate(key).getDay();
  return day === 0 || day === 6;
}

function isAutomaticallyCompleted(item: DayRecord) {
  return item.planned && item.hours > 0 && item.date <= dateKey(new Date());
}

function getPay(records: DayRecord[], settings: Settings, target: number, projected: boolean) {
  const included = records.filter((item) => item.hours > 0 && (projected ? item.planned : isAutomaticallyCompleted(item)));
  const totalHours = included.reduce((sum, item) => sum + item.hours, 0);
  const hourly = target > 0 ? settings.baseSalary / target : 0;
  let overtimeHours = 0;
  let overtimePay = 0;

  if (settings.workMode === "comprehensive") {
    const statutoryHours = included.filter((item) => isStatutoryHoliday(item.date)).reduce((sum, item) => sum + item.hours, 0);
    const manualHolidayHours = settings.holidaySeparate
      ? included.filter((item) => item.isHoliday && !isStatutoryHoliday(item.date)).reduce((sum, item) => sum + item.hours, 0)
      : 0;
    const holidayHours = statutoryHours + manualHolidayHours;
    const regularOvertime = Math.max(0, totalHours - holidayHours - target);
    overtimeHours = regularOvertime + holidayHours;
    overtimePay = regularOvertime * hourly * settings.weekdayMultiplier;
    overtimePay += statutoryHours * hourly * 3;
    overtimePay += manualHolidayHours * hourly * settings.holidayMultiplier;
  } else {
    for (const item of included) {
      if (isStatutoryHoliday(item.date)) {
        overtimeHours += item.hours;
        overtimePay += item.hours * hourly * 3;
      } else if (item.isHoliday) {
        overtimeHours += item.hours;
        overtimePay += item.hours * hourly * settings.holidayMultiplier;
      } else if (isWeekend(item.date)) {
        overtimeHours += item.hours;
        overtimePay += item.hours * hourly * settings.weekendMultiplier;
      } else {
        const dailyOvertime = Math.max(0, item.hours - settings.dailyStandard);
        overtimeHours += dailyOvertime;
        overtimePay += dailyOvertime * hourly * settings.weekdayMultiplier;
      }
    }
  }

  return {
    totalHours,
    hourly,
    overtimeHours,
    overtimePay,
    income: settings.baseSalary + overtimePay,
  };
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/></>,
    calendar: <><rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/></>,
    stats: <><path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.55v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3V9.55h.1A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.56 3.7l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1v-.1h4.05v.1A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.5c.2.38.57.76 1 .95.34.13.7.2 1.05.2h.1v4.05h-.1c-.35 0-.7.07-1.05.2-.43.2-.8.57-1 1.1Z"/></>,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 14v6h14v-6"/></>,
    download: <><path d="M12 4v12m0 0-5-5m5 5 5-5"/><path d="M5 20h14"/></>,
    flag: <><path d="M7 21V4"/><path d="M7 5h9.5l-1.8 3 1.8 3H7"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/></>,
    eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 6.2A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.2 2.9M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  };
  return <svg className="app-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<View>("home");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [moneyVisible, setMoneyVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedSettings = window.localStorage.getItem(STORAGE_SETTINGS);
      const parsedSettings = storedSettings ? JSON.parse(storedSettings) : null;
      const nextSettings = normalizeSettings(parsedSettings ?? undefined);
      const storedRecords = window.localStorage.getItem(STORAGE_RECORDS);
      const rawRecords: DayRecord[] = storedRecords ? JSON.parse(storedRecords) : createYearSchedule(nextSettings, today.getFullYear());
      const nextRecords = rawRecords.map((item) => ({ ...item, isHoliday: isStatutoryHoliday(item.date) || Boolean(item.isHoliday) }));
      setMoneyVisible(window.localStorage.getItem(STORAGE_PRIVACY) !== "hidden");
      setSettings(nextSettings);
      setRecords(nextRecords);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [today]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
  }, [settings, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
  }, [records, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_PRIVACY, moneyVisible ? "visible" : "hidden");
  }, [moneyVisible, ready]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthKey = `${year}-${pad(month + 1)}`;
  const target = settings.targets[monthKey] ?? 168;
  const monthRecords = useMemo(() => records.filter((item) => item.date.startsWith(monthKey)), [records, monthKey]);
  const actual = useMemo(() => getPay(monthRecords, settings, target, false), [monthRecords, settings, target]);
  const projected = useMemo(() => getPay(monthRecords, settings, target, true), [monthRecords, settings, target]);
  const completedDays = monthRecords.filter(isAutomaticallyCompleted).length;
  const plannedDays = monthRecords.filter((item) => item.planned && item.hours > 0).length;
  const progress = Math.min(100, target ? (actual.totalHours / target) * 100 : 0);
  const actualOvertimeDays = useMemo(() => countOvertimeDays(monthRecords, target, false), [monthRecords, target]);
  const projectedOvertimeDays = useMemo(() => countOvertimeDays(monthRecords, target, true), [monthRecords, target]);

  function changeMonth(delta: number) {
    setSelectedMonth((value) => new Date(value.getFullYear(), value.getMonth() + delta, 1));
  }

  function openDate(key: string) {
    setSelectedDate(key);
  }

  function updateRecord(updated: DayRecord) {
    const normalized = { ...updated, isHoliday: isStatutoryHoliday(updated.date) || Boolean(updated.isHoliday) };
    setRecords((items) => {
      const exists = items.some((item) => item.date === normalized.date);
      return exists ? items.map((item) => (item.date === normalized.date ? normalized : item)) : [...items, normalized].sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  function regenerateYear(cycle: ShiftType[], cycleStart: string) {
    const usesThreeShifts = cycle.some((shift) => shift === "morning" || shift === "middle" || shift === "late");
    const nextSettings = normalizeSettings({ ...settings, cycle, cycleStart, shiftSystem: usesThreeShifts ? "three" : "two" });
    setSettings(nextSettings);
    setRecords((items) => createScheduleFromDate(nextSettings, year, cycleStart, items));
    setShowGenerator(false);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2200);
  }

  function toggleBatchMode() {
    setBatchMode((active) => {
      if (active) setBatchDates([]);
      return !active;
    });
  }

  function toggleBatchDate(key: string) {
    if (!batchDates.length) {
      setBatchDates([key]);
      return;
    }
    const range = inclusiveDateRange(batchDates[0], key);
    setBatchDates(range);
    setShowBatchEditor(true);
  }

  function updateBatchRecords(change: { shift: ShiftType; hours: number; isHoliday: boolean }) {
    const selected = new Set(batchDates);
    const existing = new Map(records.map((item) => [item.date, item]));
    const updates = batchDates.map((date) => ({
      ...(existing.get(date) ?? { date, completed: false }),
      date,
      shift: change.shift,
      hours: change.hours,
      planned: change.shift !== "leave",
      completed: false,
      isHoliday: isStatutoryHoliday(date) || change.isHoliday,
    }));
    setRecords((items) => [...items.filter((item) => !selected.has(item.date)), ...updates].sort((a, b) => a.date.localeCompare(b.date)));
    setShowBatchEditor(false);
    setBatchMode(false);
    setBatchDates([]);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1800);
  }

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "home", label: "概览", icon: "home" },
    { id: "calendar", label: "日历", icon: "calendar" },
    { id: "stats", label: "统计", icon: "stats" },
    { id: "settings", label: "设置", icon: "settings" },
  ];

  if (!ready) return <main className="loading-screen">正在整理你的班次…</main>;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className="side-nav glass-panel">
        <div className="brand-mark"><Icon name="spark" /></div>
        <div className="brand-copy"><strong>工时簿</strong><span>我的综合工时</span></div>
        <nav>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} /></span>{item.label}
            </button>
          ))}
        </nav>
        <div className="privacy-note"><span>●</span> 数据仅保存在本机</div>
      </aside>

      <section className="content-wrap">
        <header className="topbar">
          <div>
            <p className="eyebrow">{settings.workMode === "comprehensive" ? "综合计算周期" : "普通月薪周期"}</p>
            <h1>{view === "home" ? "本月概览" : view === "calendar" ? "排班日历" : view === "stats" ? "年度统计" : "工资与规则"}</h1>
          </div>
          <div className="month-switch glass-control">
            <button onClick={() => changeMonth(-1)} aria-label="上个月">‹</button>
            <button className="current-month" onClick={() => setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>{year}年{month + 1}月</button>
            <button onClick={() => changeMonth(1)} aria-label="下个月">›</button>
          </div>
        </header>

        {view === "home" && (
          <HomeView
            actual={actual}
            projected={projected}
            target={target}
            progress={progress}
            completedDays={completedDays}
            plannedDays={plannedDays}
            monthRecords={monthRecords}
            settings={settings}
            moneyVisible={moneyVisible}
            actualOvertimeDays={actualOvertimeDays}
            projectedOvertimeDays={projectedOvertimeDays}
            onToggleMoney={() => setMoneyVisible((visible) => !visible)}
            onCalendar={() => setView("calendar")}
            onStats={() => setView("stats")}
            onOpenDate={openDate}
          />
        )}
        {view === "calendar" && (
          <CalendarView
            year={year}
            month={month}
            records={monthRecords}
            target={target}
            actual={actual}
            projected={projected}
            onOpenDate={openDate}
            onGenerate={() => setShowGenerator(true)}
            batchMode={batchMode}
            batchDates={batchDates}
            onToggleBatchMode={toggleBatchMode}
            onToggleBatchDate={toggleBatchDate}
            moneyVisible={moneyVisible}
          />
        )}
        {view === "stats" && <StatsView year={year} records={records} settings={settings} selectedMonth={month} moneyVisible={moneyVisible} onToggleMoney={() => setMoneyVisible((visible) => !visible)} />}
        {view === "settings" && <SettingsView settings={settings} setSettings={setSettings} records={records} setRecords={setRecords} year={year} monthKey={monthKey} moneyVisible={moneyVisible} onToggleMoney={() => setMoneyVisible((visible) => !visible)} />}
      </section>

      <nav className="bottom-nav glass-panel" aria-label="主导航">
        {navItems.map((item) => (
          <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
            <span><Icon name={item.icon} /></span>{item.label}
          </button>
        ))}
      </nav>

      {selectedDate && (
        <DayEditor
          date={selectedDate}
          record={records.find((item) => item.date === selectedDate)}
          settings={settings}
          onClose={() => setSelectedDate(null)}
          onSave={(record) => { updateRecord(record); setSelectedDate(null); setSavedToast(true); window.setTimeout(() => setSavedToast(false), 1800); }}
          onDelete={() => {
            updateRecord({ date: selectedDate, shift: "rest", hours: 0, planned: true, completed: false });
            setSelectedDate(null);
            setSavedToast(true);
            window.setTimeout(() => setSavedToast(false), 1800);
          }}
        />
      )}
      {showGenerator && <ScheduleGenerator settings={settings} year={year} onClose={() => setShowGenerator(false)} onGenerate={regenerateYear} />}
      {showBatchEditor && <BatchEditor dates={batchDates} settings={settings} onClose={() => { setShowBatchEditor(false); setBatchDates([]); }} onSave={updateBatchRecords} />}
      {savedToast && <div className="toast"><Icon name="check" /> 已保存</div>}
    </main>
  );
}

function HomeView({ actual, projected, target, progress, completedDays, plannedDays, monthRecords, settings, moneyVisible, actualOvertimeDays, projectedOvertimeDays, onToggleMoney, onCalendar, onStats, onOpenDate }: {
  actual: ReturnType<typeof getPay>;
  projected: ReturnType<typeof getPay>;
  target: number;
  progress: number;
  completedDays: number;
  plannedDays: number;
  monthRecords: DayRecord[];
  settings: Settings;
  moneyVisible: boolean;
  actualOvertimeDays: number;
  projectedOvertimeDays: number;
  onToggleMoney: () => void;
  onCalendar: () => void;
  onStats: () => void;
  onOpenDate: (key: string) => void;
}) {
  const upcoming = monthRecords.find((item) => item.date >= dateKey(new Date()) && item.hours > 0);
  return (
    <div className="page-grid home-grid">
      <section className="income-hero glass-panel">
        <div className="hero-topline"><span>预计本月收入</span><div className="hero-private-actions"><span className="soft-badge">含底薪</span><button className="privacy-toggle light" onClick={onToggleMoney} aria-label={moneyVisible ? "隐藏金额" : "显示金额"}><Icon name={moneyVisible ? "eye" : "eyeOff"} /></button></div></div>
        <div className="income-value"><small>¥</small>{moneyVisible ? money(projected.income) : "••••••"}</div>
        <div className="hero-delta">已确认 {privateMoney(actual.income, moneyVisible)} <span>·</span> 预测加班费 {privateMoney(projected.overtimePay, moneyVisible)}</div>
        <div className="hero-progress"><span style={{ width: `${Math.min(100, (actual.totalHours / Math.max(projected.totalHours, target)) * 100)}%` }} /><i style={{ left: `${Math.min(100, (target / Math.max(projected.totalHours, target)) * 100)}%` }} /></div>
        <div className="hero-foot"><span>已记 {compactHours(actual.totalHours)}h · 基本线 {target}h</span><span>预计 {compactHours(projected.totalHours)}h</span></div>
        <div className="workday-strip">
          <div><strong>{completedDays}</strong><span>已上班次</span></div>
          <i />
          <div><strong>{plannedDays}</strong><span>本月总班次</span></div>
          <i />
          <div><strong>{Math.max(0, plannedDays - completedDays)}</strong><span>剩余班次</span></div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard tone="blue" label="已确认工时" value={`${compactHours(actual.totalHours)}h`} detail={`距离基本工时 ${compactHours(Math.max(0, target - actual.totalHours))}h`} />
        <MetricCard tone="orange" label="实际加班" value={`${compactHours(actual.overtimeHours)}h`} detail={`约 ${actualOvertimeDays} 天 · 已产生 ${privateMoney(actual.overtimePay, moneyVisible)}`} />
        <MetricCard tone="violet" label="预测加班" value={`${compactHours(projected.overtimeHours)}h`} detail={`约 ${projectedOvertimeDays} 天 · 按完整排班`} />
        <MetricCard tone="green" label="小时工资" value={privateMoney(projected.hourly, moneyVisible)} detail={`底薪 ÷ ${target}h`} />
      </section>

      <section className="glass-panel progress-card">
        <div className="section-heading"><div><p className="eyebrow">分阶段进度</p><h2>基本工时 → 加班区间</h2></div><button className="text-button" onClick={onStats}>查看统计 <Icon name="chevron" /></button></div>
        <div className="radial-row">
          <div className="radial" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.round(progress)}%</strong><span>基本工时</span></div></div>
          <div className="progress-copy">
            <div><span className="dot blue" /><p>截至今天</p><strong>{compactHours(actual.totalHours)} 小时</strong></div>
            <div><span className="dot pale" /><p>基本工时线</p><strong>{target} 小时</strong></div>
            <div><span className="dot violet" /><p>预测加班段</p><strong>+{compactHours(projected.overtimeHours)} 小时</strong></div>
          </div>
        </div>
        <div className="phase-progress" style={{ "--base-width": `${(target / Math.max(projected.totalHours, target)) * 100}%`, "--actual-width": `${Math.min(100, (actual.totalHours / Math.max(projected.totalHours, target)) * 100)}%` } as React.CSSProperties}>
          <div className="phase-track"><span className="phase-base" /><span className="phase-overtime" /><span className="phase-marker" title={`当前已走到 ${compactHours(actual.totalHours)} 小时`}><Icon name="flag" /></span></div>
          <div className="phase-labels"><span>0h</span><strong>基本线 {target}h</strong><span>预计 {compactHours(projected.totalHours)}h</span></div>
        </div>
      </section>

      <section className="glass-panel next-card">
        <div className="section-heading"><div><p className="eyebrow">接下来的安排</p><h2>{upcoming ? `${Number(upcoming.date.slice(-2))}日 · ${SHIFT_META[upcoming.shift].label}` : "本月已无班次"}</h2></div><button className="icon-button" onClick={onCalendar}><Icon name="calendar" /></button></div>
        {upcoming ? (
          <button className="next-shift" onClick={() => onOpenDate(upcoming.date)}>
            <span className={`shift-orb ${SHIFT_META[upcoming.shift].className}`}>{SHIFT_META[upcoming.shift].short}</span>
            <span><strong>{compactHours(upcoming.hours)} 小时</strong><small>{upcoming.completed ? "已完成" : "计划班次 · 点击修改"}</small></span>
            <Icon name="chevron" />
          </button>
        ) : <p className="empty-copy">可以在日历里继续添加或调整班次。</p>}
        <div className="formula-note"><Icon name="spark" /><p><strong>{settings.workMode === "comprehensive" ? "综合工时口径" : "普通月薪口径"}</strong><span>{settings.workMode === "comprehensive" ? "加班 = 月总工时 − 当月基本工时，预测与实际分别计算。" : "按工作日、周末和法定节假日分别计算加班。"}</span></p></div>
      </section>
    </div>
  );
}

function MetricCard({ tone, label, value, detail }: { tone: string; label: string; value: string; detail: string }) {
  return <article className={`glass-panel metric-card tone-${tone}`}><span className="metric-glow" /><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function CalendarView({ year, month, records, target, actual, projected, onOpenDate, onGenerate, batchMode, batchDates, onToggleBatchMode, onToggleBatchDate, moneyVisible }: {
  year: number;
  month: number;
  records: DayRecord[];
  target: number;
  actual: ReturnType<typeof getPay>;
  projected: ReturnType<typeof getPay>;
  onOpenDate: (key: string) => void;
  onGenerate: () => void;
  batchMode: boolean;
  batchDates: string[];
  onToggleBatchMode: () => void;
  onToggleBatchDate: (key: string) => void;
  moneyVisible: boolean;
}) {
  const byDate = new Map(records.map((item) => [item.date, item]));
  const days = getCalendarDays(year, month);
  const todayKey = dateKey(new Date());
  return (
    <div className="calendar-layout">
      <section className="glass-panel calendar-panel">
        <div className="calendar-toolbar">
          <div><span className="soft-badge">{year}</span><h2>{MONTH_LABELS[month]}</h2></div>
          <div className="calendar-actions">
            <button className={`secondary-small ${batchMode ? "exit-multi" : ""}`} onClick={onToggleBatchMode}>{batchMode ? "退出多选" : "批量修改"}</button>
            <button className="primary-small" onClick={onGenerate}><Icon name="spark" /> 循环排班</button>
          </div>
        </div>
        {batchMode && <div className="batch-selection-bar"><span><strong>{batchDates.length ? `开始日期：${batchDates[0].slice(5).replace("-", "月")}日` : "请选择开始日期"}</strong><small>{batchDates.length ? "再点一个结束日期，将自动选中整个区间" : "所有灰色勾选框表示已进入区间多选模式"}</small></span><button className="range-status" disabled>{batchDates.length ? "等待结束日期" : "第 1 步"}</button></div>}
        <div className="weekday-row">{WEEKDAYS.map((day, index) => <span className={index > 4 ? "weekend" : ""} key={day}>周{day}</span>)}</div>
        <div className="calendar-grid">
          {days.map((day, index) => {
            if (!day) return <div className="calendar-empty" key={`empty-${index}`} />;
            const key = `${year}-${pad(month + 1)}-${pad(day)}`;
            const item = byDate.get(key);
            const meta = item ? SHIFT_META[item.shift] : null;
            const batchSelected = batchDates.includes(key);
            const holidayName = statutoryHolidayName(key);
            return (
              <button key={key} aria-pressed={batchMode ? batchSelected : undefined} className={`calendar-day ${key === todayKey ? "today" : ""} ${key < todayKey ? "past" : key > todayKey ? "future" : ""} ${batchSelected ? "batch-selected" : ""}`} onClick={() => batchMode ? onToggleBatchDate(key) : onOpenDate(key)}>
                <span className="day-number">{day}<small>{index % 7 > 4 ? "周末" : ""}</small></span>
                {item && item.shift !== "rest" ? <span className={`day-shift ${meta?.className}`}><b>{meta?.short}</b><em>{compactHours(item.hours)}h</em></span> : item?.shift === "rest" ? <span className="rest-label">休</span> : <span className="add-day">＋</span>}
                {holidayName && <span className="holiday-flag" title={`${holidayName} · 法定3倍`}>法 · {statutoryHolidayShortName(holidayName)}</span>}
                {item && isAutomaticallyCompleted(item) && <span className="complete-dot" title="已计入实际工时" />}
                {batchMode && <span className={`batch-check ${batchSelected ? "" : "pending"}`}>✓</span>}
              </button>
            );
          })}
        </div>
      </section>
      <aside className="glass-panel month-summary">
        <p className="eyebrow">月度小结</p><h2>{actual.totalHours >= target ? "已进入加班区间" : `还差 ${compactHours(target - actual.totalHours)} 小时`}</h2>
        <div className="summary-list">
          <div><span>基本工时</span><strong>{target}h</strong></div>
          <div><span>截至今天</span><strong>{compactHours(actual.totalHours)}h</strong></div>
          <div><span>月底预测</span><strong>{compactHours(projected.totalHours)}h</strong></div>
          <div className="accent"><span>预测加班费</span><strong>{privateMoney(projected.overtimePay, moneyVisible)}</strong></div>
        </div>
        <p className="summary-tip">排班到达当天后会自动计入实际；未来班次只进入预测。临时不出勤时，把当天删除为休息即可。</p>
      </aside>
    </div>
  );
}

function StatsView({ year, records, settings, selectedMonth, moneyVisible, onToggleMoney }: { year: number; records: DayRecord[]; settings: Settings; selectedMonth: number; moneyVisible: boolean; onToggleMoney: () => void }) {
  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const monthly = MONTH_LABELS.map((label, month) => {
    const key = `${year}-${pad(month + 1)}`;
    const target = settings.targets[key] ?? 168;
    const items = records.filter((item) => item.date.startsWith(key));
    return { label, month, target, workdays: items.filter((item) => item.planned && item.hours > 0).length, ...getPay(items, settings, target, true) };
  });
  const maxHours = Math.max(...monthly.map((item) => Math.max(item.totalHours, item.target)), 1);
  const totalOvertime = monthly.reduce((sum, item) => sum + item.overtimeHours, 0);
  const totalPay = monthly.reduce((sum, item) => sum + item.overtimePay, 0);
  const totalIncome = monthly.reduce((sum, item) => sum + item.income, 0);
  const detail = detailMonth === null ? null : monthly[detailMonth];
  return <>
    <div className="stats-layout">
      <section className="glass-panel annual-hero">
        <div><p className="eyebrow">{year} 年预测</p><h2>全年预计总收入</h2><strong>{privateMoney(totalIncome, moneyVisible)}</strong><small>其中加班费 {privateMoney(totalPay, moneyVisible)}</small></div>
        <div className="annual-side"><div className="annual-side-title"><span>预计加班</span><button className="privacy-toggle light" onClick={onToggleMoney} aria-label={moneyVisible ? "隐藏金额" : "显示金额"}><Icon name={moneyVisible ? "eye" : "eyeOff"} /></button></div><strong>{compactHours(totalOvertime)}h</strong><small>排班变化后自动重算</small></div>
      </section>
      <section className="glass-panel chart-card">
        <div className="section-heading"><div><p className="eyebrow">12个月</p><h2>基本工时与预测加班</h2></div><div className="chart-legend"><span><i className="bar-basic-key" />基本工时</span><span><i className="bar-overtime-key" />加班</span></div></div>
        <div className="bar-chart">
          {monthly.map((item) => {
            const basicHours = Math.min(Math.max(0, item.totalHours - item.overtimeHours), item.target);
            const visibleHours = basicHours + item.overtimeHours;
            return <button key={item.label} className={item.month === selectedMonth ? "selected" : ""} onClick={() => setDetailMonth(item.month)} title={`${item.label}：总工时 ${item.totalHours} 小时，加班 ${item.overtimeHours} 小时`}>
              <span className="bar-value">{item.overtimeHours > 0 ? `+${compactHours(item.overtimeHours)}h` : "0h"}</span>
              <span className="bar-track">
                <span className="bar-stack" style={{ height: `${(visibleHours / maxHours) * 100}%` }}>
                  <i className="bar-overtime" style={{ height: `${visibleHours ? (item.overtimeHours / visibleHours) * 100 : 0}%` }} />
                  <i className="bar-basic" style={{ height: `${visibleHours ? (basicHours / visibleHours) * 100 : 0}%` }} />
                </span>
              </span>
              <small>{item.month + 1}月</small>
            </button>;
          })}
        </div>
      </section>
      <section className="glass-panel stats-table-card">
        <div className="section-heading"><div><p className="eyebrow">全年明细</p><h2>月度预测清单</h2></div></div>
        <div className="stats-table">
          <div className="table-row table-head"><span>月份</span><span>排班 / 基本</span><span>加班</span><span>加班费</span><span>总收入</span></div>
          {monthly.map((item) => <button className="table-row" key={item.label} onClick={() => setDetailMonth(item.month)}><strong>{item.label}</strong><span>{compactHours(item.totalHours)} / {item.target}h</span><span className={item.overtimeHours > 0 ? "positive" : ""}>{compactHours(item.overtimeHours)}h</span><span className="overtime-money">{privateMoney(item.overtimePay, moneyVisible)}</span><strong>{privateMoney(item.income, moneyVisible)}</strong></button>)}
        </div>
      </section>
    </div>
    {detail && <div className="modal-backdrop detail-backdrop" onMouseDown={() => setDetailMonth(null)}>
      <section className="month-detail-card glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-header"><div><p className="eyebrow">{year} 年</p><h2>{detail.label}预测明细</h2></div><button className="close-button" onClick={() => setDetailMonth(null)}>×</button></div>
        <div className="detail-income"><span>预计总收入</span><strong>{privateMoney(detail.income, moneyVisible)}</strong><small>底薪 {privateMoney(settings.baseSalary, moneyVisible)} + 加班费 {privateMoney(detail.overtimePay, moneyVisible)}</small></div>
        <div className="detail-grid">
          <div><span>预计班次</span><strong>{detail.workdays} 天</strong></div>
          <div><span>总工时</span><strong>{compactHours(detail.totalHours)}h</strong></div>
          <div><span>基本工时</span><strong>{detail.target}h</strong></div>
          <div className="accent"><span>预测加班</span><strong>{compactHours(detail.overtimeHours)}h</strong></div>
          <div><span>小时工资</span><strong>{privateMoney(detail.hourly, moneyVisible)}</strong></div>
          <div className="accent"><span>预测加班费</span><strong>{privateMoney(detail.overtimePay, moneyVisible)}</strong></div>
        </div>
        <button className="primary-button detail-done" onClick={() => setDetailMonth(null)}>知道了</button>
      </section>
    </div>}
  </>;
}

function SettingsView({ settings, setSettings, records, setRecords, year, monthKey, moneyVisible, onToggleMoney }: { settings: Settings; setSettings: React.Dispatch<React.SetStateAction<Settings>>; records: DayRecord[]; setRecords: React.Dispatch<React.SetStateAction<DayRecord[]>>; year: number; monthKey: string; moneyVisible: boolean; onToggleMoney: () => void }) {
  const importInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState("");
  const [numberEditor, setNumberEditor] = useState<NumberEditorConfig | null>(null);
  const [shiftSystemOpen, setShiftSystemOpen] = useState(false);
  function editNumber(key: EditableSettingKey, title: string, unit: string, value: number, min: number, step: number) {
    setNumberEditor({ key, title, unit, value, min, step });
  }
  function saveNumber(value: number) {
    if (!numberEditor) return;
    if (numberEditor.target) {
      setSettings((item) => ({ ...item, targets: { ...item.targets, [numberEditor.key]: value } }));
    } else {
      setSettings((item) => ({ ...item, [numberEditor.key]: value }));
    }
    setNumberEditor(null);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { settings?: Partial<Settings>; records?: DayRecord[] };
      if (!parsed.settings || !Array.isArray(parsed.records) || !parsed.records.every((item) => typeof item?.date === "string" && typeof item?.shift === "string" && typeof item?.hours === "number")) {
        throw new Error("invalid backup");
      }
      setSettings(normalizeSettings(parsed.settings));
      setRecords(parsed.records.map((item) => ({ ...item, completed: Boolean(item.completed), planned: item.planned !== false })));
      setImportMessage(`已导入 ${parsed.records.length} 天记录`);
    } catch {
      setImportMessage("导入失败：请选择工时簿导出的 JSON 备份");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }
  return <>
    <div className="settings-grid">
      <section className="glass-panel setting-card wide">
        <div className="section-heading"><div><p className="eyebrow">计算方式</p><h2>工时制度</h2></div></div>
        <div className="mode-selector">
          <button className={settings.workMode === "comprehensive" ? "active" : ""} onClick={() => setSettings((item) => ({ ...item, workMode: "comprehensive" }))}><span><Icon name="spark" /></span><strong>综合工时</strong><small>月总工时超过基本工时后计加班</small></button>
          <button className={settings.workMode === "monthly" ? "active" : ""} onClick={() => setSettings((item) => ({ ...item, workMode: "monthly" }))}><span>8h</span><strong>普通月薪</strong><small>按工作日、周末和节假日逐日计算</small></button>
        </div>
      </section>
      <section className="glass-panel setting-card">
        <div className="section-heading"><div><p className="eyebrow">工资</p><h2>底薪与时薪</h2></div></div>
        <SettingNumberRow label="月基本工资" value="••••••" unit="元" onClick={() => editNumber("baseSalary", "月基本工资", "元", settings.baseSalary, 0, 1)} />
        <div className="calculated-field"><span>本月小时工资</span><div className="calculated-value"><strong>{privateMoney(settings.baseSalary / (settings.targets[monthKey] ?? 168), moneyVisible)}</strong><button className="privacy-toggle" onClick={onToggleMoney} aria-label={moneyVisible ? "隐藏小时工资" : "显示小时工资"}><Icon name={moneyVisible ? "eye" : "eyeOff"} /></button></div><small>自动按底薪 ÷ 基本工时</small></div>
      </section>
      <section className="glass-panel setting-card">
        <div className="section-heading"><div><p className="eyebrow">倍率</p><h2>加班工资</h2></div></div>
        <SettingNumberRow label="平时加班" value={settings.weekdayMultiplier} unit="倍" onClick={() => editNumber("weekdayMultiplier", "平时加班倍率", "倍", settings.weekdayMultiplier, 0.1, 0.1)} />
        <SettingNumberRow label="周末加班" value={settings.weekendMultiplier} unit="倍" onClick={() => editNumber("weekendMultiplier", "周末加班倍率", "倍", settings.weekendMultiplier, 0.1, 0.1)} />
        <SettingNumberRow label="节日加班" value={settings.holidayMultiplier} unit="倍" onClick={() => editNumber("holidayMultiplier", "节日加班倍率", "倍", settings.holidayMultiplier, 0.1, 0.1)} />
        {settings.workMode === "comprehensive" && <label className="switch-row"><span><strong>手动节假日单独计算</strong><small>仅控制手动标记日期；法定 13 天始终自动按 3 倍计算</small></span><input type="checkbox" checked={settings.holidaySeparate} onChange={(event) => setSettings((item) => ({ ...item, holidaySeparate: event.target.checked }))} /></label>}
        <p className="statutory-note"><span>法</span>每年 13 个法定节假日由日历自动识别并固定按 3 倍计算；这里的节日倍率用于手动标记的其他日期。</p>
      </section>
      <section className="glass-panel setting-card">
        <div className="section-heading shift-card-heading"><div><p className="eyebrow">班次</p><h2>默认时长</h2></div><div className={`shift-system-menu ${shiftSystemOpen ? "open" : ""}`}><button className="shift-system-trigger" aria-expanded={shiftSystemOpen} onClick={() => setShiftSystemOpen((value) => !value)}><span>{settings.shiftSystem === "two" ? "两班倒" : "三班倒"}</span><Icon name="chevron" /></button>{shiftSystemOpen && <div className="shift-system-dropdown"><button className={settings.shiftSystem === "two" ? "active" : ""} onClick={() => { setSettings((item) => ({ ...item, shiftSystem: "two" })); setShiftSystemOpen(false); }}><span><strong>两班倒</strong><small>白班 / 夜班</small></span>{settings.shiftSystem === "two" && <b>✓</b>}</button><button className={settings.shiftSystem === "three" ? "active" : ""} onClick={() => { setSettings((item) => ({ ...item, shiftSystem: "three" })); setShiftSystemOpen(false); }}><span><strong>三班倒</strong><small>早班 / 中班 / 晚班</small></span>{settings.shiftSystem === "three" && <b>✓</b>}</button></div>}</div></div>
        {settings.shiftSystem === "two" ? <>
          <SettingNumberRow label="白班" value={settings.dayHours} unit="小时" onClick={() => editNumber("dayHours", "白班默认时长", "小时", settings.dayHours, 0, 0.5)} />
          <SettingNumberRow label="夜班" value={settings.nightHours} unit="小时" onClick={() => editNumber("nightHours", "夜班默认时长", "小时", settings.nightHours, 0, 0.5)} />
        </> : <>
          <SettingNumberRow label="早班" value={settings.morningHours} unit="小时" onClick={() => editNumber("morningHours", "早班默认时长", "小时", settings.morningHours, 0, 0.5)} />
          <SettingNumberRow label="中班" value={settings.middleHours} unit="小时" onClick={() => editNumber("middleHours", "中班默认时长", "小时", settings.middleHours, 0, 0.5)} />
          <SettingNumberRow label="晚班" value={settings.lateHours} unit="小时" onClick={() => editNumber("lateHours", "晚班默认时长", "小时", settings.lateHours, 0, 0.5)} />
        </>}
        <SettingNumberRow label="日标准工时" value={settings.dailyStandard} unit="小时" onClick={() => editNumber("dailyStandard", "日标准工时", "小时", settings.dailyStandard, 0, 0.5)} />
      </section>
      <section className="glass-panel setting-card wide">
        <div className="section-heading"><div><p className="eyebrow">{year} 年</p><h2>每月基本工时</h2></div><span className="soft-badge">可手动修正</span></div>
        <div className="target-grid">
          {MONTH_LABELS.map((label, index) => {
            const key = `${year}-${pad(index + 1)}`;
            return <button className="target-number-button" key={key} onClick={() => setNumberEditor({ key, target: true, title: `${label}基本工时`, unit: "小时", value: settings.targets[key] ?? 168, min: 0, step: 1 })}><span>{label}</span><strong>{settings.targets[key] ?? 168}<b>h</b></strong></button>;
          })}
        </div>
        <p className="setting-footnote">2026 年已按你提供的基本工时表预置。以后可按年度更新，不会影响已保存的每日记录。</p>
      </section>
      <section className="glass-panel setting-card wide data-card">
        <div><p className="eyebrow">数据</p><h2>备份与恢复</h2><span>备份同时包含设置、排班和每日修改记录，可在另一台设备或重装后完整恢复。</span>{importMessage && <strong className={`import-message ${importMessage.startsWith("导入失败") ? "error" : ""}`}>{importMessage}</strong>}</div>
        <div className="data-actions">
          <button className="secondary-button" onClick={() => { const blob = new Blob([JSON.stringify({ app: "shift-ledger", settings, records, exportedAt: new Date().toISOString(), version: 2 }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `工时簿备份-${dateKey(new Date())}.json`; anchor.click(); URL.revokeObjectURL(url); }}><Icon name="download" />导出备份</button>
          <button className="secondary-button" onClick={() => importInput.current?.click()}><Icon name="upload" />导入备份</button>
          <input ref={importInput} className="file-input" type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} />
        </div>
      </section>
    </div>
    {numberEditor && <NumberEditorModal config={numberEditor} onClose={() => setNumberEditor(null)} onSave={saveNumber} />}
  </>;
}

function SettingNumberRow({ label, value, unit, onClick }: { label: string; value: number | string; unit: string; onClick: () => void }) {
  return <button className="setting-number-row" onClick={onClick}><span>{label}</span><strong>{typeof value === "number" ? compactHours(value) : value}<b>{unit}</b><i>›</i></strong></button>;
}

function NumberEditorModal({ config, onClose, onSave }: { config: NumberEditorConfig; onClose: () => void; onSave: (value: number) => void }) {
  const [text, setText] = useState(String(config.value));
  const parsed = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(parsed) && parsed >= config.min;
  return <div className="modal-backdrop number-editor-backdrop" onMouseDown={onClose}>
    <section className="number-editor-card glass-panel" onMouseDown={(event) => event.stopPropagation()}>
      <div className="sheet-header"><div><p className="eyebrow">修改设置</p><h2>{config.title}</h2></div><button className="close-button" onClick={onClose}>×</button></div>
      <label className="number-editor-input"><span>输入新数值</span><div><input autoFocus inputMode="decimal" type="text" value={text} onChange={(event) => setText(event.target.value.replace(/[^0-9.]/g, ""))} /><b>{config.unit}</b>{text && <button type="button" onClick={() => setText("")}>清空</button>}</div></label>
      <p className="number-editor-tip">内容可以完全清空后重新输入；确认后会立即重新计算当前页面。</p>
      <div className="sheet-actions"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={!valid} onClick={() => valid && onSave(parsed)}>确定修改</button></div>
    </section>
  </div>;
}

function DayEditor({ date, record, settings, onClose, onSave, onDelete }: { date: string; record?: DayRecord; settings: Settings; onClose: () => void; onSave: (record: DayRecord) => void; onDelete: () => void }) {
  const automaticHoliday = isStatutoryHoliday(date);
  const initial: DayRecord = record ? { ...record, isHoliday: automaticHoliday || Boolean(record.isHoliday) } : { date, shift: "rest", hours: 0, completed: false, planned: true, isHoliday: automaticHoliday };
  const [draft, setDraft] = useState(initial);
  const formatted = parseDate(date);
  function selectShift(shift: ShiftType) {
    const hours = shift === "custom" ? draft.hours : getShiftHours(settings, shift);
    setDraft((item) => ({ ...item, shift, hours, planned: shift !== "leave" }));
  }
  function selectHours(hours: number) {
    setDraft((item) => ({ ...item, hours, shift: item.shift === "rest" || item.shift === "leave" ? "custom" : item.shift, planned: true }));
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="bottom-sheet glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <div className="sheet-header"><div><p className="eyebrow">{date}</p><h2>{formatted.getMonth() + 1}月{formatted.getDate()}日 · 周{WEEKDAYS[(formatted.getDay() + 6) % 7]}</h2></div><button className="close-button" onClick={onClose}>×</button></div>
        <div className={`shift-picker ${settings.shiftSystem === "three" ? "three-shift-picker" : ""}`}>
          {getEditorShifts(settings).map((shift) => <button key={shift} className={`${draft.shift === shift ? "active" : ""} ${SHIFT_META[shift].className}`} onClick={() => selectShift(shift)}><span>{SHIFT_META[shift].short}</span>{SHIFT_META[shift].label}</button>)}
        </div>
        <div className="editor-grid">
          <label className="field"><span>工时</span><div><input type="number" step="0.5" min="0" value={draft.hours} onChange={(event) => setDraft((item) => ({ ...item, hours: Number(event.target.value) || 0, shift: item.shift === "rest" || item.shift === "leave" ? "custom" : item.shift }))} /><b>小时</b></div></label>
          <div className="quick-hour-group" aria-label="常用工时">
            {[8, 10, 10.5, 11, 11.5, 12].map((hours) => <button key={hours} className={draft.hours === hours ? "active" : ""} onClick={() => selectHours(hours)}>{hours}h</button>)}
          </div>
          <div className="auto-status"><Icon name="check" /><span><strong>自动计入实际</strong><small>到达当天后自动完成，无需手动确认</small></span></div>
          <label className="switch-row compact"><span><strong>法定节假日</strong><small>{automaticHoliday ? `${statutoryHolidayName(date)} · 系统自动标记 3 倍` : "可手动按节日规则计算"}</small></span><input type="checkbox" disabled={automaticHoliday} checked={automaticHoliday || Boolean(draft.isHoliday)} onChange={(event) => setDraft((item) => ({ ...item, isHoliday: event.target.checked }))} /></label>
          <label className="field note-field"><span>备注</span><input placeholder="例如：调班、迟到 1 小时…" value={draft.note ?? ""} onChange={(event) => setDraft((item) => ({ ...item, note: event.target.value }))} /></label>
        </div>
        <div className="sheet-actions"><button className="delete-button" onClick={onDelete}><Icon name="trash" />删除</button><button className="primary-button" onClick={() => onSave({ ...draft, planned: draft.shift !== "leave" && draft.shift !== "rest" ? true : draft.planned })}>保存记录</button></div>
      </section>
    </div>
  );
}

function BatchEditor({ dates, settings, onClose, onSave }: { dates: string[]; settings: Settings; onClose: () => void; onSave: (change: { shift: ShiftType; hours: number; isHoliday: boolean }) => void }) {
  const initialShift: ShiftType = settings.shiftSystem === "three" ? "morning" : "day";
  const [shift, setShift] = useState<ShiftType>(initialShift);
  const [hoursText, setHoursText] = useState(String(getShiftHours(settings, initialShift)));
  const [isHoliday, setIsHoliday] = useState(false);
  const hours = Number(hoursText);
  const valid = hoursText.trim() !== "" && Number.isFinite(hours) && hours >= 0;
  function selectShift(next: ShiftType) {
    setShift(next);
    if (next !== "custom") setHoursText(String(getShiftHours(settings, next)));
  }
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="bottom-sheet batch-editor-sheet glass-panel" onMouseDown={(event) => event.stopPropagation()}>
      <div className="sheet-grabber" />
      <div className="sheet-header"><div><p className="eyebrow">批量修改 · {dates.length} 天</p><h2>统一设置所选日期</h2></div><button className="close-button" onClick={onClose}>×</button></div>
      <p className="batch-date-range">{dates[0]} 至 {dates[dates.length - 1]}，只修改已选择的日期。</p>
      <div className={`shift-picker ${settings.shiftSystem === "three" ? "three-shift-picker" : ""}`}>
        {getEditorShifts(settings).map((item) => <button key={item} className={`${shift === item ? "active" : ""} ${SHIFT_META[item].className}`} onClick={() => selectShift(item)}><span>{SHIFT_META[item].short}</span>{SHIFT_META[item].label}</button>)}
      </div>
      <label className="field batch-hours-field"><span>统一工时</span><div><input inputMode="decimal" type="text" value={hoursText} onChange={(event) => setHoursText(event.target.value.replace(/[^0-9.]/g, ""))} /><b>小时</b></div></label>
      <div className="quick-hour-group" aria-label="常用工时">
        {[8, 10, 10.5, 11, 11.5, 12].map((item) => <button key={item} className={hours === item ? "active" : ""} onClick={() => { setHoursText(String(item)); if (shift === "rest" || shift === "leave") setShift("custom"); }}>{item}h</button>)}
      </div>
      <label className="switch-row"><span><strong>统一标为法定节假日</strong><small>开启后，所选日期都按节日规则计算</small></span><input type="checkbox" checked={isHoliday} onChange={(event) => setIsHoliday(event.target.checked)} /></label>
      <div className="warning-note"><Icon name="spark" /><span>本次只覆盖班次、工时和节假日状态，不会影响未选择的日期。</span></div>
      <div className="sheet-actions"><button className="secondary-button" onClick={onClose}>返回选择</button><button className="primary-button" disabled={!valid} onClick={() => valid && onSave({ shift, hours, isHoliday })}>确认修改 {dates.length} 天</button></div>
    </section>
  </div>;
}

function ScheduleGenerator({ settings, year, onClose, onGenerate }: { settings: Settings; year: number; onClose: () => void; onGenerate: (cycle: ShiftType[], cycleStart: string) => void }) {
  const [cycle, setCycle] = useState<ShiftType[]>(settings.cycle);
  const currentDate = dateKey(new Date());
  const [cycleStart, setCycleStart] = useState(currentDate.startsWith(`${year}-`) ? currentDate : `${year}-01-01`);
  const generatorShifts: ShiftType[] = settings.shiftSystem === "three" ? ["morning", "middle", "late", "rest"] : ["day", "night", "rest"];
  function addShift(shift: ShiftType) {
    setCycle((items) => items.length < 31 ? [...items, shift] : items);
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="dialog-card glass-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-header"><div><p className="eyebrow">新循环排班</p><h2>从指定日期向后更新</h2></div><button className="close-button" onClick={onClose}>×</button></div>
        <div className="cycle-template-head"><span>常用模板</span><small>点击即可替换当前循环</small></div>
        <div className="cycle-template-grid">{CYCLE_TEMPLATES.map((template) => {
          const active = cycle.length === template.cycle.length && cycle.every((item, index) => item === template.cycle[index]);
          return <button key={template.id} className={active ? "active" : ""} onClick={() => setCycle([...template.cycle])}><strong>{template.name}</strong><small>{template.caption}</small>{active && <i>✓</i>}</button>;
        })}</div>
        <div className="cycle-builder-head"><span>当前循环 · {cycle.length} 天</span><div><button className="builder-action" onClick={() => setCycle((items) => items.slice(0, -1))} disabled={!cycle.length}><b>↶</b>撤销一步</button><button className="builder-action danger" onClick={() => setCycle([])} disabled={!cycle.length}>清空循环</button></div></div>
        <div className="cycle-visual custom-cycle">{cycle.length ? cycle.map((shift, index) => <span key={`${shift}-${index}`} className={shift}><small>{index + 1}</small>{SHIFT_META[shift].short}</span>) : <p>请在下方依次添加班次</p>}</div>
        <div className={`cycle-controls ${settings.shiftSystem === "three" ? "three-cycle-controls" : ""}`}>
          {generatorShifts.map((shift) => <button key={shift} className={SHIFT_META[shift].className} onClick={() => addShift(shift)}><b>＋ {SHIFT_META[shift].short}</b><span>{SHIFT_META[shift].label}{getShiftHours(settings, shift) ? ` ${getShiftHours(settings, shift)}h` : ""}</span></button>)}
        </div>
        <p className="dialog-copy">按点击顺序组成一个循环。系统只从生效日开始向后覆盖到年底，生效日前已经发生的排班和手动修改全部保留。</p>
        <label className="field"><span>新循环生效日（第 1 天）</span><div><input type="date" min={`${year}-01-01`} max={`${year}-12-31`} value={cycleStart} onChange={(event) => setCycleStart(event.target.value)} /></div></label>
        <div className="warning-note"><Icon name="spark" /><span>{cycleStart} 之前的记录不会改变；当天及之后将按新循环重新生成。</span></div>
        <div className="sheet-actions"><button className="secondary-button" onClick={onClose}>稍后</button><button className="primary-button" disabled={!cycle.length || !cycleStart} onClick={() => onGenerate(cycle, cycleStart)}>从生效日开始生成</button></div>
      </section>
    </div>
  );
}

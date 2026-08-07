"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction, TouchEvent as ReactTouchEvent } from "react";
import { Solar } from "lunar-typescript";

type View = "calendar" | "stats" | "settings";
type ShiftType = "day" | "night" | "morning" | "middle" | "late" | "rest" | "leave" | "custom";
type ShiftSystem = "two" | "three";

type DayRecord = {
  date: string;
  shift: ShiftType;
  hours: number;
  completed: boolean;
  planned: boolean;
  note?: string;
};

type Settings = {
  dailyStandard: number;
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

type EditableSettingKey = "dayHours" | "nightHours" | "morningHours" | "middleHours" | "lateHours" | "dailyStandard";
type NumberEditorConfig = {
  key: EditableSettingKey | string;
  target?: boolean;
  title: string;
  unit: string;
  value: number;
  min: number;
  step: number;
};

const LEGACY_TARGETS_2026: Record<string, number> = {
  "2026-01": 168, "2026-02": 128, "2026-03": 176, "2026-04": 168,
  "2026-05": 152, "2026-06": 168, "2026-07": 184, "2026-08": 168,
  "2026-09": 176, "2026-10": 144, "2026-11": 168, "2026-12": 184,
};
const TARGET_START_YEAR = 2025;
const TARGET_END_YEAR = 2050;
const DEFAULT_CYCLE: ShiftType[] = [
  "day", "day", "day", "day", "rest", "rest",
  "night", "night", "night", "night", "rest", "rest",
];
const CYCLE_TEMPLATES: { id: string; name: string; caption: string; cycle: ShiftType[] }[] = [
  { id: "four-two", name: "四白两休 · 四夜两休", caption: "白白白白休休 · 夜夜夜夜休休", cycle: DEFAULT_CYCLE },
  { id: "one-one-two", name: "一白一夜 · 休两天", caption: "白夜休休", cycle: ["day", "night", "rest", "rest"] },
  { id: "two-two", name: "两白两休 · 两夜两休", caption: "白白休休 · 夜夜休休", cycle: ["day", "day", "rest", "rest", "night", "night", "rest", "rest"] },
  { id: "four-three", name: "四班三倒 · 8 小时", caption: "早早中中晚晚休休", cycle: ["morning", "morning", "middle", "middle", "late", "late", "rest", "rest"] },
];

const DEFAULT_SETTINGS: Settings = {
  dailyStandard: 8,
  shiftSystem: "two",
  dayHours: 8,
  nightHours: 8,
  morningHours: 8,
  middleHours: 8,
  lateHours: 8,
  cycleStart: "",
  cycle: [],
  targets: {},
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
const VALID_SHIFTS: ShiftType[] = ["day", "night", "morning", "middle", "late", "rest", "leave", "custom"];

function pad(value: number) { return String(value).padStart(2, "0"); }
function dateKey(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseDate(key: string) { const [year, month, day] = key.split("-").map(Number); return new Date(year, month - 1, day); }
function dayDiff(a: Date, b: Date) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((aa - bb) / 86400000);
}
function compactHours(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

function getShiftHours(settings: Settings, shift: ShiftType) {
  if (shift === "day") return settings.dayHours;
  if (shift === "night") return settings.nightHours;
  if (shift === "morning") return settings.morningHours;
  if (shift === "middle") return settings.middleHours;
  if (shift === "late") return settings.lateHours;
  return 0;
}

function getEditorShifts(system: ShiftSystem): ShiftType[] {
  return system === "three"
    ? ["morning", "middle", "late", "rest", "leave", "custom"]
    : ["day", "night", "rest", "leave", "custom"];
}

function cycleSystem(cycle: ShiftType[], fallback: ShiftSystem = "two"): ShiftSystem {
  if (cycle.some((shift) => shift === "morning" || shift === "middle" || shift === "late")) return "three";
  if (cycle.some((shift) => shift === "day" || shift === "night")) return "two";
  return fallback;
}

function statutoryHolidayName(key: string) {
  const date = parseDate(key);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 1 && day === 1) return "元旦";
  if (month === 5 && (day === 1 || day === 2)) return "劳动节";
  if (month === 10 && day >= 1 && day <= 3) return "国庆节";
  if (month === 10 && day === 4) {
    const overlap = [1, 2, 3].some((nationalDay) => {
      const lunar = Solar.fromYmd(date.getFullYear(), 10, nationalDay).getLunar();
      return lunar.getMonth() === 8 && lunar.getDay() === 15;
    });
    if (overlap) return "中秋节补假";
  }
  const lunar = Solar.fromYmd(date.getFullYear(), month, day).getLunar();
  if (lunar.getMonth() === 1 && lunar.getDay() >= 1 && lunar.getDay() <= 3) return "春节";
  const next = new Date(date); next.setDate(next.getDate() + 1);
  const nextLunar = Solar.fromYmd(next.getFullYear(), next.getMonth() + 1, next.getDate()).getLunar();
  if (nextLunar.getMonth() === 1 && nextLunar.getDay() === 1) return "除夕";
  if (lunar.getJieQi() === "清明") return "清明节";
  if (lunar.getMonth() === 5 && lunar.getDay() === 5) return "端午节";
  if (lunar.getMonth() === 8 && lunar.getDay() === 15) return "中秋节";
  return "";
}

function statutoryHolidayShortName(name: string) {
  const labels: Record<string, string> = { 元旦: "元旦", 劳动节: "劳动", 国庆节: "国庆", 中秋节补假: "中秋补", 春节: "春节", 除夕: "除夕", 清明节: "清明", 端午节: "端午", 中秋节: "中秋" };
  return labels[name] ?? name;
}

function estimateMonthlyTarget(year: number, month: number, dailyStandard: number) {
  let workdays = 0;
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6 && !statutoryHolidayName(dateKey(cursor))) workdays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return workdays * dailyStandard;
}

function getMonthlyTarget(settings: Settings, year: number, month: number) {
  const key = `${year}-${pad(month + 1)}`;
  const override = settings.targets[key];
  return Number.isFinite(override) ? override : estimateMonthlyTarget(year, month, settings.dailyStandard);
}

function normalizeSettings(value?: Record<string, unknown>): Settings {
  const rawCycle = Array.isArray(value?.cycle) ? value.cycle.filter((item): item is ShiftType => typeof item === "string" && VALID_SHIFTS.includes(item as ShiftType)) : [];
  const rawTargets = value?.targets && typeof value.targets === "object" ? value.targets as Record<string, unknown> : {};
  const targets: Record<string, number> = {};
  Object.entries(rawTargets).forEach(([key, raw]) => {
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0) return;
    if (LEGACY_TARGETS_2026[key] === number) return;
    targets[key] = number;
  });
  const numberValue = (key: string, fallback: number) => {
    const number = Number(value?.[key]);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  };
  const storedSystem = value?.shiftSystem === "three" ? "three" : value?.shiftSystem === "two" ? "two" : cycleSystem(rawCycle);
  return {
    dailyStandard: numberValue("dailyStandard", 8),
    shiftSystem: storedSystem,
    dayHours: numberValue("dayHours", 8),
    nightHours: numberValue("nightHours", 8),
    morningHours: numberValue("morningHours", 8),
    middleHours: numberValue("middleHours", 8),
    lateHours: numberValue("lateHours", 8),
    cycleStart: typeof value?.cycleStart === "string" ? value.cycleStart : "",
    cycle: rawCycle,
    targets,
  };
}

function normalizeRecords(value: unknown): DayRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): DayRecord[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.date !== "string" || typeof item.shift !== "string" || !VALID_SHIFTS.includes(item.shift as ShiftType)) return [];
    const hours = Number(item.hours);
    return [{
      date: item.date,
      shift: item.shift as ShiftType,
      hours: Number.isFinite(hours) && hours >= 0 ? hours : 0,
      completed: Boolean(item.completed),
      planned: item.planned !== false,
      note: typeof item.note === "string" ? item.note : undefined,
    }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function createScheduleFromDate(settings: Settings, year: number, effectiveDate: string, existing: DayRecord[]) {
  const start = parseDate(effectiveDate);
  if (start.getFullYear() !== year || !settings.cycle.length) return existing;
  const preserved = existing.filter((item) => parseDate(item.date).getFullYear() !== year || item.date < effectiveDate);
  const generated: DayRecord[] = [];
  const cursor = new Date(start);
  while (cursor.getFullYear() === year) {
    const shift = settings.cycle[dayDiff(cursor, start) % settings.cycle.length];
    generated.push({ date: dateKey(cursor), shift, hours: getShiftHours(settings, shift), planned: true, completed: false });
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

function isAutomaticallyCompleted(item: DayRecord) { return item.planned && item.hours > 0 && item.date <= dateKey(new Date()); }
function getHoursSummary(records: DayRecord[], target: number, projected: boolean) {
  const included = records.filter((item) => item.hours > 0 && (projected ? item.planned : isAutomaticallyCompleted(item)));
  const totalHours = included.reduce((sum, item) => sum + item.hours, 0);
  return { totalHours, overtimeHours: Math.max(0, totalHours - target) };
}

function inclusiveDateRange(first: string, second: string) {
  const start = parseDate(first < second ? first : second);
  const end = parseDate(first < second ? second : first);
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) { dates.push(dateKey(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return dates;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    calendar: <><rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/></>,
    stats: <><path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.55v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3V9.55h.1A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.56 3.7l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1v-.1h4.05v.1A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.5c.2.38.57.76 1 .95.34.13.7.2 1.05.2h.1v4.05h-.1c-.35 0-.7.07-1.05.2-.43.2-.8.57-1 1.1Z"/></>,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 14v6h14v-6"/></>,
    download: <><path d="M12 4v12m0 0-5-5m5 5 5-5"/><path d="M5 20h14"/></>,
  };
  return <svg className="app-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<View>("calendar");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [ready, setReady] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const rawSettings = window.localStorage.getItem(STORAGE_SETTINGS);
        const rawRecords = window.localStorage.getItem(STORAGE_RECORDS);
        setSettings(normalizeSettings(rawSettings ? JSON.parse(rawSettings) : undefined));
        setRecords(normalizeRecords(rawRecords ? JSON.parse(rawRecords) : []));
      } catch {
        setSettings(DEFAULT_SETTINGS);
        setRecords([]);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings)); }, [settings, ready]);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records)); }, [records, ready]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthKey = `${year}-${pad(month + 1)}`;
  const target = getMonthlyTarget(settings, year, month);
  const monthRecords = useMemo(() => records.filter((item) => item.date.startsWith(monthKey)), [records, monthKey]);
  const actual = useMemo(() => getHoursSummary(monthRecords, target, false), [monthRecords, target]);
  const projected = useMemo(() => getHoursSummary(monthRecords, target, true), [monthRecords, target]);

  function notifySaved() { setSavedToast(true); window.setTimeout(() => setSavedToast(false), 1800); }
  function changeMonth(delta: number) { setSelectedMonth((value) => new Date(value.getFullYear(), value.getMonth() + delta, 1)); }
  function updateRecord(updated: DayRecord) {
    setRecords((items) => {
      const exists = items.some((item) => item.date === updated.date);
      return (exists ? items.map((item) => item.date === updated.date ? updated : item) : [...items, updated]).sort((a, b) => a.date.localeCompare(b.date));
    });
  }
  function regenerateYear(cycle: ShiftType[], cycleStart: string) {
    const nextSettings = { ...settings, cycle, cycleStart, shiftSystem: cycleSystem(cycle, settings.shiftSystem) };
    setSettings(nextSettings);
    setRecords((items) => createScheduleFromDate(nextSettings, year, cycleStart, items));
    setShowGenerator(false); notifySaved();
  }
  function toggleBatchMode() {
    setBatchMode((active) => { if (active) setBatchDates([]); return !active; });
  }
  function toggleBatchDate(key: string) {
    if (!batchDates.length) { setBatchDates([key]); return; }
    setBatchDates(inclusiveDateRange(batchDates[0], key));
    setShowBatchEditor(true);
  }
  function updateBatchRecords(change: { shift: ShiftType; hours: number }) {
    const selected = new Set(batchDates);
    const existing = new Map(records.map((item) => [item.date, item]));
    const updates = batchDates.map((date) => ({ ...(existing.get(date) ?? { date, completed: false }), date, shift: change.shift, hours: change.hours, planned: true, completed: false }));
    setRecords((items) => [...items.filter((item) => !selected.has(item.date)), ...updates].sort((a, b) => a.date.localeCompare(b.date)));
    setShowBatchEditor(false); setBatchMode(false); setBatchDates([]); notifySaved();
  }

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "calendar", label: "日历", icon: "calendar" },
    { id: "stats", label: "统计", icon: "stats" },
    { id: "settings", label: "设置", icon: "settings" },
  ];
  if (!ready) return <main className="loading-screen">正在整理你的班次…</main>;

  return <main className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <aside className="side-nav glass-panel">
      <div className="brand-mark"><Icon name="spark"/></div>
      <div className="brand-copy"><strong>工时簿</strong><span>排班与工时累计</span></div>
      <nav>{navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span className="nav-icon"><Icon name={item.icon}/></span>{item.label}</button>)}</nav>
      <div className="privacy-note"><span>●</span> 数据仅保存在本机</div>
    </aside>
    <section className="content-wrap">
      <header className="topbar">
        <div><p className="eyebrow">本机排班与工时</p><h1>{view === "calendar" ? "排班日历" : view === "stats" ? "工时统计" : "排班设置"}</h1></div>
        {view !== "settings" && <div className="month-switch glass-control">
          <button onClick={() => changeMonth(-1)} aria-label="上个月">‹</button>
          <button className="current-month" onClick={() => setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>{year}年{month + 1}月</button>
          <button onClick={() => changeMonth(1)} aria-label="下个月">›</button>
        </div>}
      </header>
      {view === "calendar" && <CalendarView year={year} month={month} records={monthRecords} target={target} actual={actual} projected={projected} onOpenDate={setSelectedDate} onGenerate={() => setShowGenerator(true)} batchMode={batchMode} batchDates={batchDates} onToggleBatchMode={toggleBatchMode} onToggleBatchDate={toggleBatchDate} onChangeMonth={changeMonth}/>} 
      {view === "stats" && <StatsView year={year} month={month} records={records} settings={settings}/>} 
      {view === "settings" && <SettingsView settings={settings} setSettings={setSettings} records={records} setRecords={setRecords} activeYear={year}/>} 
    </section>
    <nav className="bottom-nav glass-panel" aria-label="主导航">{navItems.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span><Icon name={item.icon}/></span>{item.label}</button>)}</nav>

    {selectedDate && <DayEditor date={selectedDate} record={records.find((item) => item.date === selectedDate)} settings={settings} onClose={() => setSelectedDate(null)} onSave={(record) => { updateRecord(record); setSelectedDate(null); notifySaved(); }} onDelete={() => { updateRecord({ date: selectedDate, shift: "rest", hours: 0, planned: true, completed: false }); setSelectedDate(null); notifySaved(); }}/>} 
    {showGenerator && <ScheduleGenerator settings={settings} year={year} onClose={() => setShowGenerator(false)} onGenerate={regenerateYear}/>} 
    {showBatchEditor && <BatchEditor dates={batchDates} settings={settings} onClose={() => { setShowBatchEditor(false); setBatchDates([]); }} onSave={updateBatchRecords}/>} 
    {savedToast && <div className="toast"><Icon name="check"/> 已保存</div>}
  </main>;
}

function CalendarView({ year, month, records, target, actual, projected, onOpenDate, onGenerate, batchMode, batchDates, onToggleBatchMode, onToggleBatchDate, onChangeMonth }: {
  year: number; month: number; records: DayRecord[]; target: number;
  actual: ReturnType<typeof getHoursSummary>; projected: ReturnType<typeof getHoursSummary>;
  onOpenDate: (key: string) => void; onGenerate: () => void;
  batchMode: boolean; batchDates: string[]; onToggleBatchMode: () => void; onToggleBatchDate: (key: string) => void;
  onChangeMonth: (delta: number) => void;
}) {
  const recordMap = useMemo(() => new Map(records.map((item) => [item.date, item])), [records]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scheduled = records.filter((item) => item.planned && item.hours > 0);
  const confirmed = records.filter(isAutomaticallyCompleted);
  const restDays = records.filter((item) => item.shift === "rest").length;
  const leaveDays = records.filter((item) => item.shift === "leave").length;
  const upcoming = records.find((item) => item.date >= dateKey(new Date()) && item.hours > 0);
  const scale = Math.max(target, projected.totalHours, 1);
  const baseWidth = Math.min(100, (target / scale) * 100);
  const overtimeWidth = Math.max(0, 100 - baseWidth);
  const markerLeft = Math.min(98, Math.max(1, (actual.totalHours / scale) * 100));

  function handleTouchStart(event: ReactTouchEvent<HTMLElement>) {
    if (event.touches.length !== 1 || batchMode) return;
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  function handleTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    if (!touchStart.current || batchMode) return;
    const dx = event.changedTouches[0].clientX - touchStart.current.x;
    const dy = event.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.25) onChangeMonth(dx < 0 ? 1 : -1);
  }

  return <div className="calendar-page">
    <div className="calendar-layout">
      <section className="calendar-panel glass-panel" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="calendar-toolbar">
          <div><span className="year-pill">{year}</span><h2>{MONTH_LABELS[month]}</h2></div>
          <div className="calendar-actions">
            <button className={`secondary-small ${batchMode ? "exit-multi" : ""}`} onClick={onToggleBatchMode}>{batchMode ? "退出多选" : "批量修改"}</button>
            <button className="primary-small" onClick={onGenerate}><Icon name="spark"/> 循环排班</button>
          </div>
        </div>
        {batchMode && <div className="batch-selection-bar"><span><strong>{batchDates.length ? `起点：${batchDates[0]}` : "请选择起始日期"}</strong><small>{batchDates.length ? "再选截止日，将自动选择整个区间" : "所有日期已进入可选状态"}</small></span>{batchDates.length > 0 && <span className="range-status">等待截止日</span>}</div>}
        <div className="weekday-row">{WEEKDAYS.map((day, index) => <span key={day} className={index > 4 ? "weekend" : ""}>周{day}</span>)}</div>
        <div className="calendar-grid">
          {getCalendarDays(year, month).map((day, index) => {
            if (!day) return <span className="calendar-spacer" key={`blank-${index}`}/>;
            const key = `${year}-${pad(month + 1)}-${pad(day)}`;
            const item = recordMap.get(key);
            const holiday = statutoryHolidayName(key);
            const selected = batchDates.includes(key);
            const completed = item ? isAutomaticallyCompleted(item) : false;
            return <button key={key} className={`calendar-day ${key === dateKey(new Date()) ? "today" : ""} ${selected ? "batch-selected" : ""}`} onClick={() => batchMode ? onToggleBatchDate(key) : onOpenDate(key)}>
              <span className="day-number">{day}</span>
              {completed && !batchMode && <i className="complete-dot"/>}
              {batchMode && <span className={`batch-check ${selected ? "" : "pending"}`}>✓</span>}
              {holiday && <small className="holiday-flag">法 · {statutoryHolidayShortName(holiday)}</small>}
              {item ? item.hours > 0 ? <span className={`day-shift ${SHIFT_META[item.shift].className}`}><b>{SHIFT_META[item.shift].short}</b>{compactHours(item.hours)}h</span> : <span className={`rest-label ${SHIFT_META[item.shift].className}`}>{SHIFT_META[item.shift].short}</span> : <span className="add-day">＋</span>}
            </button>;
          })}
        </div>
        <p className="swipe-hint">‹ 左右滑动切换月份 ›</p>
      </section>

    </div>

    {upcoming ? <button className="next-shift calendar-next-shift glass-panel" onClick={() => onOpenDate(upcoming.date)}><span className={`shift-orb ${SHIFT_META[upcoming.shift].className}`}>{SHIFT_META[upcoming.shift].short}</span><span><strong>下一班 · {SHIFT_META[upcoming.shift].label}</strong><small>{upcoming.date} · {compactHours(upcoming.hours)} 小时</small></span><b>›</b></button> : <div className="empty-schedule-note calendar-next-shift glass-panel"><Icon name="calendar"/><span><strong>本月暂无后续班次</strong><small>可在日历中手动添加，或使用循环排班。</small></span></div>}

    <section className="month-outlook glass-panel">
      <div className="section-heading"><div><p className="eyebrow">本月展望</p><h2>排班与累计工时</h2></div><span className="soft-badge">{scheduled.length ? `${scheduled.length} 个班次` : "尚未排班"}</span></div>
      <div className="outlook-metrics">
        <MetricCard label="预计总工时" value={`${compactHours(projected.totalHours)}h`} detail={`基本工时 ${compactHours(target)}h · ${scheduled.length} 个计划班次`} tone="blue"/>
        <MetricCard label="已确认工时" value={`${compactHours(actual.totalHours)}h`} detail={`${confirmed.length} 个已到日期班次`} tone="green"/>
        <MetricCard label="预测加班" value={`${compactHours(projected.overtimeHours)}h`} detail="按当前排班推算" tone="orange"/>
        <MetricCard label="实际加班" value={`${compactHours(actual.overtimeHours)}h`} detail="超过本月基本工时后累计" tone="violet"/>
      </div>
      <div className="phase-progress-card">
        <div className="phase-copy"><span>基本工时 {compactHours(target)}h</span><strong>当前 {compactHours(actual.totalHours)}h</strong><span>加班工时 {compactHours(projected.overtimeHours)}h</span></div>
        <div className="phase-track"><i className="phase-basic" style={{ width: `${baseWidth}%` }}/><i className="phase-overtime" style={{ width: `${overtimeWidth}%` }}/><b className="phase-marker" style={{ left: `${markerLeft}%` }}><Icon name="spark"/></b></div>
        <div className="phase-legend"><span><i className="blue"/>基本工时区间</span><span><i className="violet"/>加班区间</span><span><i className="marker"/>实时进度</span></div>
      </div>
      <div className="month-counts"><div><strong>{scheduled.length}</strong><span>上班天数</span></div><div><strong>{restDays}</strong><span>休息天数</span></div><div><strong>{leaveDays}</strong><span>请假天数</span></div><div><strong>{Math.max(0, scheduled.length - confirmed.length)}</strong><span>剩余班次</span></div></div>
    </section>
  </div>;
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`metric-card glass-panel tone-${tone}`}><i className="metric-glow"/><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function StatsView({ year, month, records, settings }: { year: number; month: number; records: DayRecord[]; settings: Settings }) {
  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const yearly = useMemo(() => MONTH_LABELS.map((label, index) => {
    const monthRecords = records.filter((item) => item.date.startsWith(`${year}-${pad(index + 1)}`));
    const target = getMonthlyTarget(settings, year, index);
    const actual = getHoursSummary(monthRecords, target, false);
    const projected = getHoursSummary(monthRecords, target, true);
    return {
      label, target, actual, projected,
      workDays: monthRecords.filter((item) => item.planned && item.hours > 0).length,
      restDays: monthRecords.filter((item) => item.shift === "rest").length,
      leaveDays: monthRecords.filter((item) => item.shift === "leave").length,
      records: monthRecords,
    };
  }), [records, settings, year]);
  const totalProjected = yearly.reduce((sum, item) => sum + item.projected.totalHours, 0);
  const totalActual = yearly.reduce((sum, item) => sum + item.actual.totalHours, 0);
  const totalTarget = yearly.reduce((sum, item) => sum + item.target, 0);
  const totalOvertime = yearly.reduce((sum, item) => sum + item.projected.overtimeHours, 0);
  const totalActualOvertime = yearly.reduce((sum, item) => sum + item.actual.overtimeHours, 0);
  const totalWorkDays = yearly.reduce((sum, item) => sum + item.workDays, 0);
  const totalRestDays = yearly.reduce((sum, item) => sum + item.restDays, 0);
  const totalLeaveDays = yearly.reduce((sum, item) => sum + item.leaveDays, 0);
  const totalConfirmedDays = yearly.reduce((sum, item) => sum + item.records.filter(isAutomaticallyCompleted).length, 0);
  const maxHours = Math.max(1, ...yearly.map((item) => Math.max(item.target, item.projected.totalHours)));
  const annualScale = Math.max(totalTarget, totalProjected, 1);
  const annualBasicWidth = Math.min(100, totalTarget / annualScale * 100);
  const annualOvertimeWidth = Math.max(0, 100 - annualBasicWidth);
  const annualMarker = Math.min(98, Math.max(1, totalActual / annualScale * 100));
  const annualConfirmedWidth = Math.min(100, totalActual / annualScale * 100);
  const basicShare = totalProjected > 0 ? Math.min(totalProjected, totalTarget) / totalProjected * 100 : 0;
  const completedShare = totalProjected > 0 ? Math.min(100, totalActual / totalProjected * 100) : 0;

  return <div className="stats-page">
    <div className="stats-layout annual-dashboard">
      <section className="annual-hero">
        <div><p className="eyebrow">{year} 年预测</p><h2>全年预计总工时</h2><strong>{compactHours(totalProjected)}h</strong><small>预计基本工时合计 {compactHours(totalTarget)}h</small></div>
        <div className="annual-side"><span>预计加班</span><strong>{compactHours(totalOvertime)}h</strong><small>排班变化后自动重算</small></div>
      </section>

      <section className="annual-overview-card glass-panel">
        <div className="section-heading"><div><p className="eyebrow">全年仪表盘</p><h2>预计构成与实时进度</h2></div><span className="soft-badge">已确认 {compactHours(totalActual)}h</span></div>
        <div className="annual-overview-grid">
          <div className={`annual-donut ${totalProjected === 0 ? "empty" : ""}`} style={{ background: totalProjected === 0 ? undefined : `conic-gradient(#4388f5 0 ${basicShare}%, #8063e8 ${basicShare}% 100%)` }}>
            <div className="annual-inner-progress" style={{ background: `conic-gradient(#19b987 0 ${completedShare}%, rgba(255,255,255,.34) ${completedShare}% 100%)` }}>
              <div className="annual-donut-center"><strong>{Math.round(completedShare)}%</strong><span>已确认 {compactHours(totalActual)}h</span></div>
            </div>
          </div>
          <div className="annual-overview-detail">
            <div className="donut-legend"><div><i className="blue"/><span>基本工时区间<strong>{compactHours(Math.min(totalProjected, totalTarget))}h</strong></span></div><div><i className="violet"/><span>预测加班区间<strong>{compactHours(totalOvertime)}h</strong></span></div><div><i className="green"/><span>实时完成进度<strong>{compactHours(totalActual)}h · {Math.round(completedShare)}%</strong></span></div></div>
            <div className="annual-progress-numbers"><div><span>全年基本工时</span><strong>{compactHours(totalTarget)}h</strong></div><div><span>已确认加班</span><strong>{compactHours(totalActualOvertime)}h</strong></div><div><span>全年预计工时</span><strong>{compactHours(totalProjected)}h</strong></div></div>
          </div>
        </div>
        <div className="annual-phase-wrap">
          <div className="phase-copy"><span>基本工时 {compactHours(totalTarget)}h</span><strong>已完成 {Math.round(completedShare)}%</strong><span>加班工时 {compactHours(totalOvertime)}h</span></div>
          <div className="phase-track annual-phase-track"><i className="phase-basic" style={{ width: `${annualBasicWidth}%` }}/><i className="phase-overtime" style={{ width: `${annualOvertimeWidth}%` }}/><span className="phase-confirmed-fill" style={{ width: `${annualConfirmedWidth}%` }}/><b className="phase-marker" style={{ left: `${annualMarker}%` }}><Icon name="spark"/></b></div>
          <div className="phase-legend"><span><i className="blue"/>全年基本工时</span><span><i className="violet"/>预测加班</span><span><i className="green"/>已确认工时</span></div>
        </div>
      </section>

      <section className="chart-card glass-panel">
        <div className="section-heading"><div><p className="eyebrow">12 个月</p><h2>基本工时与预测加班</h2></div><div className="chart-legend"><span><i className="bar-blue"/>基本工时</span><span><i className="bar-violet"/>加班</span></div></div>
        <div className="bar-chart">{yearly.map((item, index) => {
          const total = item.projected.totalHours;
          const stackHeight = Math.max(2, (total / maxHours) * 100);
          const basicPart = total ? Math.min(total, item.target) / total * 100 : 100;
          const overtimePart = total ? item.projected.overtimeHours / total * 100 : 0;
          return <button key={item.label} className={index === month ? "selected" : ""} onClick={() => setDetailMonth(index)}>
            <span className="bar-value">{item.projected.overtimeHours > 0 ? `+${compactHours(item.projected.overtimeHours)}h` : "0h"}</span>
            <span className="bar-track"><span className="bar-stack" style={{ height: `${stackHeight}%` }}><i className="bar-overtime" style={{ height: `${overtimePart}%` }}/><i className="bar-basic" style={{ height: `${basicPart}%` }}/></span></span>
            <small>{index + 1}月</small>
          </button>;
        })}</div>
        <p className="chart-tip">点击任意月份，可查看该月的预计、确认和加班工时。</p>
      </section>

      <section className="annual-count-card glass-panel">
        <div className="section-heading"><div><p className="eyebrow">全年班次</p><h2>排班日数概览</h2></div><span className="soft-badge">当前月份 {month + 1} 月</span></div>
        <div className="month-counts"><div><strong>{totalWorkDays}</strong><span>上班天数</span></div><div><strong>{totalRestDays}</strong><span>休息天数</span></div><div><strong>{totalLeaveDays}</strong><span>请假天数</span></div><div><strong>{totalConfirmedDays}</strong><span>已确认班次</span></div></div>
      </section>
    </div>
    {detailMonth !== null && <MonthDetail year={year} month={detailMonth} item={yearly[detailMonth]} onClose={() => setDetailMonth(null)}/>} 
  </div>;
}

function MonthDetail({ year, month, item, onClose }: { year: number; month: number; item: { target: number; actual: ReturnType<typeof getHoursSummary>; projected: ReturnType<typeof getHoursSummary>; workDays: number; restDays: number; leaveDays: number }; onClose: () => void }) {
  return <div className="modal-backdrop detail-backdrop" onMouseDown={onClose}><section className="month-detail-card glass-panel" onMouseDown={(event) => event.stopPropagation()}>
    <div className="sheet-header"><div><p className="eyebrow">{year} 年</p><h2>{month + 1} 月工时概况</h2></div><button className="close-button" onClick={onClose}>×</button></div>
    <div className="detail-summary-grid"><div><span>预计基本工时</span><strong>{compactHours(item.target)}h</strong></div><div><span>已确认工时</span><strong>{compactHours(item.actual.totalHours)}h</strong></div><div><span>预计总工时</span><strong>{compactHours(item.projected.totalHours)}h</strong></div><div><span>预测加班</span><strong>{compactHours(item.projected.overtimeHours)}h</strong></div></div>
    <div className="month-counts compact three"><div><strong>{item.workDays}</strong><span>上班</span></div><div><strong>{item.restDays}</strong><span>休息</span></div><div><strong>{item.leaveDays}</strong><span>请假</span></div></div>
    <button className="primary-button detail-close" onClick={onClose}>知道了</button>
  </section></div>;
}

function SettingsView({ settings, setSettings, records, setRecords, activeYear }: { settings: Settings; setSettings: Dispatch<SetStateAction<Settings>>; records: DayRecord[]; setRecords: Dispatch<SetStateAction<DayRecord[]>>; activeYear: number }) {
  const [numberEditor, setNumberEditor] = useState<NumberEditorConfig | null>(null);
  const [shiftSystemOpen, setShiftSystemOpen] = useState(false);
  const [targetYear, setTargetYear] = useState(Math.min(TARGET_END_YEAR, Math.max(TARGET_START_YEAR, activeYear)));
  const [importMessage, setImportMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  function editNumber(key: EditableSettingKey, title: string, unit: string, value: number, min: number, step: number) { setNumberEditor({ key, title, unit, value, min, step }); }
  function saveNumber(value: number) {
    if (!numberEditor) return;
    if (numberEditor.target) setSettings((item) => ({ ...item, targets: { ...item.targets, [numberEditor.key]: value } }));
    else setSettings((item) => ({ ...item, [numberEditor.key]: value }));
    setNumberEditor(null);
  }
  function changeSystem(system: ShiftSystem) {
    setSettings((item) => ({ ...item, shiftSystem: system, cycle: cycleSystem(item.cycle, system) === system ? item.cycle : [] }));
    setShiftSystemOpen(false);
  }
  function resetYearTargets() {
    setSettings((item) => ({ ...item, targets: Object.fromEntries(Object.entries(item.targets).filter(([key]) => !key.startsWith(`${targetYear}-`))) }));
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify({ app: "shift-ledger", settings, records, exportedAt: new Date().toISOString(), version: 3 }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `工时簿备份-${dateKey(new Date())}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const nextRecords = normalizeRecords(parsed.records);
      if (!parsed.settings || !Array.isArray(parsed.records)) throw new Error("invalid");
      setSettings(normalizeSettings(parsed.settings as Record<string, unknown>)); setRecords(nextRecords); setImportMessage(`已导入 ${nextRecords.length} 天记录`);
    } catch { setImportMessage("导入失败：请选择工时簿导出的 JSON 备份"); }
    finally { if (importInput.current) importInput.current.value = ""; }
  }

  return <>
    <div className="settings-grid">
      <section className="glass-panel setting-card wide">
        <div className="section-heading shift-card-heading"><div><p className="eyebrow">班次</p><h2>倒班模式与默认时长</h2></div><div className={`shift-system-menu ${shiftSystemOpen ? "open" : ""}`}>
          <button className="shift-system-trigger" aria-expanded={shiftSystemOpen} onClick={() => setShiftSystemOpen((value) => !value)}><span>{settings.shiftSystem === "two" ? "两班倒" : "三班倒"}</span><Icon name="chevron"/></button>
          {shiftSystemOpen && <div className="shift-system-dropdown"><button className={settings.shiftSystem === "two" ? "active" : ""} onClick={() => changeSystem("two")}><span><strong>两班倒</strong><small>白班 / 夜班</small></span>{settings.shiftSystem === "two" && <b>✓</b>}</button><button className={settings.shiftSystem === "three" ? "active" : ""} onClick={() => changeSystem("three")}><span><strong>三班倒</strong><small>早班 / 中班 / 晚班</small></span>{settings.shiftSystem === "three" && <b>✓</b>}</button></div>}
        </div></div>
        <p className="setting-intro">这里决定每日记录和循环排班中显示的班次。切换不会改写已经发生的排班。</p>
        <div className="setting-row-grid">{settings.shiftSystem === "two" ? <>
          <SettingNumberRow label="白班" value={settings.dayHours} unit="小时" onClick={() => editNumber("dayHours", "白班默认时长", "小时", settings.dayHours, 0, .5)}/>
          <SettingNumberRow label="夜班" value={settings.nightHours} unit="小时" onClick={() => editNumber("nightHours", "夜班默认时长", "小时", settings.nightHours, 0, .5)}/>
        </> : <>
          <SettingNumberRow label="早班" value={settings.morningHours} unit="小时" onClick={() => editNumber("morningHours", "早班默认时长", "小时", settings.morningHours, 0, .5)}/>
          <SettingNumberRow label="中班" value={settings.middleHours} unit="小时" onClick={() => editNumber("middleHours", "中班默认时长", "小时", settings.middleHours, 0, .5)}/>
          <SettingNumberRow label="晚班" value={settings.lateHours} unit="小时" onClick={() => editNumber("lateHours", "晚班默认时长", "小时", settings.lateHours, 0, .5)}/>
        </>}</div>
        <SettingNumberRow label="日标准工时" value={settings.dailyStandard} unit="小时" onClick={() => editNumber("dailyStandard", "日标准工时", "小时", settings.dailyStandard, 0, .5)}/>
      </section>

      <section className="glass-panel setting-card wide target-explorer">
        <div className="section-heading"><div><p className="eyebrow">预计基本工时</p><h2>{targetYear} 年月度推算</h2></div><div className="target-year-switch"><button disabled={targetYear <= TARGET_START_YEAR} onClick={() => setTargetYear((value) => value - 1)}>‹</button><strong>{targetYear}</strong><button disabled={targetYear >= TARGET_END_YEAR} onClick={() => setTargetYear((value) => value + 1)}>›</button></div></div>
        <div className="target-grid">{MONTH_LABELS.map((label, index) => {
          const key = `${targetYear}-${pad(index + 1)}`;
          const value = getMonthlyTarget(settings, targetYear, index);
          const overridden = Number.isFinite(settings.targets[key]);
          return <button className={`target-number-button ${overridden ? "overridden" : ""}`} key={key} onClick={() => setNumberEditor({ key, target: true, title: `${targetYear} 年${label}基本工时`, unit: "小时", value, min: 0, step: 1 })}><span>{label}<small>{overridden ? "已修正" : "自动"}</small></span><strong>{compactHours(value)}<b>h</b></strong></button>;
        })}</div>
        <div className="target-explainer"><Icon name="spark"/><span><strong>自动推算规则</strong><small>周一至周五 × 日标准工时，并扣除落在工作日的 13 个法定节假日。未来年度调休和补班需等官方发布后手动修正。</small></span></div>
        <button className="secondary-button reset-targets" onClick={resetYearTargets}>恢复 {targetYear} 年自动推算</button>
      </section>

      <section className="glass-panel setting-card wide data-card">
        <div><p className="eyebrow">数据</p><h2>备份与恢复</h2><span>备份包含班次设置、循环规则、基本工时修正和每日记录。</span>{importMessage && <strong className={`import-message ${importMessage.startsWith("导入失败") ? "error" : ""}`}>{importMessage}</strong>}</div>
        <div className="data-actions"><button className="secondary-button" onClick={exportBackup}><Icon name="download"/>导出备份</button><button className="secondary-button" onClick={() => importInput.current?.click()}><Icon name="upload"/>导入备份</button><input ref={importInput} className="file-input" type="file" accept="application/json,.json" onChange={(event: ChangeEvent<HTMLInputElement>) => importBackup(event.target.files?.[0])}/></div>
      </section>
    </div>
    {numberEditor && <NumberEditorModal config={numberEditor} onClose={() => setNumberEditor(null)} onSave={saveNumber}/>} 
  </>;
}

function SettingNumberRow({ label, value, unit, onClick }: { label: string; value: number | string; unit: string; onClick: () => void }) {
  return <button className="setting-number-row" onClick={onClick}><span>{label}</span><strong>{typeof value === "number" ? compactHours(value) : value}<b>{unit}</b><i>›</i></strong></button>;
}

function NumberEditorModal({ config, onClose, onSave }: { config: NumberEditorConfig; onClose: () => void; onSave: (value: number) => void }) {
  const [text, setText] = useState(String(config.value));
  const parsed = Number(text); const valid = text.trim() !== "" && Number.isFinite(parsed) && parsed >= config.min;
  return <div className="modal-backdrop number-editor-backdrop" onMouseDown={onClose}><section className="number-editor-card glass-panel" onMouseDown={(event) => event.stopPropagation()}>
    <div className="sheet-header"><div><p className="eyebrow">修改设置</p><h2>{config.title}</h2></div><button className="close-button" onClick={onClose}>×</button></div>
    <label className="number-editor-input"><span>输入新数值</span><div><input autoFocus inputMode="decimal" type="text" value={text} onChange={(event) => setText(event.target.value.replace(/[^0-9.]/g, ""))}/><b>{config.unit}</b>{text && <button type="button" onClick={() => setText("")}>清空</button>}</div></label>
    <p className="number-editor-tip">内容可以完全清空后重新输入；确认后会立即刷新相关统计。</p>
    <div className="sheet-actions"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={!valid} onClick={() => valid && onSave(parsed)}>确定修改</button></div>
  </section></div>;
}

function DayEditor({ date, record, settings, onClose, onSave, onDelete }: { date: string; record?: DayRecord; settings: Settings; onClose: () => void; onSave: (record: DayRecord) => void; onDelete: () => void }) {
  const initial: DayRecord = record ? { ...record } : { date, shift: "rest", hours: 0, completed: false, planned: true };
  const [draft, setDraft] = useState(initial);
  const formatted = parseDate(date);
  const holiday = statutoryHolidayName(date);
  function selectShift(shift: ShiftType) {
    const hours = shift === "custom" ? draft.hours : getShiftHours(settings, shift);
    setDraft((item) => ({ ...item, shift, hours, planned: true }));
  }
  function selectHours(hours: number) { setDraft((item) => ({ ...item, hours, shift: item.shift === "rest" || item.shift === "leave" ? "custom" : item.shift, planned: true })); }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="bottom-sheet glass-panel" onMouseDown={(event) => event.stopPropagation()}>
    <div className="sheet-grabber"/>
    <div className="sheet-header"><div><p className="eyebrow">{date}</p><h2>{formatted.getMonth() + 1}月{formatted.getDate()}日 · 周{WEEKDAYS[(formatted.getDay() + 6) % 7]}</h2></div><button className="close-button" onClick={onClose}>×</button></div>
    {holiday && <div className="holiday-info"><span>法</span><div><strong>{holiday}</strong><small>系统已自动识别为法定节假日</small></div></div>}
    <div className={`shift-picker ${settings.shiftSystem === "three" ? "three-shift-picker" : ""}`}>{getEditorShifts(settings.shiftSystem).map((shift) => <button key={shift} className={`${draft.shift === shift ? "active" : ""} ${SHIFT_META[shift].className}`} onClick={() => selectShift(shift)}><span>{SHIFT_META[shift].short}</span>{SHIFT_META[shift].label}</button>)}</div>
    <div className="editor-grid">
      <label className="field"><span>工时</span><div><input type="number" step="0.5" min="0" value={draft.hours} onChange={(event) => setDraft((item) => ({ ...item, hours: Number(event.target.value) || 0, shift: item.shift === "rest" || item.shift === "leave" ? "custom" : item.shift }))}/><b>小时</b></div></label>
      <div className="quick-hour-group" aria-label="常用工时">{[8, 10, 10.5, 11, 11.5, 12].map((hours) => <button key={hours} className={draft.hours === hours ? "active" : ""} onClick={() => selectHours(hours)}>{hours}h</button>)}</div>
      <div className="auto-status"><Icon name="check"/><span><strong>自动计入实际</strong><small>到达当天后自动确认，无需手动操作</small></span></div>
      <label className="field note-field"><span>备注</span><input placeholder="例如：调班、迟到 1 小时…" value={draft.note ?? ""} onChange={(event) => setDraft((item) => ({ ...item, note: event.target.value }))}/></label>
    </div>
    <div className="sheet-actions"><button className="delete-button" onClick={onDelete}><Icon name="trash"/>删除为休息</button><button className="primary-button" onClick={() => onSave({ ...draft, planned: true })}>保存记录</button></div>
  </section></div>;
}

function BatchEditor({ dates, settings, onClose, onSave }: { dates: string[]; settings: Settings; onClose: () => void; onSave: (change: { shift: ShiftType; hours: number }) => void }) {
  const initialShift: ShiftType = settings.shiftSystem === "three" ? "morning" : "day";
  const [shift, setShift] = useState<ShiftType>(initialShift);
  const [hoursText, setHoursText] = useState(String(getShiftHours(settings, initialShift)));
  const hours = Number(hoursText); const valid = hoursText.trim() !== "" && Number.isFinite(hours) && hours >= 0;
  function selectShift(next: ShiftType) { setShift(next); if (next !== "custom") setHoursText(String(getShiftHours(settings, next))); }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="bottom-sheet batch-editor-sheet glass-panel" onMouseDown={(event) => event.stopPropagation()}>
    <div className="sheet-grabber"/><div className="sheet-header"><div><p className="eyebrow">批量修改 · {dates.length} 天</p><h2>统一设置所选日期</h2></div><button className="close-button" onClick={onClose}>×</button></div>
    <p className="batch-date-range">{dates[0]} 至 {dates[dates.length - 1]}，区间内日期将统一修改。</p>
    <div className={`shift-picker ${settings.shiftSystem === "three" ? "three-shift-picker" : ""}`}>{getEditorShifts(settings.shiftSystem).map((item) => <button key={item} className={`${shift === item ? "active" : ""} ${SHIFT_META[item].className}`} onClick={() => selectShift(item)}><span>{SHIFT_META[item].short}</span>{SHIFT_META[item].label}</button>)}</div>
    <label className="field batch-hours-field"><span>统一工时</span><div><input inputMode="decimal" type="text" value={hoursText} onChange={(event) => setHoursText(event.target.value.replace(/[^0-9.]/g, ""))}/><b>小时</b></div></label>
    <div className="quick-hour-group" aria-label="常用工时">{[8, 10, 10.5, 11, 11.5, 12].map((item) => <button key={item} className={hours === item ? "active" : ""} onClick={() => { setHoursText(String(item)); if (shift === "rest" || shift === "leave") setShift("custom"); }}>{item}h</button>)}</div>
    <div className="warning-note"><Icon name="spark"/><span>本次只覆盖所选区间的班次和工时，其他日期不会改变。</span></div>
    <div className="sheet-actions"><button className="secondary-button" onClick={onClose}>返回选择</button><button className="primary-button" disabled={!valid} onClick={() => valid && onSave({ shift, hours })}>确认修改 {dates.length} 天</button></div>
  </section></div>;
}

function ScheduleGenerator({ settings, year, onClose, onGenerate }: { settings: Settings; year: number; onClose: () => void; onGenerate: (cycle: ShiftType[], cycleStart: string) => void }) {
  const initialSystem = cycleSystem(settings.cycle, settings.shiftSystem);
  const [system, setSystem] = useState<ShiftSystem>(initialSystem);
  const [cycle, setCycle] = useState<ShiftType[]>(settings.cycle);
  const currentDate = dateKey(new Date());
  const [cycleStart, setCycleStart] = useState(currentDate.startsWith(`${year}-`) ? currentDate : `${year}-01-01`);
  const generatorShifts: ShiftType[] = system === "three" ? ["morning", "middle", "late", "rest"] : ["day", "night", "rest"];
  function addShift(shift: ShiftType) { setCycle((items) => items.length < 31 ? [...items, shift] : items); }
  function changeSystem(next: ShiftSystem) {
    setSystem(next);
    setCycle((items) => cycleSystem(items, next) === next ? items : []);
  }
  function chooseTemplate(template: typeof CYCLE_TEMPLATES[number]) { setCycle([...template.cycle]); setSystem(cycleSystem(template.cycle)); }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="dialog-card glass-panel" onMouseDown={(event) => event.stopPropagation()}>
    <div className="sheet-header"><div><p className="eyebrow">新循环排班</p><h2>从指定日期向后更新</h2></div><button className="close-button" onClick={onClose}>×</button></div>
    <div className="generator-system"><span>班次模式</span><div><button className={system === "two" ? "active" : ""} onClick={() => changeSystem("two")}>两班倒<small>白 / 夜</small></button><button className={system === "three" ? "active" : ""} onClick={() => changeSystem("three")}>三班倒<small>早 / 中 / 晚</small></button></div></div>
    <div className="cycle-builder-head"><span>当前循环 · {cycle.length} 天</span><div><button className="builder-action" onClick={() => setCycle((items) => items.slice(0, -1))} disabled={!cycle.length}><b>↶</b>撤销一步</button><button className="builder-action danger" onClick={() => setCycle([])} disabled={!cycle.length}>清空循环</button></div></div>
    <div className="cycle-visual custom-cycle">{cycle.length ? cycle.map((shift, index) => <span key={`${shift}-${index}`} className={shift}><small>{index + 1}</small>{SHIFT_META[shift].short}</span>) : <p>请在下方依次添加班次</p>}</div>
    <div className={`cycle-controls ${system === "three" ? "three-cycle-controls" : ""}`}>{generatorShifts.map((shift) => <button key={shift} className={SHIFT_META[shift].className} onClick={() => addShift(shift)}><b>＋ {SHIFT_META[shift].short}</b><span>{SHIFT_META[shift].label}{getShiftHours(settings, shift) ? ` ${getShiftHours(settings, shift)}h` : ""}</span></button>)}</div>
    <p className="dialog-copy">按点击顺序组成一个循环。这里只会从生效日向后覆盖到年底，生效日前的排班和手动修改全部保留。</p>
    <div className="cycle-template-head compact"><span>常用模板</span><small>快速替换当前循环</small></div>
    <div className="cycle-template-grid compact">{CYCLE_TEMPLATES.map((template) => { const active = cycle.length === template.cycle.length && cycle.every((item, index) => item === template.cycle[index]); return <button key={template.id} className={active ? "active" : ""} onClick={() => chooseTemplate(template)}><strong>{template.name}</strong><small>{template.caption}</small></button>; })}</div>
    <label className="field"><span>新循环生效日（第 1 天）</span><div><input type="date" min={`${year}-01-01`} max={`${year}-12-31`} value={cycleStart} onChange={(event) => setCycleStart(event.target.value)}/></div></label>
    <div className="warning-note"><Icon name="spark"/><span>{cycleStart} 之前的记录不会改变；当天及之后将按新循环重新生成，并同步设置中的倒班模式。</span></div>
    <div className="sheet-actions generator-actions"><button className="secondary-button" onClick={onClose}>稍后</button><button className="primary-button" disabled={!cycle.length || !cycleStart} onClick={() => onGenerate(cycle, cycleStart)}>从生效日开始生成</button></div>
  </section></div>;
}

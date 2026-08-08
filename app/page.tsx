"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  CSSProperties,
  ReactNode,
  TouchEvent as ReactTouchEvent,
} from "react";
import { Solar } from "lunar-typescript";
import {
  DATA_VERSION,
  STORAGE_DATA,
  STORAGE_LEGACY_RECORDS,
  STORAGE_LEGACY_SETTINGS,
  SHIFT_COLORS,
  TAG_COLORS,
  applyCareerPreset,
  calculateOvertime,
  calculateShiftDuration,
  createDefaultData,
  makeId,
  materializeCycleYear,
  migrateLegacyData,
  normalizeAppData,
  replaceCycleFromDate,
  type ActiveCycle,
  type AppData,
  type CareerPreset,
  type CycleTemplate,
  type DayRecord,
  type DutyTag,
  type Shift,
  type StatisticsPeriod,
  type WorkSystem,
} from "./lib/schedule";

type View = "calendar" | "stats" | "settings";
type EntityEditor =
  | { type: "shift"; value?: Shift }
  | { type: "tag"; value?: DutyTag }
  | null;

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_LABELS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];
const CAREERS: { id: CareerPreset; name: string; detail: string }[] = [
  { id: "manufacturing", name: "制造业 / 半导体", detail: "白夜班与连续倒班" },
  { id: "medical", name: "医疗护理", detail: "白班、小夜、大夜与职责标签" },
  { id: "transport", name: "交通运输", detail: "铁路、地铁、机场等" },
  { id: "safety", name: "公共安全", detail: "安保、消防与值守" },
  { id: "service", name: "服务业", detail: "酒店、物流与轮值" },
  { id: "custom", name: "其他 / 自定义", detail: "从自己的班次开始" },
];
const CAREER_FEATURES: Record<CareerPreset, string[]> = {
  manufacturing: ["白夜轮换", "12 小时班", "综合工时"],
  medical: ["大小夜班", "责班 / 门诊示例", "职责标签"],
  transport: ["早中晚班", "连续轮值", "自定义循环"],
  safety: ["白夜值守", "备班标签", "连续倒班"],
  service: ["早中晚班", "灵活轮值", "自定义班次"],
  custom: ["从零开始", "完全自定义", "不限制功能"],
};
const SYSTEM_LABELS: Record<WorkSystem, string> = {
  standard: "标准工时",
  comprehensive: "综合计算工时",
  irregular: "不定时工时",
  custom: "自定义",
  manual: "不清楚 / 仅手动记录",
};
const PERIOD_LABELS: Record<StatisticsPeriod, string> = {
  week: "周",
  month: "月",
  quarter: "季度",
  halfYear: "半年",
  year: "年度",
  custom: "自定义周期（暂按年度）",
};

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
function compactHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function compactClock(time: string, asEnd = false) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  if (asEnd && hour === 0 && minute === 0) return "24";
  return compactHours(Math.round((hour + minute / 60) * 2) / 2);
}
function compactShiftRange(shift: Shift) {
  if (!shift.startTime || !shift.endTime) return "";
  const endAs24 = !shift.crossesMidnight && shift.startTime !== "00:00";
  return `${compactClock(shift.startTime)}~${compactClock(shift.endTime, endAs24)}`;
}
function fullShiftRange(shift: Shift) {
  if (!shift.startTime || !shift.endTime) return "";
  return `${shift.startTime}–${shift.endTime}`;
}
function orderedShifts(shifts: Shift[]) {
  const order = [
    "shift-day",
    "shift-night",
    "shift-rest",
    "shift-leave",
    "shift-morning",
    "shift-middle",
    "shift-late",
    "shift-small-night",
    "shift-big-night",
    "shift-medical-duty",
    "shift-medical-clinic",
    "shift-standby",
  ];
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...shifts].sort(
    (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99),
  );
}
function getCalendarDays(year: number, month: number) {
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(leading).fill(null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
}
function inclusiveDateRange(first: string, second: string) {
  const start = parseDate(first < second ? first : second);
  const end = parseDate(first < second ? second : first);
  const dates: string[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  )
    dates.push(dateKey(cursor));
  return dates;
}
function colorStyle(color: string) {
  return { "--entity-color": color } as CSSProperties;
}

function statutoryHolidayName(key: string) {
  const date = parseDate(key);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 1 && day === 1) return "元旦";
  if (month === 5 && (day === 1 || day === 2)) return "劳动节";
  if (month === 10 && day >= 1 && day <= 3) return "国庆节";
  const lunar = Solar.fromYmd(date.getFullYear(), month, day).getLunar();
  if (lunar.getMonth() === 1 && lunar.getDay() >= 1 && lunar.getDay() <= 3)
    return "春节";
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const nextLunar = Solar.fromYmd(
    next.getFullYear(),
    next.getMonth() + 1,
    next.getDate(),
  ).getLunar();
  if (nextLunar.getMonth() === 1 && nextLunar.getDay() === 1) return "除夕";
  if (lunar.getJieQi() === "清明") return "清明节";
  if (lunar.getMonth() === 5 && lunar.getDay() === 5) return "端午节";
  if (lunar.getMonth() === 8 && lunar.getDay() === 15) return "中秋节";
  return "";
}
function statutoryHolidayShortName(name: string) {
  return (
    (
      {
        劳动节: "劳动",
        国庆节: "国庆",
        清明节: "清明",
        端午节: "端午",
        中秋节: "中秋",
      } as Record<string, string>
    )[name] ?? name
  );
}
function estimateMonthlyTarget(
  year: number,
  month: number,
  dailyStandard: number,
) {
  let workdays = 0;
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6 && !statutoryHolidayName(dateKey(cursor)))
      workdays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return workdays * dailyStandard;
}
function getMonthlyTarget(data: AppData, year: number, month: number) {
  const key = `${year}-${pad(month + 1)}`;
  const override = data.targets[key];
  return Number.isFinite(override)
    ? override
    : estimateMonthlyTarget(
        year,
        month,
        data.work.system === "comprehensive" ? 8 : data.work.dailyStandard,
      );
}
function getAnnualTarget(data: AppData, year: number) {
  return MONTH_LABELS.reduce(
    (sum, _, month) => sum + getMonthlyTarget(data, year, month),
    0,
  );
}
function getPeriodOvertime(records: DayRecord[], data: AppData, year: number) {
  if (data.work.system === "custom" && data.work.customRule === "monthly")
    return MONTH_LABELS.reduce((sum, _, month) => {
      const monthRecords = records.filter((record) =>
        record.date.startsWith(`${year}-${pad(month + 1)}`),
      );
      return sum + calculateOvertime(monthRecords, data.work, 0);
    }, 0);
  if (data.work.system !== "comprehensive")
    return calculateOvertime(records, data.work, getAnnualTarget(data, year));
  if (data.work.period === "month")
    return MONTH_LABELS.reduce((sum, _, month) => {
      const monthRecords = records.filter((record) =>
        record.date.startsWith(`${year}-${pad(month + 1)}`),
      );
      return (
        sum +
        calculateOvertime(
          monthRecords,
          data.work,
          getMonthlyTarget(data, year, month),
        )
      );
    }, 0);
  if (data.work.period === "quarter" || data.work.period === "halfYear") {
    const size = data.work.period === "quarter" ? 3 : 6;
    let overtime = 0;
    for (let start = 0; start < 12; start += size) {
      const periodRecords = records.filter((record) => {
        const month = Number(record.date.slice(5, 7)) - 1;
        return month >= start && month < start + size;
      });
      const target = Array.from({ length: size }, (_, offset) =>
        getMonthlyTarget(data, year, start + offset),
      ).reduce((sum, value) => sum + value, 0);
      overtime += calculateOvertime(periodRecords, data.work, target);
    }
    return overtime;
  }
  if (data.work.period === "week")
    return calculateOvertime(
      records,
      {
        ...data.work,
        system: "standard",
        standardDailyEnabled: false,
        standardWeeklyEnabled: true,
      },
      0,
    );
  return calculateOvertime(records, data.work, getAnnualTarget(data, year));
}

function completedByDate(records: DayRecord[], todayKey: string) {
  return records.filter(
    (record) => record.planned && (record.completed || record.date < todayKey),
  );
}

function comprehensiveScopeForMonth(
  data: AppData,
  year: number,
  month: number,
  records: DayRecord[],
  todayKey: string,
) {
  let startMonth = month;
  let endMonth = month;
  let label = `${month + 1}月`;
  if (data.work.period === "quarter") {
    startMonth = Math.floor(month / 3) * 3;
    endMonth = startMonth + 2;
    label = `第 ${Math.floor(month / 3) + 1} 季度`;
  } else if (data.work.period === "halfYear") {
    startMonth = month < 6 ? 0 : 6;
    endMonth = startMonth + 5;
    label = startMonth === 0 ? "上半年" : "下半年";
  } else if (data.work.period === "year" || data.work.period === "custom") {
    startMonth = 0;
    endMonth = 11;
    label = data.work.period === "year" ? `${year}年度` : `${year}年自定义周期`;
  }
  const scoped = records.filter((record) => {
    const recordMonth = Number(record.date.slice(5, 7)) - 1;
    return (
      record.date.startsWith(`${year}-`) &&
      recordMonth >= startMonth &&
      recordMonth <= endMonth
    );
  });
  if (data.work.period === "week") {
    const monthRecords = records.filter((record) =>
      record.date.startsWith(`${year}-${pad(month + 1)}`),
    );
    const weeklySettings = {
      ...data.work,
      system: "standard" as const,
      standardDailyEnabled: false,
      standardWeeklyEnabled: true,
    };
    return {
      label: `${month + 1}月各周`,
      projected: calculateOvertime(monthRecords, weeklySettings, 0),
      actual: calculateOvertime(
        completedByDate(monthRecords, todayKey),
        weeklySettings,
        0,
      ),
    };
  }
  const target = Array.from({ length: endMonth - startMonth + 1 }, (_, index) =>
    getMonthlyTarget(data, year, startMonth + index),
  ).reduce((sum, value) => sum + value, 0);
  return {
    label,
    projected: calculateOvertime(scoped, data.work, target),
    actual: calculateOvertime(
      completedByDate(scoped, todayKey),
      data.work,
      target,
    ),
  };
}

function overtimeForCalendarMonth(
  data: AppData,
  year: number,
  month: number,
  monthRecords: DayRecord[],
  yearRecords: DayRecord[],
  todayKey: string,
) {
  if (!data.work.trackHours || !data.work.trackOvertime)
    return { label: "", projected: 0, actual: 0 };
  if (data.work.system === "comprehensive")
    return comprehensiveScopeForMonth(data, year, month, yearRecords, todayKey);
  const target = getMonthlyTarget(data, year, month);
  return {
    label: `${month + 1}月`,
    projected: calculateOvertime(monthRecords, data.work, target),
    actual: calculateOvertime(
      completedByDate(monthRecords, todayKey),
      data.work,
      target,
    ),
  };
}

function canAllocateOvertimeByMonth(data: AppData) {
  return (
    data.work.trackOvertime &&
    (data.work.system !== "comprehensive" ||
      data.work.period === "month" ||
      data.work.period === "week")
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    calendar: (
      <>
        <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01" />
      </>
    ),
    stats: (
      <>
        <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),
    spark: (
      <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M5 14v6h14v-6" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v12m0 0-5-5m5 5 5-5" />
        <path d="M5 20h14" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    tag: <path d="M20 13 13 20l-9-9V4h7l9 9ZM8 8h.01" />,
    edit: (
      <>
        <path d="m4 16-.8 4 4-.8L18 8.4 14.6 5 4 16Z" />
        <path d="m12.8 6.8 3.4 3.4" />
      </>
    ),
  };
  return (
    <svg
      className="app-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const [view, setView] = useState<View>("calendar");
  const [data, setData] = useState<AppData>(createDefaultData);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const modern = window.localStorage.getItem(STORAGE_DATA);
        if (modern)
          setData(
            materializeCycleYear(
              normalizeAppData(JSON.parse(modern)),
              today.getFullYear(),
            ),
          );
        else {
          const legacySettings = window.localStorage.getItem(
            STORAGE_LEGACY_SETTINGS,
          );
          const legacyRecords = window.localStorage.getItem(
            STORAGE_LEGACY_RECORDS,
          );
          setData(
            materializeCycleYear(
              migrateLegacyData(
                legacySettings ? JSON.parse(legacySettings) : undefined,
                legacyRecords ? JSON.parse(legacyRecords) : [],
              ),
              today.getFullYear(),
            ),
          );
        }
      } catch {
        setData(createDefaultData());
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [today]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
  }, [data, ready]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthKey = `${year}-${pad(month + 1)}`;
  const monthRecords = useMemo(
    () => data.records.filter((record) => record.date.startsWith(monthKey)),
    [data.records, monthKey],
  );
  const shifts = useMemo(
    () => new Map(data.shifts.map((shift) => [shift.id, shift])),
    [data.shifts],
  );
  const tags = useMemo(
    () => new Map(data.tags.map((tag) => [tag.id, tag])),
    [data.tags],
  );
  function notify(message = "已保存") {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }
  function changeMonth(delta: number) {
    setSelectedMonth((value) => {
      const next = new Date(value.getFullYear(), value.getMonth() + delta, 1);
      setData((current) => materializeCycleYear(current, next.getFullYear()));
      return next;
    });
  }
  function goToCurrentMonth() {
    const next = new Date(today.getFullYear(), today.getMonth(), 1);
    setData((current) => materializeCycleYear(current, next.getFullYear()));
    setSelectedMonth(next);
  }
  function saveRecord(record: DayRecord) {
    setData((current) => ({
      ...current,
      records: [
        ...current.records.filter((item) => item.date !== record.date),
        record,
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    notify();
  }
  function setRest(date: string) {
    const rest = data.shifts.find((shift) => shift.isRest) ?? data.shifts[0];
    if (!rest) return;
    saveRecord({
      date,
      shiftId: rest.id,
      hours: 0,
      tagIds: [],
      completed: false,
      planned: true,
      source: "manual",
    });
    setSelectedDate(null);
  }
  function toggleBatchDate(key: string) {
    if (!batchDates.length) setBatchDates([key]);
    else {
      setBatchDates(inclusiveDateRange(batchDates[0], key));
      setShowBatchEditor(true);
    }
  }
  function updateBatchRecords(shiftId: string, hours: number) {
    const selected = new Set(batchDates);
    const updates = batchDates.map((date) => ({
      date,
      shiftId,
      hours,
      tagIds: [],
      planned: true,
      completed: false,
      source: "manual" as const,
    }));
    setData((current) => ({
      ...current,
      records: [
        ...current.records.filter((record) => !selected.has(record.date)),
        ...updates,
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setShowBatchEditor(false);
    setBatchMode(false);
    setBatchDates([]);
    notify(`已修改 ${updates.length} 天`);
  }
  function activateCycle(cycle: ActiveCycle, saveTemplate: boolean) {
    setData((current) => {
      let next = replaceCycleFromDate(
        current,
        cycle,
        Math.max(year, Number(cycle.startDate.slice(0, 4))),
      );
      if (
        saveTemplate &&
        !next.cycleTemplates.some(
          (template) =>
            template.name === cycle.name &&
            template.shiftIds.join() === cycle.shiftIds.join(),
        )
      )
        next = {
          ...next,
          cycleTemplates: [
            ...next.cycleTemplates,
            {
              id: makeId("template"),
              name: cycle.name,
              caption: cycle.shiftIds
                .map(
                  (id) =>
                    current.shifts.find((shift) => shift.id === id)
                      ?.shortName ?? "?",
                )
                .join(" "),
              shiftIds: cycle.shiftIds,
              category: "custom",
              builtIn: false,
            },
          ],
        };
      return next;
    });
    setShowGenerator(false);
    notify("新循环已生效");
  }
  const navItems: { id: View; label: string; icon: string }[] = [
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
        <div className="brand-mark">
          <Icon name="spark" />
        </div>
        <div className="brand-copy">
          <strong>循环班表</strong>
          <span>不按星期工作的个人班表</span>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">
                <Icon name={item.icon} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="privacy-note">
          <span>●</span> 数据仅保存在本机
        </div>
      </aside>
      <section className="content-wrap">
        <header className="topbar">
          <div>
            <p className="eyebrow">我的循环班表</p>
            <h1>
              {view === "calendar"
                ? "排班日历"
                : view === "stats"
                  ? "班表统计"
                  : "排班设置"}
            </h1>
          </div>
          {view !== "settings" && (
            <div className="month-switch glass-control">
              <button aria-label="上个月" onClick={() => changeMonth(-1)}>
                ‹
              </button>
              <button
                aria-label="回到本月"
                className="current-month"
                onClick={goToCurrentMonth}
              >
                {year}年{month + 1}月
              </button>
              <button aria-label="下个月" onClick={() => changeMonth(1)}>
                ›
              </button>
            </div>
          )}
        </header>
        {view === "calendar" && (
          <CalendarView
            year={year}
            month={month}
            data={data}
            records={monthRecords}
            shifts={shifts}
            tags={tags}
            todayKey={todayKey}
            onOpenDate={setSelectedDate}
            onGenerate={() => setShowGenerator(true)}
            batchMode={batchMode}
            batchDates={batchDates}
            onToggleBatchMode={() => {
              setBatchMode((value) => !value);
              setBatchDates([]);
            }}
            onToggleBatchDate={toggleBatchDate}
            onChangeMonth={changeMonth}
          />
        )}
        {view === "stats" && (
          <StatsView
            year={year}
            month={month}
            data={data}
            todayKey={todayKey}
          />
        )}
        {view === "settings" && (
          <SettingsView
            data={data}
            setData={setData}
            activeYear={year}
            onOpenGenerator={() => setShowGenerator(true)}
            notify={notify}
          />
        )}
      </section>
      <nav className="bottom-nav glass-panel">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => setView(item.id)}
          >
            <span>
              <Icon name={item.icon} />
            </span>
            {item.label}
          </button>
        ))}
      </nav>
      {selectedDate && (
        <DayEditor
          date={selectedDate}
          record={data.records.find((record) => record.date === selectedDate)}
          data={data}
          onClose={() => setSelectedDate(null)}
          onSave={(record) => {
            saveRecord(record);
            setSelectedDate(null);
          }}
          onRest={() => setRest(selectedDate)}
        />
      )}
      {showGenerator && (
        <ScheduleGenerator
          data={data}
          initialYear={year}
          onClose={() => setShowGenerator(false)}
          onGenerate={activateCycle}
        />
      )}
      {showBatchEditor && (
        <BatchEditor
          dates={batchDates}
          data={data}
          onClose={() => {
            setShowBatchEditor(false);
            setBatchDates([]);
          }}
          onSave={updateBatchRecords}
        />
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" /> {toast}
        </div>
      )}
    </main>
  );
}

function CalendarView({
  year,
  month,
  data,
  records,
  shifts,
  tags,
  todayKey,
  onOpenDate,
  onGenerate,
  batchMode,
  batchDates,
  onToggleBatchMode,
  onToggleBatchDate,
  onChangeMonth,
}: {
  year: number;
  month: number;
  data: AppData;
  records: DayRecord[];
  shifts: Map<string, Shift>;
  tags: Map<string, DutyTag>;
  todayKey: string;
  onOpenDate: (key: string) => void;
  onGenerate: () => void;
  batchMode: boolean;
  batchDates: string[];
  onToggleBatchMode: () => void;
  onToggleBatchDate: (key: string) => void;
  onChangeMonth: (delta: number) => void;
}) {
  const recordMap = useMemo(
    () => new Map(records.map((record) => [record.date, record])),
    [records],
  );
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [monthMotion, setMonthMotion] = useState("");
  const workRecords = records.filter(
    (record) => shifts.get(record.shiftId)?.countsAsWork,
  );
  const restDays = records.filter(
    (record) => shifts.get(record.shiftId)?.isRest,
  ).length;
  const completed = completedByDate(workRecords, todayKey);
  const projectedHours = workRecords.reduce(
    (sum, record) => sum + record.hours,
    0,
  );
  const actualHours = completed.reduce((sum, record) => sum + record.hours, 0);
  const monthlyBasicHours = getMonthlyTarget(data, year, month);
  const yearWorkRecords = data.records.filter(
    (record) =>
      record.date.startsWith(`${year}-`) &&
      shifts.get(record.shiftId)?.countsAsWork,
  );
  const overtimeSummary = overtimeForCalendarMonth(
    data,
    year,
    month,
    workRecords,
    yearWorkRecords,
    todayKey,
  );
  const upcoming = records.find(
    (record) =>
      record.date >= todayKey && shifts.get(record.shiftId)?.countsAsWork,
  );
  function touchStartHandler(event: ReactTouchEvent<HTMLElement>) {
    if (event.touches.length === 1 && !batchMode)
      touchStart.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
  }
  function touchEndHandler(event: ReactTouchEvent<HTMLElement>) {
    if (!touchStart.current || batchMode) return;
    const dx = event.changedTouches[0].clientX - touchStart.current.x;
    const dy = event.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      const direction = dx < 0 ? 1 : -1;
      setMonthMotion(direction > 0 ? "slide-out-left" : "slide-out-right");
      window.setTimeout(() => {
        onChangeMonth(direction);
        setMonthMotion(direction > 0 ? "slide-in-right" : "slide-in-left");
        window.setTimeout(() => setMonthMotion(""), 170);
      }, 120);
    }
  }
  return (
    <div className="calendar-page">
      <div className="calendar-layout">
        <section
          className="calendar-panel glass-panel"
          onTouchStart={touchStartHandler}
          onTouchEnd={touchEndHandler}
        >
          <div className="calendar-toolbar">
            <div>
              <span className="year-pill">{year}</span>
              <h2>{MONTH_LABELS[month]}</h2>
            </div>
            <div className="calendar-actions">
              <button
                className={`secondary-small ${batchMode ? "exit-multi" : ""}`}
                onClick={onToggleBatchMode}
              >
                {batchMode ? "退出多选" : "批量修改"}
              </button>
              <button className="primary-small" onClick={onGenerate}>
                <Icon name="spark" /> 循环排班
              </button>
            </div>
          </div>
          {batchMode && (
            <div className="batch-selection-bar">
              <span>
                <strong>
                  {batchDates.length
                    ? `起点：${batchDates[0]}`
                    : "请选择起始日期"}
                </strong>
                <small>
                  {batchDates.length
                    ? "再选截止日，将选择整个区间"
                    : "单日修改不会影响后续循环"}
                </small>
              </span>
            </div>
          )}
          <div className={`calendar-month-stage ${monthMotion}`}>
            <div className="weekday-row">
              {WEEKDAYS.map((day, index) => (
                <span key={day} className={index > 4 ? "weekend" : ""}>
                  周{day}
                </span>
              ))}
            </div>
            <div className="calendar-grid">
              {getCalendarDays(year, month).map((day, index) => {
                if (!day)
                  return (
                    <span className="calendar-spacer" key={`blank-${index}`} />
                  );
                const key = `${year}-${pad(month + 1)}-${pad(day)}`;
                const record = recordMap.get(key);
                const shift = record ? shifts.get(record.shiftId) : undefined;
                const visibleTags =
                  record?.tagIds
                    .map((id) => tags.get(id))
                    .filter((tag): tag is DutyTag => Boolean(tag)) ?? [];
                const holiday = data.display.showHolidays
                  ? statutoryHolidayName(key)
                  : "";
                const selected = batchDates.includes(key);
                const selectedIndex = batchDates.indexOf(key);
                const completedDay = Boolean(
                  record &&
                    shift?.countsAsWork &&
                    (record.completed || key < todayKey),
                );
                const timeRange = shift ? fullShiftRange(shift) : "";
                const hasVisibleAssignment = Boolean(
                  shift &&
                    (data.display.showShift ||
                      data.display.showTags ||
                      data.display.showShiftTime ||
                      (data.display.showHours &&
                        data.work.trackHours &&
                        shift.countsAsWork &&
                        !shift.isRest)),
                );
                const ariaParts = [
                  `${month + 1}月${day}日`,
                  holiday,
                  shift?.name,
                  ...visibleTags.map((tag) => tag.name),
                ].filter(Boolean);
                return (
                  <button
                    aria-label={ariaParts.join("，")}
                    key={key}
                    className={`calendar-day ${key === todayKey ? "today" : ""} ${selected ? "batch-selected" : ""}`}
                    onClick={() =>
                      batchMode ? onToggleBatchDate(key) : onOpenDate(key)
                    }
                  >
                    <span className="calendar-date-row">
                      <span className="day-number">{day}</span>
                      <span className="calendar-day-badges">
                        {completedDay && (
                          <i className="complete-dot" title="已自动计入" />
                        )}
                        {holiday && (
                          <small className="holiday-flag">
                            法·{statutoryHolidayShortName(holiday)}
                          </small>
                        )}
                      </span>
                    </span>
                    {batchMode && (
                      <span
                        className={`batch-check ${selected ? "" : "pending"}`}
                      >
                        {selectedIndex === 0
                          ? "始"
                          : selectedIndex === batchDates.length - 1 &&
                              batchDates.length > 1
                            ? "止"
                            : selected
                              ? "✓"
                              : ""}
                      </span>
                    )}
                    {shift && hasVisibleAssignment ? (
                      <span className="schedule-cell-content">
                        {data.display.showShiftTime && timeRange && (
                          <small className="schedule-cell-time">
                            {timeRange}
                          </small>
                        )}
                        {data.display.showTags && visibleTags.length > 0 && (
                          <span className="schedule-cell-tags">
                            {visibleTags.slice(0, 2).map((tag) => (
                              <em key={tag.id} style={colorStyle(tag.color)}>
                                {tag.shortName}
                              </em>
                            ))}
                            {visibleTags.length > 2 && (
                              <em>+{visibleTags.length - 2}</em>
                            )}
                          </span>
                        )}
                        <span
                          className={`schedule-cell-shift ${shift.isRest ? "is-rest" : ""}`}
                          style={colorStyle(shift.color)}
                        >
                          {data.display.showShift && <b>{shift.shortName}</b>}
                          {data.display.showHours &&
                            data.work.trackHours &&
                            shift.countsAsWork &&
                            !shift.isRest &&
                            record && (
                              <em>{compactHours(record.hours)}h</em>
                            )}
                        </span>
                      </span>
                    ) : record ? (
                      <span
                        className="calendar-record-dot"
                        style={{ background: shift?.color }}
                      />
                    ) : (
                      <span className="add-day">＋</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="swipe-hint">‹ 左右滑动切换月份 ›</p>
        </section>
      </div>
      {upcoming && shifts.get(upcoming.shiftId) ? (
        <button
          className="next-shift calendar-next-shift glass-panel"
          onClick={() => onOpenDate(upcoming.date)}
        >
          <span
            className="shift-orb entity-orb"
            style={colorStyle(shifts.get(upcoming.shiftId)!.color)}
          >
            {shifts.get(upcoming.shiftId)!.shortName}
          </span>
          <span>
            <strong>下一班 · {shifts.get(upcoming.shiftId)!.name}</strong>
            <small>
              {upcoming.date}
              {data.work.trackHours
                ? ` · ${compactHours(upcoming.hours)} 小时`
                : ""}
            </small>
          </span>
          <b>›</b>
        </button>
      ) : (
        <div className="empty-schedule-note calendar-next-shift glass-panel">
          <Icon name="calendar" />
          <span>
            <strong>本月暂无后续班次</strong>
            <small>可逐日添加，或使用循环排班。</small>
          </span>
        </div>
      )}
      <section className="month-outlook glass-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">本月展望</p>
            <h2>{data.work.trackHours ? "排班与累计工时" : "我的班表"}</h2>
          </div>
          <span className="soft-badge">{workRecords.length} 个工作日</span>
        </div>
        <div className="outlook-metrics dynamic-metrics">
          <MetricCard
            label="计划工作日"
            value={`${workRecords.length}天`}
            detail={`${restDays} 个休息日`}
            tone="blue"
          />
          <MetricCard
            label="已完成班次"
            value={`${completed.length}天`}
            detail={`剩余 ${Math.max(0, workRecords.length - completed.length)} 个班次`}
            tone="green"
          />
          {data.work.trackHours && (
            <MetricCard
              label="本月计划工时"
              value={`${compactHours(projectedHours)}h`}
              detail={`基本工时 ${compactHours(monthlyBasicHours)}h · 已完成 ${compactHours(actualHours)}h`}
              tone="violet"
            />
          )}
          {data.work.trackHours && data.work.trackOvertime && (
            <MetricCard
              label={
                data.work.system === "comprehensive"
                  ? "本周期额外工时"
                  : "本月额外工时"
              }
              value={`${compactHours(overtimeSummary.projected)}h`}
              detail={`${overtimeSummary.label} · 已确认 ${compactHours(overtimeSummary.actual)}h`}
              tone="orange"
            />
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className={`metric-card glass-panel tone-${tone}`}>
      <i className="metric-glow" />
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AnnualRing({
  target,
  actual,
  overtime,
  actualOvertime,
}: {
  target: number;
  actual: number;
  overtime: number;
  actualOvertime: number;
}) {
  const chartTotal = Math.max(1, target + overtime);
  const targetShare = (target / chartTotal) * 100;
  const overtimeShare = Math.max(0, 100 - targetShare);
  const confirmedOvertime = Math.min(overtime, actualOvertime);
  const confirmedBasic = Math.min(
    target,
    Math.max(0, actual - confirmedOvertime),
  );
  const basicProgress = (confirmedBasic / chartTotal) * 100;
  const overtimeProgress = (confirmedOvertime / chartTotal) * 100;
  const completedPercent = Math.min(100, (actual / chartTotal) * 100);
  const markerAngle =
    ((targetShare - basicProgress) / 100) * Math.PI * 2 - Math.PI / 2;
  const markerX = 80 + Math.cos(markerAngle) * 64;
  const markerY = 80 + Math.sin(markerAngle) * 64;
  const calloutX = 171;
  const calloutY = Math.max(34, Math.min(126, markerY));
  const legends: {
    id: string;
    label: string;
    value: number;
  }[] = [
    { id: "basic", label: "基本工时", value: target },
    { id: "overtime", label: "预计加班", value: overtime },
    { id: "completed", label: "已完成基本", value: confirmedBasic },
    {
      id: "completedOvertime",
      label: "已完成加班",
      value: confirmedOvertime,
    },
    { id: "total", label: "预计总工时", value: target + overtime },
  ];
  return (
    <div className="annual-ring-wrap">
      <div
        className="annual-ring"
        role="img"
        aria-label={`标准工时 ${compactHours(target)} 小时，预计额外工时 ${compactHours(overtime)} 小时，已完成 ${compactHours(actual)} 小时`}
      >
        <div className="annual-pie-core">
          <svg className="annual-pie-segments" viewBox="0 0 100 100" aria-label="基本工时与预计加班组成">
            <circle
              className="annual-pie-basic"
              cx="50"
              cy="50"
              r="25"
              pathLength="100"
              strokeDasharray={`${targetShare} ${100 - targetShare}`}
            />
            {overtimeShare > 0 && (
              <circle
                className="annual-pie-overtime"
                cx="50"
                cy="50"
                r="25"
                pathLength="100"
                strokeDasharray={`${overtimeShare} ${100 - overtimeShare}`}
                strokeDashoffset={-targetShare}
              />
            )}
          </svg>
        </div>
        <svg className="annual-progress-ring" viewBox="0 0 160 160" aria-label="全年已完成进度">
          <circle
            className="ring-progress-track"
            cx="80"
            cy="80"
            r="64"
            pathLength="100"
          />
          <circle
            className="ring-progress ring-progress-basic"
            cx="80"
            cy="80"
            r="64"
            pathLength="100"
            strokeDasharray={`${basicProgress} ${100 - basicProgress}`}
            strokeDashoffset={-(targetShare - basicProgress)}
          />
          {overtimeProgress > 0 && (
            <>
              <circle
                className="ring-overtime-outline"
                cx="80"
                cy="80"
                r="69"
                pathLength="100"
                strokeDasharray={`${overtimeProgress} ${100 - overtimeProgress}`}
                strokeDashoffset={-targetShare}
              />
              <circle
                className="ring-progress ring-progress-overtime"
                cx="80"
                cy="80"
                r="64"
                pathLength="100"
                strokeDasharray={`${overtimeProgress} ${100 - overtimeProgress}`}
                strokeDashoffset={-targetShare}
              />
            </>
          )}
          {basicProgress > 0 && (
            <g className="pie-progress-callout">
              <polyline
                points={`${markerX},${markerY} 143,${calloutY} 148,${calloutY}`}
              />
              <rect x="148" y={calloutY - 13} width="46" height="28" rx="8" />
              <text x={calloutX} y={calloutY - 3}>
                已完成 {Math.round(completedPercent)}%
              </text>
              <text
                className="callout-hours"
                x={calloutX}
                y={calloutY + 7}
              >
                {compactHours(actual)}h
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="ring-legend annual-ring-legend">
        {legends.map((item) => (
          <span key={item.id} className={`legend-${item.id}`}>
            <i />
            <span>
              {item.label}
              <b>{compactHours(item.value)}h</b>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DayCountPie({
  work,
  rest,
  completed,
}: {
  work: number;
  rest: number;
  completed: number;
}) {
  const total = Math.max(1, work + rest);
  const workShare = Math.min(100, (work / total) * 100);
  const completedShare = work > 0 ? Math.min(100, (completed / work) * 100) : 0;
  return (
    <div className="day-count-visual">
      <div
        className="day-count-pie"
        role="img"
        aria-label={`计划工作 ${work} 天，已完成 ${completed} 天，休息 ${rest} 天`}
      >
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <circle className="day-count-outer-track" cx="80" cy="80" r="62" />
          <circle
            className="day-count-work-ring"
            cx="80"
            cy="80"
            r="62"
            pathLength="100"
            strokeDasharray={`${workShare} ${100 - workShare}`}
          />
          <circle className="day-count-inner-track" cx="80" cy="80" r="45" />
          <circle
            className="day-count-completed-ring"
            cx="80"
            cy="80"
            r="45"
            pathLength="100"
            strokeDasharray={`${completedShare} ${100 - completedShare}`}
          />
        </svg>
        <span className="day-count-center">
          <strong>
            {completed}<b>天</b>
          </strong>
          <small>已经上班</small>
        </span>
      </div>
      <div className="day-count-legend">
        <span>
          <i className="work" />
          工作 {work} 天
        </span>
        <span>
          <i className="rest" />
          休息 {rest} 天
        </span>
        <span>
          <i className="done" />
          已完成 {completed} 天
        </span>
      </div>
    </div>
  );
}

function MonthlyHoursChart({
  monthly,
  activeMonth,
  showOvertime,
}: {
  monthly: {
    label: string;
    hours: number;
    completedHours: number;
    target: number;
    overtime: number;
  }[];
  activeMonth: number;
  showOvertime: boolean;
}) {
  return (
    <figure
      className="monthly-bars"
      role="img"
      aria-label="全年每月工作时长柱状图"
    >
      {monthly.map((item, index) => {
        const overtime = showOvertime ? Math.min(item.hours, item.overtime) : 0;
        const base = Math.max(0, item.hours - overtime);
        const baseShare = item.hours > 0 ? (base / item.hours) * 100 : 0;
        const overtimeShare = item.hours > 0 ? 100 - baseShare : 0;
        return (
          <div
            title={`${item.label}：计划 ${compactHours(item.hours)}h，已完成 ${compactHours(item.completedHours)}h${showOvertime ? `，额外 ${compactHours(overtime)}h` : ""}`}
            key={item.label}
            className={`monthly-bar-item ${index === activeMonth ? "is-current" : ""}`}
          >
            <span className="monthly-bar-overtime-value">
              {overtime > 0 ? `+${compactHours(overtime)}h` : ""}
            </span>
            <span className="monthly-bar-total">
              {compactHours(item.hours)}h
            </span>
            <span className="monthly-bar-track">
              {item.hours > 0 && (
                <span className="monthly-bar-fill">
                {overtime > 0 && (
                  <i
                    className="monthly-bar-overtime"
                    style={{ height: `${overtimeShare}%` }}
                  />
                )}
                  <i
                    className="monthly-bar-basic"
                    style={{ height: `${baseShare}%` }}
                  />
                </span>
              )}
            </span>
            <small>{index + 1}月</small>
          </div>
        );
      })}
    </figure>
  );
}

function StatsView({
  year,
  month,
  data,
  todayKey,
}: {
  year: number;
  month: number;
  data: AppData;
  todayKey: string;
}) {
  const shiftMap = useMemo(
    () => new Map(data.shifts.map((shift) => [shift.id, shift])),
    [data.shifts],
  );
  const yearly = data.records.filter((record) =>
    record.date.startsWith(`${year}-`),
  );
  const workRecords = yearly.filter(
    (record) => shiftMap.get(record.shiftId)?.countsAsWork,
  );
  const restRecords = yearly.filter(
    (record) => shiftMap.get(record.shiftId)?.isRest,
  );
  const completed = completedByDate(workRecords, todayKey);
  const totalHours = workRecords.reduce((sum, record) => sum + record.hours, 0);
  const actualHours = completed.reduce((sum, record) => sum + record.hours, 0);
  const annualTarget = getAnnualTarget(data, year);
  const annualOvertime = getPeriodOvertime(workRecords, data, year);
  const actualOvertime = getPeriodOvertime(completed, data, year);
  const monthlyOvertime = canAllocateOvertimeByMonth(data);
  const shiftBreakdown = data.shifts
    .map((shift) => {
      const records = yearly.filter((record) => record.shiftId === shift.id);
      return {
        shift,
        records,
        hours: records.reduce((sum, record) => sum + record.hours, 0),
      };
    })
    .filter((item) => item.records.length)
    .sort((a, b) => b.records.length - a.records.length);
  const monthly = MONTH_LABELS.map((label, index) => {
    const records = workRecords.filter((record) =>
      record.date.startsWith(`${year}-${pad(index + 1)}`),
    );
    const completedRecords = completedByDate(records, todayKey);
    const target = getMonthlyTarget(data, year, index);
    const overtime = !data.work.trackOvertime
      ? 0
      : data.work.system === "comprehensive"
        ? data.work.period === "month"
          ? calculateOvertime(records, data.work, target)
          : data.work.period === "week"
            ? comprehensiveScopeForMonth(
                data,
                year,
                index,
                workRecords,
                todayKey,
              ).projected
            : 0
        : calculateOvertime(records, data.work, target);
    return {
      label,
      hours: records.reduce((sum, record) => sum + record.hours, 0),
      completedHours: completedRecords.reduce(
        (sum, record) => sum + record.hours,
        0,
      ),
      target,
      overtime,
    };
  });
  const systemNote =
    data.work.system === "comprehensive"
      ? `综合工时按${PERIOD_LABELS[data.work.period]}周期累计；月度基本工时按每日 8h 推算，不会把单日超过 8h 直接认定为额外工时。`
      : data.work.system === "standard"
        ? "标准工时按已开启的每日 / 每周阈值统计，日与周结果取较高值，避免重复累计。"
        : data.work.system === "custom"
          ? "额外工时按你的自定义阈值或手动标记统计。"
          : "额外工时只读取每天手动填写的数值，不自动套用每日 8 小时规则。";

  if (!data.work.trackHours)
    return (
      <div className="stats-page">
        <section className="glass-panel schedule-only-overview">
          <div className="schedule-only-copy">
            <p className="eyebrow">{year} 年 · 仅排班</p>
            <h2>这一年安排了 {workRecords.length} 个工作日</h2>
            <p>
              工时统计已关闭，因此这里只展示班次与天数，不推算工时或额外工时。
            </p>
          </div>
          <DayCountPie
            work={workRecords.length}
            rest={restRecords.length}
            completed={completed.length}
          />
        </section>
        <div className="stats-summary-grid schedule-summary">
          <MetricCard
            label="计划工作日"
            value={`${workRecords.length}天`}
            detail="计入工作的班次"
            tone="blue"
          />
          <MetricCard
            label="已完成班次"
            value={`${completed.length}天`}
            detail={`剩余 ${Math.max(0, workRecords.length - completed.length)} 天`}
            tone="green"
          />
          <MetricCard
            label="休息日"
            value={`${restRecords.length}天`}
            detail="休息与请假班次"
            tone="violet"
          />
        </div>
        <ShiftBreakdown items={shiftBreakdown} showHours={false} />
      </div>
    );

  return (
    <div className="stats-page">
      <div className="stats-layout annual-dashboard">
        <section
          className={`stats-summary-grid annual-summary ${data.work.trackOvertime ? "with-overtime" : "hours-only"}`}
        >
          <MetricCard
            label="全年计划工时"
            value={`${compactHours(totalHours)}h`}
            detail={`${workRecords.length} 个工作日`}
            tone="blue"
          />
          <MetricCard
            label="已完成工时"
            value={`${compactHours(actualHours)}h`}
            detail={`${completed.length} 个已完成班次`}
            tone="green"
          />
          {data.work.trackOvertime && (
            <MetricCard
              label="预计额外工时"
              value={`${compactHours(annualOvertime)}h`}
              detail={SYSTEM_LABELS[data.work.system]}
              tone="orange"
            />
          )}
          {data.work.trackOvertime && (
            <MetricCard
              label="已确认额外工时"
              value={`${compactHours(actualOvertime)}h`}
              detail="截至今日已确认"
              tone="violet"
            />
          )}
        </section>
        {data.work.trackOvertime && data.work.system === "comprehensive" && (
          <section className="annual-overview-card glass-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">全年仪表盘</p>
                <h2>标准、额外与完成进度</h2>
              </div>
              <span className="soft-badge">
                {PERIOD_LABELS[data.work.period]}周期
              </span>
            </div>
            <div className="annual-overview-grid">
              <AnnualRing
                target={annualTarget}
                actual={actualHours}
                overtime={annualOvertime}
                actualOvertime={actualOvertime}
              />
            </div>
          </section>
        )}
        <section className="glass-panel stats-rule-note">
          <Icon name="spark" />
          <div>
            <strong>
              {data.work.trackOvertime
                ? SYSTEM_LABELS[data.work.system]
                : "仅统计工作时长"}
            </strong>
            <p>
              {data.work.trackOvertime
                ? systemNote
                : "加班统计已关闭。图表只展示计划工时、已完成工时和班次构成。"}
            </p>
          </div>
        </section>
        <section className="chart-card glass-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">12 个月</p>
              <h2>
                {data.work.trackOvertime && monthlyOvertime
                  ? "每月工时与额外工时"
                  : "每月计划与完成工时"}
              </h2>
            </div>
            <div className="chart-legend">
              <span>
                <i className="bar-blue" />
                标准内 / 工作时长
              </span>
              {data.work.trackOvertime && monthlyOvertime && (
                <span>
                  <i className="bar-overtime-key" />
                  额外工时
                </span>
              )}
            </div>
          </div>
          {!monthlyOvertime &&
            data.work.trackOvertime &&
            data.work.system === "comprehensive" && (
              <p className="chart-caption">
                当前按{PERIOD_LABELS[data.work.period]}
                统一结算，月柱不拆分额外工时，以免把周期口径误解为“每月超过即加班”。
              </p>
            )}
          <MonthlyHoursChart
            monthly={monthly}
            activeMonth={month}
            showOvertime={monthlyOvertime}
          />
        </section>
        <ShiftBreakdown items={shiftBreakdown} showHours />
      </div>
    </div>
  );
}

function ShiftBreakdown({
  items,
  showHours,
}: {
  items: { shift: Shift; records: DayRecord[]; hours: number }[];
  showHours: boolean;
}) {
  const totalDays = items.reduce((sum, item) => sum + item.records.length, 0);
  return (
    <section className="glass-panel shift-statistics-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">班次构成</p>
          <h2>不同班次统计</h2>
        </div>
        <span className="soft-badge">共 {totalDays} 天</span>
      </div>
      <div className="shift-stat-grid">
        {items.length ? (
          items.map((item) => {
            const share = totalDays
              ? (item.records.length / totalDays) * 100
              : 0;
            return (
              <article
                key={item.shift.id}
                className="shift-stat-item"
                style={colorStyle(item.shift.color)}
              >
                <div className="shift-stat-head">
                  <i>{item.shift.shortName}</i>
                  <strong>{item.shift.name}</strong>
                </div>
                <div className="shift-stat-values">
                  <b>
                    {item.records.length}
                    <small>天</small>
                  </b>
                  {showHours && <span>{compactHours(item.hours)}h</span>}
                </div>
                <span className="shift-stat-track">
                  <i style={{ width: `${share}%` }} />
                </span>
              </article>
            );
          })
        ) : (
          <p className="empty-copy">还没有排班记录</p>
        )}
      </div>
    </section>
  );
}

function CalendarDisplayPreview({ data }: { data: AppData }) {
  const shift = data.shifts.find((item) => item.countsAsWork) ?? data.shifts[0];
  const previewTags = data.tags.slice(0, 2);
  const timeRange = shift ? fullShiftRange(shift) : "";
  return (
    <div className="calendar-display-preview">
      <p>日历单元格预览</p>
      <div className="calendar-day preview-calendar-cell">
        <span className="calendar-date-row">
          <span className="day-number">8</span>
          <span className="calendar-day-badges">
            {data.display.showHolidays && (
              <small className="holiday-flag">法·国庆</small>
            )}
          </span>
        </span>
        {shift && (
          <span className="schedule-cell-content">
            {data.display.showShiftTime && timeRange && (
              <small className="schedule-cell-time">{timeRange}</small>
            )}
            {data.display.showTags && previewTags.length > 0 && (
              <span className="schedule-cell-tags">
                {previewTags.map((tag) => (
                  <em key={tag.id} style={colorStyle(tag.color)}>
                    {tag.shortName}
                  </em>
                ))}
              </span>
            )}
            <span
              className={`schedule-cell-shift ${shift.isRest ? "is-rest" : ""}`}
              style={colorStyle(shift.color)}
            >
              {data.display.showShift && <b>{shift.shortName}</b>}
              {data.display.showHours &&
                data.work.trackHours &&
                shift.countsAsWork &&
                !shift.isRest && <em>{compactHours(shift.defaultHours)}h</em>}
            </span>
          </span>
        )}
      </div>
      <small>
        实际日历会根据屏幕宽度自动压缩文字，详细时间与备注仍放在当天详情中。
      </small>
    </div>
  );
}

function SettingsView({
  data,
  setData,
  activeYear,
  onOpenGenerator,
  notify,
}: {
  data: AppData;
  setData: (value: AppData | ((current: AppData) => AppData)) => void;
  activeYear: number;
  onOpenGenerator: () => void;
  notify: (message?: string) => void;
}) {
  const [editor, setEditor] = useState<EntityEditor>(null);
  const [message, setMessage] = useState("");
  const [targetYear, setTargetYear] = useState(activeYear);
  const [targetEdit, setTargetEdit] = useState<{
    key: string;
    value: number;
  } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const orderedShiftItems = orderedShifts(data.shifts);
  const selectedCareer =
    CAREERS.find((career) => career.id === data.careerPreset) ?? CAREERS[0];
  function updateWork(patch: Partial<AppData["work"]>) {
    const linkedValue = patch.trackHours ?? patch.trackOvertime;
    setData((current) => {
      const nextSystem = patch.system ?? current.work.system;
      return {
        ...current,
        work: {
          ...current.work,
          ...patch,
          period:
            nextSystem === "comprehensive"
              ? "month"
              : (patch.period ?? current.work.period),
          ...(typeof linkedValue === "boolean"
            ? { trackHours: linkedValue, trackOvertime: linkedValue }
            : {}),
        },
      };
    });
  }
  function updateDisplay(patch: Partial<AppData["display"]>) {
    setData((current) => ({
      ...current,
      display: { ...current.display, ...patch },
    }));
  }
  function saveShift(shift: Shift) {
    if (
      data.shifts.some(
        (item) =>
          item.id !== shift.id &&
          item.name.trim() === shift.name.trim() &&
          item.startTime === shift.startTime &&
          item.endTime === shift.endTime,
      )
    ) {
      setMessage("已有名称和时间相同的班次，请直接编辑现有班次。");
      return;
    }
    setData((current) => ({
      ...current,
      shifts: [...current.shifts.filter((item) => item.id !== shift.id), shift],
    }));
    setEditor(null);
    notify();
  }
  function deleteShift(shift: Shift) {
    const usedByRecord = data.records.some(
      (record) => record.shiftId === shift.id,
    );
    const usedByCycle = data.activeCycle?.shiftIds.includes(shift.id);
    if (usedByRecord || usedByCycle) {
      setMessage(
        `“${shift.name}”正在被每日排班或当前循环使用，请先替换后再删除。`,
      );
      return;
    }
    setData((current) => ({
      ...current,
      shifts: current.shifts.filter((item) => item.id !== shift.id),
      cycleTemplates: current.cycleTemplates.filter(
        (template) => !template.shiftIds.includes(shift.id),
      ),
    }));
    notify("班次与相关模板已删除");
  }
  function saveTag(tag: DutyTag) {
    if (
      data.tags.some(
        (item) => item.id !== tag.id && item.name.trim() === tag.name.trim(),
      )
    ) {
      setMessage("已有同名标签，请直接编辑现有标签。");
      return;
    }
    setData((current) => ({
      ...current,
      tags: [...current.tags.filter((item) => item.id !== tag.id), tag],
    }));
    setEditor(null);
    notify();
  }
  function deleteTag(tag: DutyTag) {
    setData((current) => ({
      ...current,
      tags: current.tags.filter((item) => item.id !== tag.id),
      records: current.records.map((record) => ({
        ...record,
        tagIds: record.tagIds.filter((id) => id !== tag.id),
      })),
    }));
    notify("标签已删除");
  }
  function exportBackup() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "shift-ledger",
            version: DATA_VERSION,
            exportedAt: new Date().toISOString(),
            data,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `循环班表备份-${dateKey(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const next = parsed.data
        ? normalizeAppData(parsed.data)
        : parsed.settings || parsed.records
          ? migrateLegacyData(parsed.settings, parsed.records)
          : normalizeAppData(parsed);
      setData(next);
      setMessage(`已导入 ${next.records.length} 天记录`);
    } catch {
      setMessage("导入失败：请选择循环班表导出的 JSON 备份");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }
  return (
    <>
      <div className="settings-grid upgraded-settings">
        <section className="glass-panel setting-card wide career-preset-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">工作类型 / 职业预设</p>
              <h2>选择你的工作类型</h2>
            </div>
          </div>
          <label className="career-unified-picker">
            <select
              aria-label="选择工作类型"
              value={data.careerPreset}
              onChange={(event) => {
                const preset = event.target.value as CareerPreset;
                setData((current) => applyCareerPreset(current, preset));
                notify(
                  `已切换为${CAREERS.find((item) => item.id === preset)?.name ?? "自定义"}预设`,
                );
              }}
            >
              {CAREERS.map((career) => (
                <option value={career.id} key={career.id}>
                  {career.name}
                </option>
              ))}
            </select>
            <span className="career-picker-head">
              <span>
                <small>当前工作类型</small>
                <strong>{selectedCareer.name}</strong>
              </span>
              <SelectChevron />
            </span>
            <span className="career-picker-detail">{selectedCareer.detail}</span>
            <small className="career-picker-note">
              点按整张卡片即可更换。只补充相关的起始班次、示例标签和推荐模板，不会限制自定义功能，也不会删除已有内容。
            </small>
            <span className="career-feature-chips">
              {CAREER_FEATURES[data.careerPreset].map((feature) => (
                <i key={feature}>{feature}</i>
              ))}
            </span>
          </label>
        </section>
        <section className="glass-panel setting-card wide calendar-display-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">日历显示</p>
              <h2>选择单元格中显示的信息</h2>
            </div>
          </div>
          <div className="calendar-display-layout">
            <div className="calendar-display-options">
              <ToggleRow
                label="班次简称"
                detail="例如：白、夜、大夜"
                checked={data.display.showShift}
                onChange={(checked) => updateDisplay({ showShift: checked })}
              />
              <ToggleRow
                label="职责标签"
                detail="显示当天附加的责班、ICU 等标签"
                checked={data.display.showTags}
                onChange={(checked) => updateDisplay({ showTags: checked })}
              />
              <ToggleRow
                label="班次时间"
                detail="例如：08:00–20:00"
                checked={data.display.showShiftTime}
                onChange={(checked) =>
                  updateDisplay({ showShiftTime: checked })
                }
              />
              {data.work.trackHours && (
                <ToggleRow
                  label="计入工时"
                  detail="显示当天实际 / 计划计入的小时数"
                  checked={data.display.showHours}
                  onChange={(checked) => updateDisplay({ showHours: checked })}
                />
              )}
              <ToggleRow
                label="法定节假日"
                detail="显示元旦、春节、清明、劳动节等标签"
                checked={data.display.showHolidays}
                onChange={(checked) => updateDisplay({ showHolidays: checked })}
              />
            </div>
            <CalendarDisplayPreview data={data} />
          </div>
        </section>
        <section className="glass-panel setting-card wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">排班设置</p>
              <h2>我的班次</h2>
            </div>
            <button
              className="primary-small"
              onClick={() => setEditor({ type: "shift" })}
            >
              <Icon name="plus" /> 创建班次
            </button>
          </div>
          <p className="setting-intro">
            班次只描述工作时间。名称、简称、颜色、跨天和默认工时都可以修改。
          </p>
          <div className="shift-card-grid">
            {orderedShiftItems.map((shift) => (
              <article
                key={shift.id}
                className="shift-library-item"
                style={colorStyle(shift.color)}
              >
                <div className="shift-library-top">
                  <i>{shift.shortName}</i>
                  <span>
                    <button
                      aria-label={`编辑${shift.name}`}
                      onClick={() => setEditor({ type: "shift", value: shift })}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      aria-label={`删除${shift.name}`}
                      className="mini-delete"
                      onClick={() => deleteShift(shift)}
                    >
                      <Icon name="trash" />
                    </button>
                  </span>
                </div>
                <strong>{shift.name}</strong>
                <small>
                  {shift.isRest
                    ? "休息 / 不计工时"
                    : `${compactShiftRange(shift) || "未设置时间"} · ${shift.countsAsWork ? `${compactHours(shift.defaultHours)}h` : "不计"}`}
                </small>
              </article>
            ))}
          </div>
        </section>
        <section className="glass-panel setting-card wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">职责信息层</p>
              <h2>我的标签</h2>
            </div>
            <button
              className="primary-small"
              onClick={() => setEditor({ type: "tag" })}
            >
              <Icon name="tag" /> 创建标签
            </button>
          </div>
          <p className="setting-intro">
            标签可叠加在每天的主班次上，不参与循环工时计算。
          </p>
          <div className="tag-list">
            {data.tags.length ? (
              data.tags.map((tag) => (
                <span key={tag.id} style={colorStyle(tag.color)}>
                  <i />
                  {tag.name}
                  <small>{tag.shortName}</small>
                  <button
                    onClick={() => setEditor({ type: "tag", value: tag })}
                  >
                    编辑
                  </button>
                  <button onClick={() => deleteTag(tag)}>×</button>
                </span>
              ))
            ) : (
              <p className="empty-copy">
                还没有标签。护士可添加“责班、主班、门诊、ICU”等职责。
              </p>
            )}
          </div>
        </section>
        <section className="glass-panel setting-card wide current-cycle-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">循环排班</p>
              <h2>{data.activeCycle?.name ?? "尚未启用循环"}</h2>
            </div>
            <button className="primary-small" onClick={onOpenGenerator}>
              <Icon name="spark" /> {data.activeCycle ? "修改循环" : "创建循环"}
            </button>
          </div>
          {data.activeCycle ? (
            <>
              <p className="setting-intro">
                从 {data.activeCycle.startDate} 起按班次 ID
                序列无限重复；单日修改不会改变后续节奏。
              </p>
              <div className="cycle-preview-line">
                {data.activeCycle.shiftIds.map((id, index) => {
                  const shift = data.shifts.find((item) => item.id === id);
                  return (
                    shift && (
                      <span
                        key={`${id}-${index}`}
                        style={colorStyle(shift.color)}
                      >
                        {shift.shortName}
                      </span>
                    )
                  );
                })}
              </div>
            </>
          ) : (
            <p className="setting-intro">
              普通用户可直接选模板，高级用户可按任意班次顺序创建自己的循环。
            </p>
          )}
        </section>
        <section className="glass-panel setting-card wide work-settings-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">工时与加班</p>
              <h2>按需开启统计模块</h2>
            </div>
          </div>
          <ToggleRow
            label="统计工时与加班"
            detail="关闭后仍可正常排班；开启后同时统计工作时长与加班"
            checked={data.work.trackHours}
            onChange={(checked) => updateWork({ trackHours: checked })}
          />
          {data.work.trackHours && (
            <div className="conditional-settings">
                  <SelectSetting
                    label="工时制度"
                    value={data.work.system}
                    onChange={(value) =>
                      updateWork({ system: value as WorkSystem })
                    }
                    options={Object.entries(SYSTEM_LABELS)}
                  />
                  {data.work.system === "standard" && (
                    <>
                      <NumberSetting
                        label="每日标准工时"
                        value={data.work.dailyStandard}
                        unit="h"
                        onChange={(value) =>
                          updateWork({ dailyStandard: value })
                        }
                      />
                      <ToggleRow
                        label="启用每日标准"
                        detail="例如 10h − 8h = 2h"
                        checked={data.work.standardDailyEnabled}
                        onChange={(checked) =>
                          updateWork({ standardDailyEnabled: checked })
                        }
                      />
                      <NumberSetting
                        label="每周标准工时"
                        value={data.work.weeklyStandard}
                        unit="h"
                        onChange={(value) =>
                          updateWork({ weeklyStandard: value })
                        }
                      />
                      <ToggleRow
                        label="启用每周标准"
                        detail="日与周结果取较高值，避免重复累计"
                        checked={data.work.standardWeeklyEnabled}
                        onChange={(checked) =>
                          updateWork({ standardWeeklyEnabled: checked })
                        }
                      />
                    </>
                  )}
                  {data.work.system === "custom" && (
                    <>
                      <SelectSetting
                        label="自定义规则"
                        value={data.work.customRule}
                        onChange={(value) =>
                          updateWork({
                            customRule: value as AppData["work"]["customRule"],
                          })
                        }
                        options={[
                          ["daily", "每天超过 X 小时"],
                          ["weekly", "每周超过 X 小时"],
                          ["monthly", "每月超过 X 小时"],
                          ["period", "周期超过 X 小时"],
                          ["manual", "完全手动标记"],
                        ]}
                      />
                      {data.work.customRule !== "manual" && (
                        <NumberSetting
                          label="阈值 X"
                          value={data.work.customThreshold}
                          unit="h"
                          onChange={(value) =>
                            updateWork({ customThreshold: value })
                          }
                        />
                      )}
                    </>
                  )}
                  {(data.work.system === "irregular" ||
                    data.work.system === "manual") && (
                    <p className="conditional-note">
                      此模式不会自动套用每日 8
                      小时规则。需要额外工时时，请在当天详情中手动填写。
                    </p>
                  )}
                  <SelectSetting
                    label="加班如何记录 / 补偿"
                    value={data.work.compensation}
                    onChange={(value) =>
                      updateWork({
                        compensation: value as AppData["work"]["compensation"],
                      })
                    }
                    options={[
                      ["hours", "只记录小时"],
                      ["salary", "加班工资"],
                      ["timeOff", "调休"],
                      ["fixed", "固定金额"],
                      ["custom", "自定义"],
                      ["none", "暂不统计收入"],
                    ]}
                  />
            </div>
          )}
        </section>
        {data.work.trackHours &&
          data.work.trackOvertime &&
          data.work.system === "comprehensive" && (
            <section className="glass-panel setting-card wide target-explorer">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">综合工时标准</p>
                  <h2>{targetYear} 年月度推算</h2>
                </div>
                <div className="target-year-switch">
                  <button
                    aria-label="上一年"
                    onClick={() => setTargetYear((value) => value - 1)}
                  >
                    ‹
                  </button>
                  <strong>{targetYear}</strong>
                  <button
                    aria-label="下一年"
                    onClick={() => setTargetYear((value) => value + 1)}
                  >
                    ›
                  </button>
                </div>
              </div>
              <p className="target-grid-note">
                系统按工作日统一自动推演；点按任意月份可手动修正。
              </p>
              <div className="target-grid">
                {MONTH_LABELS.map((label, index) => {
                  const key = `${targetYear}-${pad(index + 1)}`;
                  const value = getMonthlyTarget(data, targetYear, index);
                  const overridden = Number.isFinite(data.targets[key]);
                  return (
                    <button
                      className={overridden ? "overridden" : ""}
                      key={key}
                      aria-label={`${label} ${compactHours(value)} 小时，点按修改`}
                      onClick={() => setTargetEdit({ key, value })}
                    >
                      <span className="target-month-copy">
                        <b>{label}</b>
                        {overridden && <small>已修正</small>}
                      </span>
                      <strong>
                        {compactHours(value)}
                        <b>h</b>
                      </strong>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        <section className="glass-panel setting-card wide data-card">
          <div>
            <p className="eyebrow">数据</p>
            <h2>备份与恢复</h2>
            <span>备份包含自定义班次、标签、循环、工时规则和每日记录。</span>
            {message && (
              <strong
                className={`import-message ${message.includes("失败") || message.includes("正在被") ? "error" : ""}`}
              >
                {message}
              </strong>
            )}
          </div>
          <div className="data-actions">
            <button className="secondary-button" onClick={exportBackup}>
              <Icon name="download" />
              导出备份
            </button>
            <button
              className="secondary-button"
              onClick={() => importInput.current?.click()}
            >
              <Icon name="upload" />
              导入备份
            </button>
            <input
              ref={importInput}
              className="file-input"
              type="file"
              accept="application/json,.json"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                importBackup(event.target.files?.[0])
              }
            />
          </div>
        </section>
      </div>
      {editor?.type === "shift" && (
        <ShiftEditor
          value={editor.value}
          onClose={() => setEditor(null)}
          onSave={saveShift}
        />
      )}{" "}
      {editor?.type === "tag" && (
        <TagEditor
          value={editor.value}
          onClose={() => setEditor(null)}
          onSave={saveTag}
        />
      )}{" "}
      {targetEdit && (
        <NumberModal
          title="修改月度标准工时"
          value={targetEdit.value}
          unit="小时"
          onClose={() => setTargetEdit(null)}
          onSave={(value) => {
            setData((current) => ({
              ...current,
              targets: { ...current.targets, [targetEdit.key]: value },
            }));
            setTargetEdit(null);
            notify();
          }}
        />
      )}
    </>
  );
}

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-toggle">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i />
    </label>
  );
}
function SelectSetting({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="select-setting">
      <span>{label}</span>
      <span className="select-control">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <SelectChevron />
      </span>
    </label>
  );
}

function SelectChevron() {
  return (
    <span className="select-chevron" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path d="M3.5 6.25 8 10.5l4.5-4.25" />
      </svg>
    </span>
  );
}
function NumberSetting({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-setting">
      <span>{label}</span>
      <div>
        <input
          type="number"
          min="0"
          step="0.5"
          value={value}
          onChange={(event) =>
            onChange(Math.max(0, Number(event.target.value) || 0))
          }
        />
        <b>{unit}</b>
      </div>
    </label>
  );
}

function ShiftEditor({
  value,
  onClose,
  onSave,
}: {
  value?: Shift;
  onClose: () => void;
  onSave: (shift: Shift) => void;
}) {
  const [draft, setDraft] = useState<Shift>(
    value ?? {
      id: makeId("shift"),
      name: "新班次",
      shortName: "新",
      color: SHIFT_COLORS[0],
      startTime: "08:00",
      endTime: "16:00",
      crossesMidnight: false,
      isRest: false,
      defaultHours: 8,
      countsAsWork: true,
    },
  );
  function updateTime(patch: Partial<Shift>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      return {
        ...next,
        defaultHours: next.isRest
          ? 0
          : calculateShiftDuration(
              next.startTime,
              next.endTime,
              next.crossesMidnight,
            ),
      };
    });
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="dialog-card glass-panel entity-editor"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            <p className="eyebrow">自定义班次</p>
            <h2>{value ? "编辑班次" : "创建班次"}</h2>
          </div>
          <button
            aria-label="关闭弹窗"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="form-grid">
          <label>
            <span>班次名称</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label>
            <span>简称</span>
            <input
              maxLength={4}
              value={draft.shortName}
              onChange={(event) =>
                setDraft({ ...draft, shortName: event.target.value })
              }
            />
          </label>
          <label>
            <span>开始时间</span>
            <input
              type="time"
              disabled={draft.isRest}
              value={draft.startTime}
              onChange={(event) =>
                updateTime({ startTime: event.target.value })
              }
            />
          </label>
          <label>
            <span>结束时间</span>
            <input
              type="time"
              disabled={draft.isRest}
              value={draft.endTime}
              onChange={(event) => updateTime({ endTime: event.target.value })}
            />
          </label>
        </div>
        <ToggleRow
          label="跨午夜"
          detail="例如 20:00–08:00"
          checked={draft.crossesMidnight}
          onChange={(checked) => updateTime({ crossesMidnight: checked })}
        />
        <ToggleRow
          label="属于休息"
          detail="休息班次不计入工作日"
          checked={draft.isRest}
          onChange={(checked) =>
            setDraft({
              ...draft,
              isRest: checked,
              countsAsWork: !checked,
              defaultHours: checked ? 0 : draft.defaultHours,
            })
          }
        />
        {!draft.isRest && (
          <ToggleRow
            label="计入工作工时"
            detail="可用于备班等不计工时班次"
            checked={draft.countsAsWork}
            onChange={(checked) =>
              setDraft({ ...draft, countsAsWork: checked })
            }
          />
        )}
        <NumberSetting
          label="默认工作时长"
          value={draft.defaultHours}
          unit="h"
          onChange={(defaultHours) => setDraft({ ...draft, defaultHours })}
        />
        <ColorPicker
          colors={SHIFT_COLORS}
          value={draft.color}
          onChange={(color) => setDraft({ ...draft, color })}
        />
        <label className="wide-field">
          <span>备注（可选）</span>
          <input
            value={draft.note ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, note: event.target.value })
            }
          />
        </label>
        <div className="sheet-actions">
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            disabled={!draft.name.trim() || !draft.shortName.trim()}
            onClick={() =>
              onSave({
                ...draft,
                name: draft.name.trim(),
                shortName: draft.shortName.trim(),
              })
            }
          >
            保存班次
          </button>
        </div>
      </section>
    </div>
  );
}
function TagEditor({
  value,
  onClose,
  onSave,
}: {
  value?: DutyTag;
  onClose: () => void;
  onSave: (tag: DutyTag) => void;
}) {
  const [draft, setDraft] = useState<DutyTag>(
    value ?? {
      id: makeId("tag"),
      name: "新标签",
      shortName: "新",
      color: TAG_COLORS[0],
    },
  );
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="dialog-card glass-panel entity-editor"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            <p className="eyebrow">职责信息</p>
            <h2>{value ? "编辑标签" : "创建标签"}</h2>
          </div>
          <button
            aria-label="关闭弹窗"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="form-grid">
          <label>
            <span>名称</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label>
            <span>日历简称</span>
            <input
              maxLength={6}
              value={draft.shortName}
              onChange={(event) =>
                setDraft({ ...draft, shortName: event.target.value })
              }
            />
          </label>
        </div>
        <ColorPicker
          colors={TAG_COLORS}
          value={draft.color}
          onChange={(color) => setDraft({ ...draft, color })}
        />
        <div className="sheet-actions">
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            disabled={!draft.name.trim() || !draft.shortName.trim()}
            onClick={() =>
              onSave({
                ...draft,
                name: draft.name.trim(),
                shortName: draft.shortName.trim(),
              })
            }
          >
            保存标签
          </button>
        </div>
      </section>
    </div>
  );
}
function ColorPicker({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="color-picker">
      <span>显示颜色</span>
      <div>
        {colors.map((color) => (
          <button
            key={color}
            className={value === color ? "active" : ""}
            style={{ background: color }}
            onClick={() => onChange(color)}
            aria-label={color}
          />
        ))}
      </div>
    </div>
  );
}
function NumberModal({
  title,
  value,
  unit,
  onClose,
  onSave,
}: {
  title: string;
  value: number;
  unit: string;
  onClose: () => void;
  onSave: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const parsed = Number(text);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="number-editor-card glass-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>{title}</h2>
          <button
            aria-label="关闭弹窗"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <label className="number-editor-input">
          <span>输入新数值</span>
          <div>
            <input
              autoFocus
              inputMode="decimal"
              value={text}
              onChange={(event) =>
                setText(event.target.value.replace(/[^0-9.]/g, ""))
              }
            />
            <b>{unit}</b>
          </div>
        </label>
        <div className="sheet-actions">
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            disabled={!Number.isFinite(parsed) || parsed < 0}
            onClick={() => onSave(parsed)}
          >
            确定修改
          </button>
        </div>
      </section>
    </div>
  );
}

function DayEditor({
  date,
  record,
  data,
  onClose,
  onSave,
  onRest,
}: {
  date: string;
  record?: DayRecord;
  data: AppData;
  onClose: () => void;
  onSave: (record: DayRecord) => void;
  onRest: () => void;
}) {
  const defaultShift =
    data.shifts.find((shift) => !shift.isRest) ?? data.shifts[0];
  const [draft, setDraft] = useState<DayRecord>(
    record
      ? { ...record }
      : {
          date,
          shiftId: defaultShift.id,
          hours: defaultShift.defaultHours,
          tagIds: [],
          completed: false,
          planned: true,
          source: "manual",
        },
  );
  const formatted = parseDate(date);
  const shift =
    data.shifts.find((item) => item.id === draft.shiftId) ?? defaultShift;
  const manualMode =
    data.work.trackOvertime &&
    (data.work.system === "manual" ||
      data.work.system === "irregular" ||
      (data.work.system === "custom" && data.work.customRule === "manual"));
  function chooseShift(next: Shift) {
    setDraft((current) => ({
      ...current,
      shiftId: next.id,
      hours: next.defaultHours,
      completed: next.isRest ? false : current.completed,
      source: "manual",
    }));
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="bottom-sheet glass-panel day-editor-v2"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">{date}</p>
            <h2>
              {formatted.getMonth() + 1}月{formatted.getDate()}日 · 周
              {WEEKDAYS[(formatted.getDay() + 6) % 7]}
            </h2>
          </div>
          <button
            aria-label="关闭日期编辑"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="editor-section-label">主要班次</p>
        <div className="shift-picker custom-shift-picker">
          {orderedShifts(data.shifts).map((item) => (
            <button
              key={item.id}
              className={draft.shiftId === item.id ? "active" : ""}
              style={colorStyle(item.color)}
              onClick={() => chooseShift(item)}
            >
              <span>{item.shortName}</span>
              {item.name}
            </button>
          ))}
        </div>
        {data.tags.length > 0 && (
          <>
            <p className="editor-section-label">职责标签 · 可多选</p>
            <div className="day-tag-picker">
              {data.tags.map((tag) => (
                <button
                  key={tag.id}
                  className={draft.tagIds.includes(tag.id) ? "active" : ""}
                  style={colorStyle(tag.color)}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      tagIds: current.tagIds.includes(tag.id)
                        ? current.tagIds.filter((id) => id !== tag.id)
                        : [...current.tagIds, tag.id],
                    }))
                  }
                >
                  {tag.shortName}
                </button>
              ))}
            </div>
          </>
        )}
        {!shift.isRest && (
          <ToggleRow
            label="班次已完成"
            detail="过去日期自动计入；今天或未来可手动确认"
            checked={draft.completed}
            onChange={(completed) => setDraft({ ...draft, completed })}
          />
        )}{" "}
        {data.work.trackHours && (
          <div className="editor-grid">
            <label className="field">
              <span>实际 / 计划工时</span>
              <div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={draft.hours}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      hours: Number(event.target.value) || 0,
                    })
                  }
                />
                <b>小时</b>
              </div>
            </label>
            {manualMode && (
              <label className="field">
                <span>手动额外工时</span>
                <div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={draft.manualOvertime ?? 0}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        manualOvertime: Number(event.target.value) || 0,
                      })
                    }
                  />
                  <b>小时</b>
                </div>
              </label>
            )}
          </div>
        )}
        <label className="field note-field">
          <span>
            时间：
            {shift.startTime && shift.endTime
              ? `${shift.startTime}–${shift.endTime}${shift.crossesMidnight ? "（跨天）" : ""}`
              : "未设置"}{" "}
            · 备注
          </span>
          <input
            placeholder="例如：临时换班、培训…"
            value={draft.note ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, note: event.target.value })
            }
          />
        </label>
        <div className="warning-note">
          <Icon name="spark" />
          <span>
            这里只修改当天，不会改变后续循环。要改变未来，请使用“修改循环”。
          </span>
        </div>
        <div className="sheet-actions">
          <button className="delete-button" onClick={onRest}>
            <Icon name="trash" />
            设为休息
          </button>
          <button
            className="primary-button"
            onClick={() =>
              onSave({ ...draft, source: "manual", planned: true })
            }
          >
            保存当天
          </button>
        </div>
      </section>
    </div>
  );
}

function BatchEditor({
  dates,
  data,
  onClose,
  onSave,
}: {
  dates: string[];
  data: AppData;
  onClose: () => void;
  onSave: (shiftId: string, hours: number) => void;
}) {
  const shiftChoices = orderedShifts(data.shifts);
  const initial = shiftChoices[0];
  const [shiftId, setShiftId] = useState(initial.id);
  const selected = data.shifts.find((shift) => shift.id === shiftId) ?? initial;
  const [hours, setHours] = useState(initial.defaultHours);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="bottom-sheet glass-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-grabber" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">批量修改 · {dates.length} 天</p>
            <h2>统一设置所选日期</h2>
          </div>
          <button
            aria-label="关闭弹窗"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="shift-picker custom-shift-picker">
          {shiftChoices.map((shift) => (
            <button
              key={shift.id}
              className={shiftId === shift.id ? "active" : ""}
              style={colorStyle(shift.color)}
              onClick={() => {
                setShiftId(shift.id);
                setHours(shift.defaultHours);
              }}
            >
              <span>{shift.shortName}</span>
              {shift.name}
            </button>
          ))}
        </div>
        {data.work.trackHours && (
          <NumberSetting
            label="统一工时"
            value={hours}
            unit="h"
            onChange={setHours}
          />
        )}
        <div className="warning-note">
          <Icon name="spark" />
          <span>
            只覆盖 {dates[0]} 至 {dates[dates.length - 1]}
            ，其他日期和未来循环不变。
          </span>
        </div>
        <div className="sheet-actions">
          <button className="secondary-button" onClick={onClose}>
            返回
          </button>
          <button
            className="primary-button"
            onClick={() => onSave(selected.id, hours)}
          >
            确认修改 {dates.length} 天
          </button>
        </div>
      </section>
    </div>
  );
}

function ScheduleGenerator({
  data,
  initialYear,
  onClose,
  onGenerate,
}: {
  data: AppData;
  initialYear: number;
  onClose: () => void;
  onGenerate: (cycle: ActiveCycle, saveTemplate: boolean) => void;
}) {
  const today = dateKey(new Date());
  const [cycleIds, setCycleIds] = useState<string[]>(
    data.activeCycle?.shiftIds ?? [],
  );
  const [name, setName] = useState(data.activeCycle?.name ?? "我的循环");
  const [startDate, setStartDate] = useState(
    data.activeCycle?.startDate ??
      (today.startsWith(`${initialYear}-`) ? today : `${initialYear}-01-01`),
  );
  const [saveTemplate, setSaveTemplate] = useState(false);
  const usableShifts = orderedShifts(
    data.shifts.filter((shift) => shift.id !== "shift-leave"),
  );
  const recommendedCategory =
    data.careerPreset === "medical"
      ? "medical"
      : data.careerPreset === "transport" || data.careerPreset === "service"
        ? "threeShift"
        : "manufacturing";
  const recommendedTemplates = data.cycleTemplates.filter(
    (template) => template.builtIn && template.category === recommendedCategory,
  );
  const personalTemplates = data.cycleTemplates.filter(
    (template) => !template.builtIn,
  );
  const visibleTemplates = [
    ...recommendedTemplates.slice(0, 4),
    ...personalTemplates,
  ].filter((template) =>
    template.shiftIds.every((id) =>
      data.shifts.some((shift) => shift.id === id),
    ),
  );
  function chooseTemplate(template: CycleTemplate) {
    setCycleIds([...template.shiftIds]);
    setName(template.name);
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="dialog-card glass-panel generator-v2"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            <p className="eyebrow">循环排班</p>
            <h2>按班次序列不断重复</h2>
          </div>
          <button
            aria-label="关闭循环排班"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="cycle-template-head">
          <span>推荐与我的模板</span>
          <small>已按工作类型筛选，选中后仍可修改</small>
        </div>
        <div className="cycle-template-grid">
          {visibleTemplates.map((template) => (
            <button
              key={template.id}
              className={
                cycleIds.join() === template.shiftIds.join() ? "active" : ""
              }
              onClick={() => chooseTemplate(template)}
            >
              <strong>{template.name}</strong>
              <small>{template.caption}</small>
            </button>
          ))}
        </div>
        <div className="cycle-builder-head">
          <span>当前循环 · {cycleIds.length} 天</span>
          <div>
            <button onClick={() => setCycleIds((items) => items.slice(0, -1))}>
              撤销
            </button>
            <button onClick={() => setCycleIds([])}>清空</button>
          </div>
        </div>
        <div className="cycle-preview-line cycle-builder-preview">
          {cycleIds.length ? (
            cycleIds.map((id, index) => {
              const shift = data.shifts.find((item) => item.id === id);
              return (
                shift && (
                  <span key={`${id}-${index}`} style={colorStyle(shift.color)}>
                    <small>{index + 1}</small>
                    {shift.shortName}
                  </span>
                )
              );
            })
          ) : (
            <p>请依次添加班次</p>
          )}
        </div>
        <div className="cycle-controls custom-cycle-controls">
          {usableShifts.map((shift) => (
            <button
              key={shift.id}
              style={colorStyle(shift.color)}
              onClick={() =>
                cycleIds.length < 62 &&
                setCycleIds((items) => [...items, shift.id])
              }
            >
              <b>＋ {shift.shortName}</b>
              <span>{shift.name}</span>
            </button>
          ))}
        </div>
        <div className="form-grid generator-fields">
          <label>
            <span>循环名称</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span>生效日（第 1 天）</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
        </div>
        <ToggleRow
          label="保存为“我的循环”"
          detail="以后可以一键再次使用"
          checked={saveTemplate}
          onChange={setSaveTemplate}
        />
        <div className="warning-note">
          <Icon name="spark" />
          <span>
            {startDate}{" "}
            之前记录不变；当天及之后会按新循环生成。以后浏览其他年份时会自动延续，不会在年底停止。
          </span>
        </div>
        <div className="sheet-actions">
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            disabled={!cycleIds.length || !startDate || !name.trim()}
            onClick={() =>
              onGenerate(
                {
                  id: makeId("cycle"),
                  name: name.trim(),
                  startDate,
                  shiftIds: cycleIds,
                },
                saveTemplate,
              )
            }
          >
            从生效日开始
          </button>
        </div>
      </section>
    </div>
  );
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  SHIFT_IDS, applyCareerPreset, calculateOvertime, calculateShiftDuration, createDefaultData,
  generateCycleRecords, materializeCycleYear, migrateLegacyData, replaceCycleFromDate,
  type ActiveCycle, type DayRecord,
} from "../app/lib/schedule.ts";

test("旧版 day/night/rest 数据迁移成稳定班次 ID 并保留时长", () => {
  const data = migrateLegacyData(
    { dayHours: 12, nightHours: 12, cycleStart: "2026-01-01", cycle: ["day", "rest", "night"] },
    [{ date: "2026-01-01", shift: "day", hours: 12, planned: true }],
  );
  assert.equal(data.dataVersion, 2);
  assert.equal(data.records[0].shiftId, SHIFT_IDS.day);
  assert.equal(data.shifts.find((shift) => shift.id === SHIFT_IDS.day)?.defaultHours, 12);
  assert.deepEqual(data.activeCycle?.shiftIds, [SHIFT_IDS.day, SHIFT_IDS.rest, SHIFT_IDS.night]);
});

test("4白2休4夜2休按班次 ID 正确循环", () => {
  const data = createDefaultData();
  const template = data.cycleTemplates.find((item) => item.id === "tpl-four-two")!;
  const cycle: ActiveCycle = { id: "cycle-a", name: template.name, startDate: "2026-08-01", shiftIds: template.shiftIds };
  const records = generateCycleRecords(cycle, data.shifts, "2026-08-01", "2026-08-13");
  assert.deepEqual(records.slice(0, 12).map((item) => item.shiftId), template.shiftIds);
  assert.equal(records[12].shiftId, SHIFT_IDS.day);
});

test("单日手动改班后，跨年补全循环不会覆盖该日", () => {
  const data = createDefaultData();
  const cycle: ActiveCycle = { id: "cycle-b", name: "早中晚休", startDate: "2026-12-30", shiftIds: [SHIFT_IDS.morning, SHIFT_IDS.middle, SHIFT_IDS.late, SHIFT_IDS.rest] };
  let next = replaceCycleFromDate(data, cycle, 2027);
  const override: DayRecord = { date: "2027-01-02", shiftId: SHIFT_IDS.day, hours: 12, tagIds: [], completed: false, planned: true, source: "manual" };
  next = { ...next, records: [...next.records.filter((item) => item.date !== override.date), override] };
  next = materializeCycleYear(next, 2027);
  assert.equal(next.records.find((item) => item.date === override.date)?.shiftId, SHIFT_IDS.day);
  assert.equal(next.records.find((item) => item.date === "2027-01-03")?.shiftId, SHIFT_IDS.morning);
});

test("标准工时下 10 小时相对每日 8 小时记录 2 小时额外工时", () => {
  const data = createDefaultData();
  const record: DayRecord = { date: "2026-08-01", shiftId: SHIFT_IDS.day, hours: 10, tagIds: [], completed: false, planned: true, source: "manual" };
  const settings = { ...data.work, system: "standard" as const, standardWeeklyEnabled: false, dailyStandard: 8 };
  assert.equal(calculateOvertime([record], settings, 8), 2);
});

test("综合工时下单日 12 小时不会自动按每日 8 小时判为 4 小时加班", () => {
  const data = createDefaultData();
  const record: DayRecord = { date: "2026-08-01", shiftId: SHIFT_IDS.day, hours: 12, tagIds: [], completed: false, planned: true, source: "manual" };
  assert.equal(calculateOvertime([record], { ...data.work, system: "comprehensive" }, 168), 0);
});

test("关闭加班统计后始终不产生额外工时", () => {
  const data = createDefaultData();
  const record: DayRecord = { date: "2026-08-01", shiftId: SHIFT_IDS.day, hours: 20, tagIds: [], completed: false, planned: true, source: "manual" };
  assert.equal(calculateOvertime([record], { ...data.work, trackOvertime: false }, 0), 0);
});

test("医疗预设补充小夜、大夜和职责标签且不重复", () => {
  const once = applyCareerPreset(createDefaultData(), "medical");
  const twice = applyCareerPreset(once, "medical");
  assert.ok(twice.shifts.some((shift) => shift.id === SHIFT_IDS.smallNight));
  assert.ok(twice.tags.some((tag) => tag.name === "责班"));
  assert.equal(twice.shifts.filter((shift) => shift.id === SHIFT_IDS.bigNight).length, 1);
});

test("跨午夜班次可以正确计算默认时长", () => {
  assert.equal(calculateShiftDuration("20:00", "08:00", true), 12);
  assert.equal(calculateShiftDuration("16:00", "00:00", false), 8);
});

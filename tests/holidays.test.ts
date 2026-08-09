import test from "node:test";
import assert from "node:assert/strict";
import {
  statutoryHolidayName,
  statutoryHolidayShortName,
} from "../app/lib/holidays.ts";

test("固定日期法定节假日会生成日历标签", () => {
  assert.equal(statutoryHolidayName("2026-01-01"), "元旦");
  assert.equal(statutoryHolidayName("2026-05-01"), "劳动节");
  assert.equal(statutoryHolidayName("2026-10-01"), "国庆节");
  assert.equal(statutoryHolidayName("2026-10-03"), "国庆节");
});

test("普通日期不会误显示法定节假日标签", () => {
  assert.equal(statutoryHolidayName("2026-08-08"), "");
});

test("日历使用紧凑但完整可辨认的节假日简称", () => {
  assert.equal(statutoryHolidayShortName("国庆节"), "国庆");
  assert.equal(statutoryHolidayShortName("中秋节"), "中秋");
  assert.equal(statutoryHolidayShortName("春节"), "春节");
});

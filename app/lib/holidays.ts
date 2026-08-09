import { Solar } from "lunar-typescript";

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function statutoryHolidayName(key: string) {
  const date = parseDateKey(key);
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

export function statutoryHolidayShortName(name: string) {
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

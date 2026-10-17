import { HttpError } from "../errors";

// Calendar days are worked out in IST (UTC+05:30)
const IST = "+05:30";

export function istDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d); // YYYY-MM-DD
}

export function istDayRange(date: string): [Date, Date] {
  const start = new Date(`${date}T00:00:00${IST}`);
  if (isNaN(start.getTime())) throw new HttpError(400, "Invalid date", "INVALID_DATE");
  return [start, new Date(start.getTime() + 24 * 60 * 60 * 1000)];
}

export function istMonthRange(month: string): [Date, Date] {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [new Date(`${month}-01T00:00:00${IST}`), new Date(`${next}-01T00:00:00${IST}`)];
}
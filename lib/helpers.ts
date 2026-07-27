import { SealState } from "./types";

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymOf(iso: string): string {
  return iso.slice(0, 7);
}

export function ymIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m;
}

export function shiftMonth(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es", { month: "long", year: "numeric" });
}

export function datesInMonth(ym: string): string[] {
  const total = daysInMonth(ym);
  const arr: string[] = [];
  for (let day = 1; day <= total; day++) {
    arr.push(`${ym}-${String(day).padStart(2, "0")}`);
  }
  return arr;
}

export function lastNDates(n: number): string[] {
  const arr: string[] = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    arr.push(`${y}-${m}-${day}`);
  }
  return arr.reverse();
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
}

export function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es", { weekday: "short", day: "numeric" });
}

export function nextState(state: SealState | undefined): SealState {
  if (!state || state === "no") return "parcial";
  if (state === "parcial") return "logrado";
  return "no";
}

export function scoreFromStates(states: SealState[]): number | null {
  if (!states.length) return null;
  const sum = states.reduce((s, v) => s + (v === "logrado" ? 1 : v === "parcial" ? 0.5 : 0), 0);
  return Math.round((sum / states.length) * 100);
}

// Semana ISO 8601 (lunes a domingo), formato "YYYY-Www"
export function currentWeekPeriod(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function currentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function weekLabel(period: string): string {
  return `Semana ${period.split("-W")[1]}`;
}

export function monthPeriodLabel(period: string): string {
  return monthLabel(period);
}

export function weekPeriodForDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function mondayOfISOWeek(period: string): Date {
  const [yearStr, weekStr] = period.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

export function weekRangeLabel(period: string): string {
  const monday = mondayOfISOWeek(period);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

export function weeksInMonth(ym: string): string[] {
  const dates = datesInMonth(ym);
  const set = new Set<string>();
  dates.forEach((d) => set.add(weekPeriodForDate(d)));
  return Array.from(set).sort();
}

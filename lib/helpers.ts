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

export type Dimension = "dios" | "hermanos" | "trabajo" | "mismo";
export type SealState = "no" | "parcial" | "logrado";
export type Role = "miembro" | "guia";

export const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: "dios", label: "Con Dios" },
  { id: "hermanos", label: "Con los hermanos" },
  { id: "trabajo", label: "Con el trabajo" },
  { id: "mismo", label: "Conmigo mismo" },
];

export const DIM_LABEL: Record<Dimension, string> = {
  dios: "Con Dios",
  hermanos: "Con los hermanos",
  trabajo: "Con el trabajo",
  mismo: "Conmigo mismo",
};

export interface Profile {
  id: string;
  name: string;
  role: Role;
  group_code: string;
  created_at: string;
  reminder_morning: string | null;
  reminder_midday: string | null;
  reminder_night: string | null;
  reminders_enabled: boolean;
}

export interface Point {
  id: string;
  user_id: string;
  name: string;
  dimension: Dimension;
  active: boolean;
  created_at: string;
}

export interface DailyEntry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  note: string | null;
}

export interface EntryValue {
  id: string;
  daily_entry_id: string;
  point_id: string;
  state: SealState;
}

export type PeriodicItemKey =
  | "visita_santuario"
  | "dialogo_pareja"
  | "renovacion_mensual"
  | "confesion"
  | "reunion_grupo";

export interface PeriodicEntry {
  id: string;
  user_id: string;
  item_key: PeriodicItemKey;
  period: string;
  state: SealState;
}

export const WEEKLY_ITEMS: { key: PeriodicItemKey; label: string }[] = [
  { key: "visita_santuario", label: "Visita al Santuario" },
  { key: "dialogo_pareja", label: "Diálogo de pareja" },
];

export const MONTHLY_ITEMS: { key: PeriodicItemKey; label: string }[] = [
  { key: "renovacion_mensual", label: "Renovación mensual" },
  { key: "confesion", label: "Confesión" },
];

export const GROUP_ITEMS: { key: PeriodicItemKey; label: string }[] = [
  { key: "reunion_grupo", label: "Reunión de grupo" },
];

export interface PadrePhrase {
  id: string;
  phrase: string;
  source: string | null;
}

export interface GroupPurpose {
  id: string;
  group_code: string;
  period: string;
  text: string;
}

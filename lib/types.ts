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

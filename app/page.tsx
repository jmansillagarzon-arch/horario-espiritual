"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Seal from "@/components/Seal";
import { subscribeToPush, subscriptionToRow } from "@/lib/push";
import { DIMENSIONS, DIM_LABEL, Dimension, Profile, Point, SealState } from "@/lib/types";
import {
  todayISO,
  ymOf,
  ymIndex,
  shiftMonth,
  monthLabel,
  datesInMonth,
  lastNDates,
  formatDate,
  formatDay,
  nextState,
  scoreFromStates,
} from "@/lib/helpers";

type DayData = { note: string; values: Record<string, SealState> };
type GroupMember = Profile & { pointCount: number; weekScore: number | null };

export default function HomePage() {
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [tab, setTab] = useState<"hoy" | "puntos" | "historial" | "grupo" | "recordatorios">("hoy");
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderMsg, setReminderMsg] = useState("");

  const [todayEntryId, setTodayEntryId] = useState<string | null>(null);
  const [todayData, setTodayData] = useState<DayData>({ note: "", values: {} });

  const [newPointName, setNewPointName] = useState("");
  const [newPointDim, setNewPointDim] = useState<Dimension>("dios");

  const [historyYm, setHistoryYm] = useState(todayISO().slice(0, 7));
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<Record<string, DayData>>({});

  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPoints, setExpandedPoints] = useState<Point[]>([]);
  const [expandedData, setExpandedData] = useState<DayData>({ note: "", values: {} });

  const currentYm = todayISO().slice(0, 7);

  // ---------- boot: session + profile + today ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setSession(data.session);
      await loadProfileAndToday(data.session.user.id);
      setBooted(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!sess) router.replace("/login");
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfileAndToday(userId: string) {
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(prof as Profile | null);

    const { data: pts } = await supabase
      .from("points")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    setPoints((pts as Point[]) || []);

    await loadToday(userId);
  }

  async function loadToday(userId: string) {
    const today = todayISO();
    const { data: entry } = await supabase
      .from("daily_entries")
      .select("id, note, entry_values(state, point_id)")
      .eq("user_id", userId)
      .eq("entry_date", today)
      .maybeSingle();

    if (entry) {
      setTodayEntryId(entry.id as string);
      const values: Record<string, SealState> = {};
      ((entry as any).entry_values || []).forEach((ev: any) => {
        values[ev.point_id] = ev.state;
      });
      setTodayData({ note: (entry as any).note || "", values });
    } else {
      setTodayEntryId(null);
      setTodayData({ note: "", values: {} });
    }
  }

  async function ensureTodayEntry(): Promise<string> {
    if (todayEntryId) return todayEntryId;
    if (!session) throw new Error("Sin sesión");
    const { data, error } = await supabase
      .from("daily_entries")
      .insert({ user_id: session.user.id, entry_date: todayISO() })
      .select("id")
      .single();
    if (error) throw error;
    setTodayEntryId(data.id as string);
    return data.id as string;
  }

  async function cyclePoint(pointId: string) {
    const current = todayData.values[pointId] || "no";
    const updated = nextState(current);
    setTodayData((prev) => ({ ...prev, values: { ...prev.values, [pointId]: updated } }));
    try {
      const entryId = await ensureTodayEntry();
      await supabase
        .from("entry_values")
        .upsert({ daily_entry_id: entryId, point_id: pointId, state: updated }, { onConflict: "daily_entry_id,point_id" });
    } catch (e) {
      /* revert not critical, next reload will resync */
    }
  }

  async function saveNote(note: string) {
    setTodayData((prev) => ({ ...prev, note }));
    try {
      const entryId = await ensureTodayEntry();
      await supabase.from("daily_entries").update({ note }).eq("id", entryId);
    } catch (e) {}
  }

  async function addPoint(e: React.FormEvent) {
    e.preventDefault();
    if (!newPointName.trim() || !session) return;
    const { data, error } = await supabase
      .from("points")
      .insert({ user_id: session.user.id, name: newPointName.trim(), dimension: newPointDim })
      .select()
      .single();
    if (!error && data) {
      setPoints((prev) => [...prev, data as Point]);
      setNewPointName("");
    }
  }

  async function removePoint(pointId: string) {
    setPoints((prev) => prev.filter((p) => p.id !== pointId));
    await supabase.from("points").update({ active: false }).eq("id", pointId);
  }

  // ---------- recordatorios ----------
  async function handleEnableReminders() {
    if (!session || !profile) return;
    setReminderSaving(true);
    setReminderMsg("");
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        setReminderMsg("No pudimos activar las notificaciones. Revisá el permiso del navegador.");
        setReminderSaving(false);
        return;
      }
      const row = subscriptionToRow(sub);
      await supabase.from("push_subscriptions").upsert({ user_id: session.user.id, ...row }, { onConflict: "endpoint" });
      const { data: updated } = await supabase
        .from("profiles")
        .update({ reminders_enabled: true })
        .eq("id", session.user.id)
        .select()
        .single();
      if (updated) setProfile(updated as Profile);
    } catch (e) {
      setReminderMsg("Ocurrió un error activando los recordatorios.");
    }
    setReminderSaving(false);
  }

  async function handleDisableReminders() {
    if (!session) return;
    const { data: updated } = await supabase
      .from("profiles")
      .update({ reminders_enabled: false })
      .eq("id", session.user.id)
      .select()
      .single();
    if (updated) setProfile(updated as Profile);
  }

  async function saveReminderTime(field: "reminder_morning" | "reminder_midday" | "reminder_night", value: string) {
    if (!session || !profile) return;
    setProfile({ ...profile, [field]: value ? `${value}:00` : null });
    await supabase
      .from("profiles")
      .update({ [field]: value || null })
      .eq("id", session.user.id);
  }

  // ---------- historial ----------
  const loadHistoryMonth = useCallback(
    async (ym: string) => {
      if (!session) return;
      setHistoryLoading(true);
      const dates = datesInMonth(ym).filter((d) => d <= todayISO());
      const start = dates[0];
      const end = dates[dates.length - 1];
      const { data } = await supabase
        .from("daily_entries")
        .select("entry_date, note, entry_values(state, point_id)")
        .eq("user_id", session.user.id)
        .gte("entry_date", start)
        .lte("entry_date", end);

      const map: Record<string, DayData> = {};
      (data || []).forEach((row: any) => {
        const values: Record<string, SealState> = {};
        (row.entry_values || []).forEach((ev: any) => {
          values[ev.point_id] = ev.state;
        });
        map[row.entry_date] = { note: row.note || "", values };
      });
      setHistoryData(map);
      setHistoryLoading(false);
    },
    [session]
  );

  useEffect(() => {
    if (tab === "historial") loadHistoryMonth(historyYm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, historyYm, session]);

  // ---------- grupo (solo guía) ----------
  const loadGroup = useCallback(async () => {
    if (!profile) return;
    setGroupLoading(true);
    const { data: members } = await supabase.from("profiles").select("*").eq("group_code", profile.group_code);
    const memberList = (members as Profile[]) || [];
    const memberIds = memberList.map((m) => m.id);

    const { data: pts } = await supabase.from("points").select("id, user_id").eq("active", true).in("user_id", memberIds);
    const pointCounts: Record<string, number> = {};
    (pts || []).forEach((p: any) => {
      pointCounts[p.user_id] = (pointCounts[p.user_id] || 0) + 1;
    });

    const sevenDaysAgo = lastNDates(7)[0];
    const { data: entries } = await supabase
      .from("daily_entries")
      .select("user_id, entry_date, entry_values(state)")
      .in("user_id", memberIds)
      .gte("entry_date", sevenDaysAgo);

    const scoreAgg: Record<string, { done: number; total: number }> = {};
    (entries || []).forEach((row: any) => {
      const agg = (scoreAgg[row.user_id] ||= { done: 0, total: 0 });
      (row.entry_values || []).forEach((ev: any) => {
        agg.total += 1;
        if (ev.state === "logrado") agg.done += 1;
        else if (ev.state === "parcial") agg.done += 0.5;
      });
    });

    const withScores: GroupMember[] = memberList
      .map((m) => {
        const agg = scoreAgg[m.id];
        return {
          ...m,
          pointCount: pointCounts[m.id] || 0,
          weekScore: agg && agg.total ? Math.round((agg.done / agg.total) * 100) : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    setGroupMembers(withScores);
    setGroupLoading(false);
  }, [profile]);

  useEffect(() => {
    if (tab === "grupo") loadGroup();
  }, [tab, loadGroup]);

  async function toggleExpand(memberId: string) {
    if (expandedId === memberId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(memberId);
    const { data: pts } = await supabase
      .from("points")
      .select("*")
      .eq("user_id", memberId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    setExpandedPoints((pts as Point[]) || []);

    const { data: entry } = await supabase
      .from("daily_entries")
      .select("note, entry_values(state, point_id)")
      .eq("user_id", memberId)
      .eq("entry_date", todayISO())
      .maybeSingle();
    const values: Record<string, SealState> = {};
    ((entry as any)?.entry_values || []).forEach((ev: any) => {
      values[ev.point_id] = ev.state;
    });
    setExpandedData({ note: (entry as any)?.note || "", values });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!booted) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
        <p className="he-mono text-sm" style={{ color: "#5b5340" }}>
          abriendo el cuaderno...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center px-4" style={{ minHeight: "100vh" }}>
        <div className="he-page rounded-lg p-6 pl-10 max-w-sm text-center">
          <p className="text-sm" style={{ color: "#5b5340" }}>
            No encontramos tu perfil todavía. Si acabas de registrarte, confirma tu correo e inicia sesión de nuevo.
          </p>
          <button className="he-btn-primary mt-4" onClick={handleSignOut}>
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  const isGuia = profile.role === "guia";
  const historyDates = datesInMonth(historyYm).filter((d) => d <= todayISO());
  const historyScores = historyDates
    .map((d) => scoreFromStates(Object.values(historyData[d]?.values || {})))
    .filter((v): v is number => v !== null);
  const monthAvg = historyScores.length
    ? Math.round(historyScores.reduce((a, b) => a + b, 0) / historyScores.length)
    : null;
  const canGoOlder = true; // sin límite: la base de datos guarda todo el historial
  const canGoNewer = historyYm !== currentYm;

  return (
    <div className="px-3 py-5 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-start justify-between mb-4 px-1">
          <div>
            <p className="he-mono text-xs" style={{ color: "#8C4A3D" }}>
              GRUPO {profile.group_code}
            </p>
            <h1 className="he-display text-xl" style={{ color: "#1F3B5C" }}>
              Horario Espiritual
            </h1>
            <p className="text-xs" style={{ color: "#5b5340" }}>
              {profile.name} · {isGuia ? "Guía" : "Miembro"} · <span className="he-mono">{formatDate(todayISO())}</span>
            </p>
          </div>
          <button onClick={handleSignOut} className="he-btn-ghost">
            Cerrar sesión
          </button>
        </header>

        <nav className="flex gap-1 px-1">
          <button className={`he-tab ${tab === "hoy" ? "active" : ""}`} onClick={() => setTab("hoy")}>
            Hoy
          </button>
          <button className={`he-tab ${tab === "puntos" ? "active" : ""}`} onClick={() => setTab("puntos")}>
            Mis puntos
          </button>
          <button className={`he-tab ${tab === "historial" ? "active" : ""}`} onClick={() => setTab("historial")}>
            Historial
          </button>
          <button className={`he-tab ${tab === "recordatorios" ? "active" : ""}`} onClick={() => setTab("recordatorios")}>
            Recordatorios
          </button>
          {isGuia && (
            <button className={`he-tab ${tab === "grupo" ? "active" : ""}`} onClick={() => setTab("grupo")}>
              Grupo
            </button>
          )}
        </nav>

        <main className="he-page rounded-b-lg rounded-tr-lg p-5 pl-10">
          {tab === "hoy" && (
            <div>
              {points.length === 0 ? (
                <div className="text-center py-8">
                  <p className="he-display text-lg mb-2" style={{ color: "#1F3B5C" }}>
                    Página en blanco
                  </p>
                  <p className="text-sm mb-4" style={{ color: "#5b5340" }}>
                    Empieza con dos o tres puntos concretos: la oración de la mañana, un tiempo de estudio, el examen
                    de la noche.
                  </p>
                  <button className="he-btn-primary" onClick={() => setTab("puntos")}>
                    Agregar mis puntos
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {points.map((p) => {
                      const state = todayData.values[p.id] || "no";
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="he-mono text-[10px]" style={{ color: "#8C4A3D" }}>
                              {DIM_LABEL[p.dimension]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs he-mono" style={{ color: "#5b5340", width: 62, textAlign: "right" }}>
                              {state === "logrado" ? "logrado" : state === "parcial" ? "parcial" : "aún no"}
                            </span>
                            <Seal state={state} onClick={() => cyclePoint(p.id)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <label className="he-mono text-xs block mb-1" style={{ color: "#5b5340" }}>
                      NOTA DEL DÍA (OPCIONAL)
                    </label>
                    <textarea
                      className="he-input"
                      rows={2}
                      key={todayISO()}
                      defaultValue={todayData.note}
                      onBlur={(e) => saveNote(e.target.value)}
                      placeholder="Un vistazo a cómo fue el día..."
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "puntos" && (
            <div>
              <form onSubmit={addPoint} className="mb-5 space-y-2">
                <label className="he-mono text-xs block" style={{ color: "#5b5340" }}>
                  NUEVO PUNTO
                </label>
                <input
                  className="he-input"
                  value={newPointName}
                  onChange={(e) => setNewPointName(e.target.value)}
                  placeholder="ej. Oración de la mañana"
                />
                <div className="flex flex-wrap gap-1">
                  {DIMENSIONS.map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => setNewPointDim(d.id)}
                      className="he-chip"
                      style={newPointDim === d.id ? { background: "#1F3B5C", color: "#ECE6D6" } : { cursor: "pointer", border: "none" }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <button type="submit" className="he-btn-primary">
                  Añadir punto
                </button>
              </form>
              <div className="space-y-2">
                {points.length === 0 && (
                  <p className="text-sm" style={{ color: "#5b5340" }}>
                    Todavía no tienes puntos. Empieza con pocos y concretos.
                  </p>
                )}
                {points.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2" style={{ borderColor: "rgba(36,31,24,0.1)" }}>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <span className="he-chip mt-1 inline-block">{DIM_LABEL[p.dimension]}</span>
                    </div>
                    <button className="he-btn-ghost" onClick={() => removePoint(p.id)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "historial" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <button className="he-btn-ghost" onClick={() => setHistoryYm(shiftMonth(historyYm, -1))} disabled={!canGoOlder}>
                  ← anterior
                </button>
                <div className="text-center">
                  <p className="he-display text-sm capitalize" style={{ color: "#1F3B5C" }}>
                    {monthLabel(historyYm)}
                  </p>
                  <p className="he-mono text-[10px]" style={{ color: "#8C4A3D" }}>
                    {monthAvg === null ? "sin datos" : `promedio del mes: ${monthAvg}%`}
                  </p>
                </div>
                <button
                  className="he-btn-ghost"
                  onClick={() => canGoNewer && setHistoryYm(shiftMonth(historyYm, 1))}
                  disabled={!canGoNewer}
                >
                  siguiente →
                </button>
              </div>
              {historyLoading ? (
                <p className="text-sm he-mono" style={{ color: "#5b5340" }}>
                  cargando...
                </p>
              ) : (
                <div className="space-y-3">
                  {historyDates
                    .slice()
                    .reverse()
                    .map((d) => {
                      const e = historyData[d];
                      const pct = scoreFromStates(Object.values(e?.values || {}));
                      return (
                        <div key={d} className="flex items-center justify-between">
                          <span className="he-mono text-xs capitalize" style={{ color: "#5b5340", width: 70 }}>
                            {formatDay(d)}
                          </span>
                          <div className="flex gap-1 flex-1 justify-center flex-wrap">
                            {points.map((p) => (
                              <Seal key={p.id} state={e?.values?.[p.id] || "no"} size={16} disabled />
                            ))}
                          </div>
                          <span className="he-mono text-xs" style={{ color: "#1F3B5C", width: 42, textAlign: "right" }}>
                            {pct === null ? "—" : `${pct}%`}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {tab === "recordatorios" && (
            <div>
              <p className="text-sm mb-4" style={{ color: "#5b5340" }}>
                Elegí hasta 3 momentos del día para recibir un recordatorio — mañana, mediodía y noche. Si a esa hora
                ya marcaste todos tus puntos, no te vamos a molestar.
              </p>

              {!profile.reminders_enabled ? (
                <button className="he-btn-primary" onClick={handleEnableReminders} disabled={reminderSaving}>
                  {reminderSaving ? "Activando..." : "Activar recordatorios en este dispositivo"}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="he-chip">Recordatorios activos</span>
                    <button className="he-btn-ghost" onClick={handleDisableReminders}>
                      Desactivar
                    </button>
                  </div>

                  <div>
                    <label className="he-mono text-xs block mb-1" style={{ color: "#5b5340" }}>
                      MAÑANA
                    </label>
                    <input
                      type="time"
                      step={900}
                      className="he-input"
                      defaultValue={profile.reminder_morning?.slice(0, 5) || ""}
                      onBlur={(e) => saveReminderTime("reminder_morning", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="he-mono text-xs block mb-1" style={{ color: "#5b5340" }}>
                      MEDIODÍA
                    </label>
                    <input
                      type="time"
                      step={900}
                      className="he-input"
                      defaultValue={profile.reminder_midday?.slice(0, 5) || ""}
                      onBlur={(e) => saveReminderTime("reminder_midday", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="he-mono text-xs block mb-1" style={{ color: "#5b5340" }}>
                      NOCHE
                    </label>
                    <input
                      type="time"
                      step={900}
                      className="he-input"
                      defaultValue={profile.reminder_night?.slice(0, 5) || ""}
                      onBlur={(e) => saveReminderTime("reminder_night", e.target.value)}
                    />
                  </div>
                  <p className="text-xs" style={{ color: "#8C4A3D" }}>
                    Dejá un horario vacío si no querés recordatorio en ese momento del día.
                  </p>
                </div>
              )}
              {reminderMsg && (
                <p className="text-xs mt-3" style={{ color: "#8C4A3D" }}>
                  {reminderMsg}
                </p>
              )}
            </div>
          )}

          {tab === "grupo" && isGuia && (
            <div>
              {groupLoading ? (
                <p className="text-sm he-mono" style={{ color: "#5b5340" }}>
                  cargando grupo...
                </p>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm" style={{ color: "#5b5340" }}>
                  Todavía nadie más se unió con el código {profile.group_code}.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs mb-2" style={{ color: "#8C4A3D" }}>
                    Promedio de cumplimiento, últimos 7 días.
                  </p>
                  {groupMembers.map((m) => (
                    <div key={m.id} className="border-b pb-2" style={{ borderColor: "rgba(36,31,24,0.1)" }}>
                      <button className="w-full flex items-center justify-between" onClick={() => toggleExpand(m.id)}>
                        <div className="text-left">
                          <p className="text-sm font-medium">
                            {m.name} {m.role === "guia" && <span className="he-chip ml-1">Guía</span>}
                          </p>
                          <p className="he-mono text-[10px]" style={{ color: "#8C4A3D" }}>
                            {m.pointCount} punto{m.pointCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="he-mono text-sm" style={{ color: "#1F3B5C" }}>
                          {m.weekScore === null ? "sin datos" : `${m.weekScore}%`}
                        </span>
                      </button>
                      {expandedId === m.id && (
                        <div className="mt-2 pl-2 space-y-1">
                          {expandedPoints.length === 0 && (
                            <p className="text-xs" style={{ color: "#5b5340" }}>
                              Sin puntos definidos todavía.
                            </p>
                          )}
                          {expandedPoints.map((p) => (
                            <div key={p.id} className="flex items-center justify-between">
                              <span className="text-xs">{p.name}</span>
                              <Seal state={expandedData.values[p.id] || "no"} size={16} disabled />
                            </div>
                          ))}
                          {expandedData.note && (
                            <p className="text-xs italic mt-1" style={{ color: "#5b5340" }}>
                              "{expandedData.note}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
        <p className="text-center he-mono text-[10px] mt-4" style={{ color: "#8C4A3D" }}>
          "Educar significa concebir vida, despertar vida y transmitir vida." — P. José Kentenich
        </p>
      </div>
    </div>
  );
}

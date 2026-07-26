import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIMEZONE = "America/Argentina/Buenos_Aires";

function currentSlotHHMM(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")!.value;
  const minute = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  const roundedMinute = Math.floor(minute / 15) * 15;
  return `${hour}:${String(roundedMinute).padStart(2, "0")}`;
}

function todayInTZ(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function slotLabelFor(profile: any, slot: string): string | null {
  if (profile.reminder_morning?.slice(0, 5) === slot) return "de la mañana";
  if (profile.reminder_midday?.slice(0, 5) === slot) return "del mediodía";
  if (profile.reminder_night?.slice(0, 5) === slot) return "de la noche";
  return null;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "Faltan claves VAPID" }, { status: 500 });
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT_EMAIL || "no-reply@example.com"}`,
    vapidPublic,
    vapidPrivate
  );

  const admin = getSupabaseAdmin();
  const slot = currentSlotHHMM();
  const today = todayInTZ();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, name, reminder_morning, reminder_midday, reminder_night")
    .eq("reminders_enabled", true)
    .or(`reminder_morning.eq.${slot},reminder_midday.eq.${slot},reminder_night.eq.${slot}`);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  let sent = 0;
  let skippedComplete = 0;
  let skippedNoPoints = 0;

  for (const profile of profiles || []) {
    const label = slotLabelFor(profile, slot);
    if (!label) continue;

    const { data: points } = await admin
      .from("points")
      .select("id")
      .eq("user_id", profile.id)
      .eq("active", true);

    if (!points || points.length === 0) {
      skippedNoPoints += 1;
      continue;
    }

    const { data: entry } = await admin
      .from("daily_entries")
      .select("id, entry_values(point_id, state)")
      .eq("user_id", profile.id)
      .eq("entry_date", today)
      .maybeSingle();

    const doneIds = new Set(
      ((entry as any)?.entry_values || [])
        .filter((v: any) => v.state === "logrado")
        .map((v: any) => v.point_id)
    );
    const allDone = points.every((p) => doneIds.has(p.id));
    if (allDone) {
      skippedComplete += 1;
      continue;
    }

    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", profile.id);

    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Horario Espiritual",
            body: `Recordatorio ${label}: todavía te quedan puntos por marcar hoy.`,
          })
        );
        sent += 1;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ slot, matched: profiles?.length || 0, sent, skippedComplete, skippedNoPoints });
}

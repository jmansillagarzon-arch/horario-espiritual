-- Recordatorios: horarios y suscripciones push
-- Corré esto en Supabase → SQL Editor → Run

alter table public.profiles
  add column if not exists reminder_morning time,
  add column if not exists reminder_midday time,
  add column if not exists reminder_night time,
  add column if not exists reminders_enabled boolean not null default false;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

-- Habilitar las extensiones que disparan el chequeo cada 15 minutos
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- IMPORTANTE: después de correr esto, reemplazá:
--   - TU-URL-DE-VERCEL por tu dominio real
--   - TU-CRON-SECRET por una clave inventada por vos (cualquier texto largo al azar)
-- y también agregá esa misma clave como variable de entorno CRON_SECRET en Vercel.
select cron.schedule(
  'horario-espiritual-recordatorios',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://TU-URL-DE-VERCEL.vercel.app/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer TU-CRON-SECRET')
  );
  $$
);

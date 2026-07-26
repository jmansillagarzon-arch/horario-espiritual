-- Puntos periódicos: semanal, mensual y compromiso de grupo
-- Corré esto en Supabase → SQL Editor → Run

create table if not exists public.periodic_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null check (item_key in (
    'visita_santuario', 'dialogo_pareja',      -- semanales
    'renovacion_mensual', 'confesion',          -- mensuales
    'reunion_grupo'                             -- compromiso de grupo (mensual)
  )),
  period text not null, -- semanal: 'YYYY-Www' (ej. '2026-W30'); mensual: 'YYYY-MM'
  state text not null check (state in ('no','parcial','logrado')),
  updated_at timestamptz not null default now(),
  unique (user_id, item_key, period)
);

alter table public.periodic_entries enable row level security;

create policy "periodic_entries_select_own_or_group_guia"
  on public.periodic_entries for select
  using (
    user_id = auth.uid()
    or (public.my_role() = 'guia' and public.group_code_of(periodic_entries.user_id) = public.my_group_code())
  );

create policy "periodic_entries_insert_own"
  on public.periodic_entries for insert
  with check (user_id = auth.uid());

create policy "periodic_entries_update_own"
  on public.periodic_entries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_periodic_entries_user on public.periodic_entries (user_id, item_key, period);

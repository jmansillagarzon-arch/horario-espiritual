-- Propósito del Grupo/Curso: texto fijado por el/la guía, uno por mes
-- Corré esto en Supabase → SQL Editor → Run

create table if not exists public.group_purposes (
  id uuid primary key default gen_random_uuid(),
  group_code text not null,
  period text not null, -- 'YYYY-MM'
  text text not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (group_code, period)
);

alter table public.group_purposes enable row level security;

-- Cualquier miembro del mismo grupo puede leerlo
create policy "group_purposes_select_group"
  on public.group_purposes for select
  using (group_code = public.my_group_code());

-- Solo el/la guía puede fijarlo o cambiarlo
create policy "group_purposes_insert_guia"
  on public.group_purposes for insert
  with check (public.my_role() = 'guia' and group_code = public.my_group_code());

create policy "group_purposes_update_guia"
  on public.group_purposes for update
  using (public.my_role() = 'guia' and group_code = public.my_group_code())
  with check (public.my_role() = 'guia' and group_code = public.my_group_code());

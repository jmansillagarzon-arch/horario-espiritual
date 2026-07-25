-- Horario Espiritual · esquema de base de datos
-- Ejecutar completo en Supabase → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('miembro','guia')),
  group_code text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_group_guia"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role = 'guia'
        and me.group_code = profiles.group_code
    )
  );

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, group_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Sin nombre'),
    coalesce(new.raw_user_meta_data->>'role', 'miembro'),
    upper(coalesce(new.raw_user_meta_data->>'group_code', 'SINCODIGO'))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ POINTS (puntos del Horario Espiritual) ============
create table if not exists public.points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dimension text not null check (dimension in ('dios','hermanos','trabajo','mismo')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.points enable row level security;

create policy "points_select_own_or_group_guia"
  on public.points for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      join public.profiles owner on owner.id = points.user_id
      where me.id = auth.uid() and me.role = 'guia' and me.group_code = owner.group_code
    )
  );

create policy "points_insert_own"
  on public.points for insert
  with check (user_id = auth.uid());

create policy "points_update_own"
  on public.points for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "points_delete_own"
  on public.points for delete
  using (user_id = auth.uid());

-- ============ DAILY_ENTRIES (una fila por usuario y día) ============
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.daily_entries enable row level security;

create policy "daily_entries_select_own_or_group_guia"
  on public.daily_entries for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      join public.profiles owner on owner.id = daily_entries.user_id
      where me.id = auth.uid() and me.role = 'guia' and me.group_code = owner.group_code
    )
  );

create policy "daily_entries_insert_own"
  on public.daily_entries for insert
  with check (user_id = auth.uid());

create policy "daily_entries_update_own"
  on public.daily_entries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============ ENTRY_VALUES (estado logrado/parcial/no por punto y día) ============
create table if not exists public.entry_values (
  id uuid primary key default gen_random_uuid(),
  daily_entry_id uuid not null references public.daily_entries(id) on delete cascade,
  point_id uuid not null references public.points(id) on delete cascade,
  state text not null check (state in ('no','parcial','logrado')),
  unique (daily_entry_id, point_id)
);

alter table public.entry_values enable row level security;

create policy "entry_values_select_own_or_group_guia"
  on public.entry_values for select
  using (
    exists (
      select 1 from public.daily_entries de
      where de.id = entry_values.daily_entry_id
        and (
          de.user_id = auth.uid()
          or exists (
            select 1 from public.profiles me
            join public.profiles owner on owner.id = de.user_id
            where me.id = auth.uid() and me.role = 'guia' and me.group_code = owner.group_code
          )
        )
    )
  );

create policy "entry_values_insert_own"
  on public.entry_values for insert
  with check (
    exists (
      select 1 from public.daily_entries de
      where de.id = entry_values.daily_entry_id and de.user_id = auth.uid()
    )
  );

create policy "entry_values_update_own"
  on public.entry_values for update
  using (
    exists (
      select 1 from public.daily_entries de
      where de.id = entry_values.daily_entry_id and de.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_entries de
      where de.id = entry_values.daily_entry_id and de.user_id = auth.uid()
    )
  );

-- Índices para consultas de historial y grupo
create index if not exists idx_daily_entries_user_date on public.daily_entries (user_id, entry_date);
create index if not exists idx_points_user on public.points (user_id);
create index if not exists idx_entry_values_daily_entry on public.entry_values (daily_entry_id);

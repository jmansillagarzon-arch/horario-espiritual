-- Arregla la recursión infinita en las políticas RLS
-- Corré esto completo en Supabase → SQL Editor → Run

-- 1) Funciones auxiliares que evitan la recursión (bypasean RLS internamente)
create or replace function public.my_role()
returns text
language sql security definer stable set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.my_group_code()
returns text
language sql security definer stable set search_path = public
as $$ select group_code from public.profiles where id = auth.uid(); $$;

create or replace function public.group_code_of(uid uuid)
returns text
language sql security definer stable set search_path = public
as $$ select group_code from public.profiles where id = uid; $$;

-- 2) Reemplazar la política de profiles (la que causaba el loop)
drop policy if exists "profiles_select_own_or_group_guia" on public.profiles;
create policy "profiles_select_own_or_group_guia"
  on public.profiles for select
  using (
    id = auth.uid()
    or (public.my_role() = 'guia' and public.my_group_code() = profiles.group_code)
  );

-- 3) Reemplazar la política de points
drop policy if exists "points_select_own_or_group_guia" on public.points;
create policy "points_select_own_or_group_guia"
  on public.points for select
  using (
    user_id = auth.uid()
    or (public.my_role() = 'guia' and public.group_code_of(points.user_id) = public.my_group_code())
  );

-- 4) Reemplazar la política de daily_entries
drop policy if exists "daily_entries_select_own_or_group_guia" on public.daily_entries;
create policy "daily_entries_select_own_or_group_guia"
  on public.daily_entries for select
  using (
    user_id = auth.uid()
    or (public.my_role() = 'guia' and public.group_code_of(daily_entries.user_id) = public.my_group_code())
  );

-- 5) Reemplazar la política de entry_values
drop policy if exists "entry_values_select_own_or_group_guia" on public.entry_values;
create policy "entry_values_select_own_or_group_guia"
  on public.entry_values for select
  using (
    exists (
      select 1 from public.daily_entries de
      where de.id = entry_values.daily_entry_id
        and (
          de.user_id = auth.uid()
          or (public.my_role() = 'guia' and public.group_code_of(de.user_id) = public.my_group_code())
        )
    )
  );

-- Teléfono del Padre: frases para reflexión, una al azar por visita
-- Corré esto en Supabase → SQL Editor → Run

create table if not exists public.padre_phrases (
  id uuid primary key default gen_random_uuid(),
  phrase text not null,
  source text, -- opcional: de dónde salió (ej. "Tarjetas Teléfono del Padre", "Carta a...", etc.)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.padre_phrases enable row level security;

-- Cualquier usuario logueado puede leer las frases
create policy "padre_phrases_select_all"
  on public.padre_phrases for select
  using (auth.uid() is not null);

-- Solo el/la guía puede agregar, editar o borrar frases
create policy "padre_phrases_insert_guia"
  on public.padre_phrases for insert
  with check (public.my_role() = 'guia');

create policy "padre_phrases_update_guia"
  on public.padre_phrases for update
  using (public.my_role() = 'guia')
  with check (public.my_role() = 'guia');

create policy "padre_phrases_delete_guia"
  on public.padre_phrases for delete
  using (public.my_role() = 'guia');

-- Una frase de arranque para probar que la función funciona:
-- su propio epitafio, elegido por él mismo, en su tumba en el Monte Schoenstatt.
insert into public.padre_phrases (phrase, source) values
  ('Dilexit Ecclesiam — Amó a la Iglesia', 'Epitafio elegido por el P. José Kentenich');

-- ================================================================
-- PARA AGREGAR MÁS FRASES: copiá y repetí esta línea las veces que
-- necesites, cambiando el texto entre comillas. 'source' es opcional
-- (podés dejarlo como null si no lo sabés).
-- ================================================================
-- insert into public.padre_phrases (phrase, source) values
--   ('Acá va el texto de la frase', 'Tarjetas Teléfono del Padre');

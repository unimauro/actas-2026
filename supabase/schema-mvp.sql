-- Esquema MVP para Supabase (coincide con lib/store.ts).
-- El acta completa se guarda como JSONB; numero_mesa es la llave anti-duplicado.

create table if not exists actas (
  id          uuid primary key default gen_random_uuid(),
  numero_mesa text not null unique,           -- <-- ANTIDUPLICADO (6 dígitos)
  estado      text not null default 'pendiente_revision',
  suma_valida boolean default false,
  data        jsonb not null,                 -- ActaData completa
  meta        jsonb,                          -- email, personero, ip, user_agent
  created_at  timestamptz default now()
);

create index if not exists actas_distrito_idx on actas ((data->>'distrito'));
create index if not exists actas_estado_idx on actas (estado);

-- RLS: lectura pública (dashboard).
alter table actas enable row level security;

create policy "lectura publica" on actas
  for select using (true);

-- OPCIÓN A (recomendada): la API inserta con SUPABASE_SECRET_KEY (sb_secret_...),
-- que evita RLS. No necesitas la policy de insert de abajo.

-- OPCIÓN B (rápida, sin llave secreta): permite insertar con la llave publishable.
-- La API igual exige token por correo antes de registrar, pero la base queda
-- técnicamente abierta a inserciones directas. Úsala solo para el MVP.
create policy "insert mvp" on actas
  for insert with check (true);

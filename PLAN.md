# Actas Abiertas 2026 — Conteo Ciudadano (PVT)

Plan técnico del MVP. Verificación ciudadana de la Segunda Elección Presidencial 2026 (Perú).
Subida de actas ONPE → OCR con IA → corrección humana → conteo en vivo + antiduplicados.

- **Repo sugerido:** `unimauro/actas-2026`
- **Stack:** Next.js 15 (App Router) + Supabase (Postgres + Storage + Auth + Realtime) + Vision LLM, deploy en **Netlify** (Vercel ya tocó capa gratuita).
- **OCR:** Gemini Flash (primario) → Claude vision (fallback solo si falla la validación aritmética).
- **Principio rector:** la IA pre-llena, el humano confirma, la aritmética valida. El acta original es inmutable (transparencia).

---

## 1. Modelo de datos (Postgres / Supabase)

```sql
-- Catálogo de organizaciones (2da vuelta: 2 partidos)
create table organizaciones (
  id          serial primary key,
  nombre      text not null,          -- 'Fuerza Popular', 'Juntos por el Perú'
  sigla       text,                   -- 'K', 'JP'
  orden       int
);

-- Acta = una mesa de sufragio (la dedup es por numero_mesa)
create type acta_estado as enum ('pendiente_revision','verificada','conflicto','rechazada');
create type acta_origen as enum ('web','whatsapp');

create table actas (
  id                 uuid primary key default gen_random_uuid(),
  numero_mesa        text not null unique,           -- '040293'  <-- LLAVE ANTIDUPLICADO
  codigo_barra       text,                           -- '040293-91-M'
  departamento       text,
  provincia          text,
  distrito           text,
  electores_habiles  int,
  fecha              date,
  hora_inicio        text,
  hora_fin           text,
  total_emitidos     int,
  ciudadanos_votaron int,
  estado             acta_estado not null default 'pendiente_revision',
  suma_valida        boolean default false,          -- pasó el check aritmético
  img_original_path  text not null,                  -- bucket privado (auditoría, inmutable)
  img_optim_path     text,                           -- bucket público (mostrar)
  ocr_modelo         text,                           -- 'gemini-flash' | 'claude'
  ocr_raw            jsonb,                          -- respuesta cruda del LLM
  ocr_confianza      jsonb,                          -- confianza por campo
  origen             acta_origen not null default 'web',
  subido_por         uuid references auth.users,
  geo                jsonb,
  created_at         timestamptz default now(),
  confirmed_at       timestamptz,
  confirmed_by       uuid references auth.users
);

-- Votos normalizados: 1 fila por línea del acta (partido / blanco / nulo / impugnado)
create type voto_tipo as enum ('partido','blanco','nulo','impugnado');

create table votos (
  id              uuid primary key default gen_random_uuid(),
  acta_id         uuid not null references actas(id) on delete cascade,
  tipo            voto_tipo not null,
  organizacion_id int references organizaciones(id), -- null si no es partido
  valor           int not null default 0,
  confianza       real,                              -- 0..1 del OCR
  corregido_manual boolean default false
);
create index on votos(acta_id);

-- Cuando alguien sube una mesa ya existente con números distintos
create table discrepancias (
  id            uuid primary key default gen_random_uuid(),
  acta_id       uuid not null references actas(id),
  reportado_por uuid references auth.users,
  valores_nuevos jsonb not null,
  img_path      text,
  created_at    timestamptz default now()
);
```

**Reglas:** RLS activado. Lectura pública del dashboard vía vista agregada; escritura solo autenticada.

---

## 2. Validación automática (server, gratis — NO usa LLM)

Antes de aceptar un acta:

1. `Σ(partidos) + blanco + nulo + impugnado == total_emitidos`
2. `total_emitidos == ciudadanos_votaron`
3. `total_emitidos <= electores_habiles`
4. todos los valores `>= 0`

- Si **todas pasan** → `suma_valida = true` (autoaprobable / baja fricción).
- Si **alguna falla** → `estado = pendiente_revision`, se resalta el campo y se reintenta OCR con Claude.

> Esto es lo que recuperó el "96" tapado del acta de Comas: `253 − 145 − 12 = 96`.

---

## 3. Capa OCR (proveedor abstraído)

```ts
// lib/ocr/types.ts
export interface ActaOCR {
  numero_mesa: string;
  codigo_barra?: string;
  ubicacion: { departamento: string; provincia: string; distrito: string };
  electores_habiles: number | null;
  hora_inicio?: string; hora_fin?: string;
  votos: { organizacion: string; valor: number; confianza: number }[];
  blanco: number; nulo: number; impugnado: number;
  total_emitidos: number;
  ciudadanos_votaron: number;
  confianza_global: number;
}
export interface OcrProvider { extract(img: Buffer | string): Promise<ActaOCR>; }
```

- **Primario:** Gemini Flash con *structured output* (response schema = `ActaOCR`).
- **Fallback (sin gastar):** si `!suma_valida` → reintento de Gemini Flash a mayor resolución; si vuelve a fallar → cola de **revisión humana** (gratis). NO usamos Claude como fallback para no inflar costo.
- **Prompt clave:** se le pasa el catálogo de organizaciones esperadas; instrucción de leer `---` como 0; devolver confianza por campo; NO inventar partidos.

### Costo recalculado (datos JNE, 7-jun-2026)

Solo nos interesa la **elección presidencial** (2da vuelta). Escenarios según alcance:

| Alcance | Nº actas | Gemini Flash | Gemini Flash-Lite |
|---|---|---|---|
| Actas observadas presidenciales | 5 339 | ~US$1.7 | ~US$1.2 |
| Muestra PVT (~30k actas) | ~30 000 | ~US$10 | ~US$7 |
| Todas las mesas presidenciales (nacional) | ~90 000 | ~US$29 | ~US$20 |

**Supuesto por acta:** ~1.6k tokens de imagen (1600px) + 0.4k prompt + 0.3k salida ≈ **US$0.00032** (Flash) / **US$0.00022** (Flash-Lite).

**💸 Y lo más importante para tu presupuesto:** Google AI Studio tiene **capa GRATIS** de Gemini Flash (~1 500 solicitudes/día). Para un conteo que dura horas/días, buena parte (o todo) entra **sin pagar**. Recomendación: empezar en free tier; activar facturación solo si el ritmo supera el límite diario. Costo realista del MVP: **US$0–10**.

---

## 4. Endpoints (Netlify Functions / route handlers)

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/actas/upload` | Recibe imagen ya comprimida → guarda original+optim → corre OCR → devuelve borrador pre-llenado |
| POST | `/api/actas/confirm` | Recibe campos corregidos → valida aritmética → dedup → inserta/actualiza. Si existe con valores distintos → crea `discrepancia` y marca `conflicto` |
| GET | `/api/dashboard` | Conteo agregado: votos por org, % mesas computadas, por distrito |
| POST | `/api/whatsapp` | Webhook (Fase 2) |

> **Nota Netlify:** las Functions del plan free tienen **timeout de 10s** (síncronas). El OCR de Gemini Flash devuelve en ~2–6s → entra. Si una imagen pesada se acerca al límite, dos salidas:
> 1. Mover SOLO el endpoint de OCR a una **Supabase Edge Function** (Deno) — incluida en el free tier de Supabase (500k invocaciones), y Netlify queda solo de frontend. ← recomendado.
> 2. Usar **Netlify Background Functions** (hasta 15 min) y hacer el OCR asíncrono: el cliente sube, recibe `id`, y escucha el resultado por Supabase Realtime.

---

## 5. Pantallas (PWA, mobile-first)

1. **Subir acta:** cámara/galería → **compresión en el navegador** (`browser-image-compression`, 1600px, q0.8 → ~250KB) → preview → "Analizando…" → **formulario pre-llenado** con campos coloreados por confianza (🟢 alta / 🟡 revisar) → editar → **validación en vivo** (muestra si la suma cuadra) → **Confirmar**.
2. **Mis actas:** lista con estado (pendiente / verificada / conflicto).
3. **Dashboard público (Realtime):** barras FP vs JP, total nulos/blancos, % de mesas, tabla/mapa por distrito, export CSV.
4. **Login responsable:** Supabase Auth (magic link).

---

## 6. Pipeline de imagen

- **Cliente:** comprime ANTES de subir (5MB → ~250KB). Mismo resultado de OCR, mucho menos ancho de banda/storage.
- **Guardar 2 versiones:** `actas-original` (bucket privado, inmutable, auditoría) + `actas-optim` (público, mostrar).
- **WhatsApp (Fase 2):** redimensionar server-side con `sharp`.

---

## 7. Flujo antiduplicado

- Índice `unique(numero_mesa)`.
- Al confirmar: si la mesa ya existe →
  - valores **idénticos** → "ya registrada", se descarta.
  - valores **distintos** → crear `discrepancia`, `estado=conflicto`, alerta en dashboard. (Las discrepancias son señal de error/fraude — son valiosas, no se silencian.)

---

## 8. Escala y costos

- **Supabase free:** 500MB BD + 1GB Storage + 50k MAU. 1000 actas optim (~300KB) ≈ 300MB → entra holgado.
- Si superas ~10k actas → mover imágenes a **Vercel Blob** o Supabase Pro (US$25/mes).
- Concurrencia 1000: Netlify Functions autoescalan; usar **Supavisor (transaction pooler)** para conexiones. (Free Netlify: 125k invocaciones/mes, 100GB ancho de banda — sobra.)
- **Único gasto posible:** LLM **US$0–29** según alcance (gratis si entra en la capa free de Gemini). Todo lo demás, gratis en el MVP.

---

## 9. Roadmap por fases

- **Fase 0 (MVP, 1–2 días):** repo + schema + upload + OCR Gemini + formulario con validación + dedup + dashboard básico. Deploy Netlify.
- **Fase 1:** Auth responsables, UI de discrepancias, doble verificación, mapa por distrito, export CSV.
- **Fase 2:** Bot WhatsApp (Cloud API / Twilio) reusando el mismo backend.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| OCR lee mal manuscrito | Validación aritmética + humano confirma + fallback Claude |
| Carga concurrente | Netlify Functions autoescalan; Supavisor pooler |
| Credibilidad del conteo | Original inmutable + código abierto + export auditable |
| Spam de actas falsas | Auth, rate limit, estado `pendiente_revision`, doble verificación |
| Storage se llena | Supabase Pro (US$25) o Cloudflare R2/B2 cuando supere 1GB |
| Timeout de Function (10s free) | OCR en Supabase Edge Function o Netlify Background Function |

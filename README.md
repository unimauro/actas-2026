# 🗳️ Actas Abiertas 2026

**Conteo ciudadano (PVT) de actas electorales — Segunda Elección Presidencial 2026, Perú.**

Sube la foto de un acta ONPE → una IA lee los números manuscritos → un humano confirma → el conteo se actualiza en vivo, con bloqueo de actas duplicadas y comparación contra el resultado oficial.

> ⚖️ **Transparencia ciudadana, no es conteo oficial.** El acta original se preserva, los conteos son auditables y exportables. La fuente de verdad oficial es la ONPE.

---

## ✨ Qué hace

- 📸 **Subida desde el celular** (PWA): la imagen se comprime en el navegador antes de subir (de ~5 MB a ~250 KB).
- 🤖 **OCR con IA** (Google Gemini): pre-llena mesa, ubicación, votos por organización, blancos, nulos, totales y miembros de mesa.
- ✅ **Validación aritmética gratis**: `Σ votos = total emitidos = ciudadanos que votaron ≤ electores hábiles`. Recupera dígitos tapados por brillo y marca lo dudoso.
- 🔒 **Antiduplicados**: una mesa = un acta (índice único por número de mesa). Detecta también conflictos (misma mesa, números distintos).
- 🧾 **Soporta Acta Electoral y Cartel de Resultados** (detecta el tipo de documento).
- 📊 **Dashboard en vivo**: head-to-head, % de avance, **comparación contra ONPE** (con histórico), desglose por distrito y buscador de actas.
- 🔎 **Trazabilidad**: cada envío guarda quién subió (correo/DNI de personero opcionales) e IP, con logs estructurados.
- 🛡️ **Panel de administrador** protegido por contraseña para revisar envíos y resolver conflictos.
- 🖼️ **Tarjeta dinámica para redes** (Open Graph) que muestra el conteo en vivo.

## 🧱 Stack

- **Next.js 16** (App Router) + React 19 + Tailwind CSS 4
- **Supabase** (Postgres + RLS) como base de datos
- **Google Gemini** (`gemini-flash-latest`) para el OCR
- **Netlify** para el deploy

## 🚀 Correr en local

```bash
npm install
cp .env.example .env.local   # completa tus llaves (todas opcionales en modo demo)
npm run dev
```

Sin llaves, la app corre en **modo demo** (OCR simulado + almacenamiento en memoria). Con `GEMINI_API_KEY` y las variables de Supabase, funciona de verdad.

### Variables de entorno

Ver [`.env.example`](./.env.example). Resumen:

| Variable | Para qué |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | OCR (consíguela gratis en [AI Studio](https://aistudio.google.com)) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Base de datos |
| `SUPABASE_SECRET_KEY` | Permite al admin editar estados (evita RLS) |
| `ADMIN_PASSWORD` | Acceso al panel `/admin` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics (opcional) |

La base de datos se crea con [`supabase/schema-mvp.sql`](./supabase/schema-mvp.sql) (pégalo en el SQL Editor de Supabase).

## 🗂️ Estructura

```
app/            páginas (/, /subir, /dashboard, /admin) y rutas API
components/     formulario de acta, datos de personero, analytics
lib/            ocr, validación, store (Supabase/memoria), dashboard, auth
scripts/        carga por lote de actas desde imágenes
supabase/       schema SQL
```

## ⚠️ Notas

- **OCR**: la capa gratuita de Gemini tiene límites por minuto y por día. Para cargas masivas, espera el reset diario o activa facturación (centavos por acta).
- **ONPE**: su sitio de resultados está geobloqueado a Perú, por lo que el dato oficial se ingresa manualmente desde el panel admin (queda con fecha/hora → histórico).
- **Privacidad**: las actas pueden contener datos personales (DNI de miembros de mesa). Trátalos con cuidado; el OCR puede omitir esa sección si lo prefieres.

## 📄 Licencia

MIT — úsalo, adáptalo y mejóralo. Hecho como experimento de transparencia electoral ciudadana.

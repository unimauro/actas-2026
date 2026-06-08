// Lee actas con Gemini y (opcionalmente) las sube a Supabase.
// Uso:
//   node scripts/subir-actas.mjs img1.jpeg img2.jpeg          -> SOLO lee y muestra (dry-run)
//   SUBIR=1 node scripts/subir-actas.mjs img1.jpeg ...        -> además sube a Supabase
// Requiere en el entorno: GEMINI_API_KEY, GEMINI_MODEL,
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.

import { readFileSync } from "fs";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUBIR = process.env.SUBIR === "1";
const DELAY = Number(process.env.DELAY || 0); // ms de pausa entre imágenes (evita 429)
let imgs = process.argv.slice(2);
if (process.env.FILE) {
  imgs = imgs.concat(readFileSync(process.env.FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ORGS = ["FUERZA POPULAR", "JUNTOS POR EL PERÚ"];

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    numero_mesa: { type: SchemaType.STRING },
    tipo_documento: { type: SchemaType.STRING },
    departamento: { type: SchemaType.STRING },
    provincia: { type: SchemaType.STRING },
    distrito: { type: SchemaType.STRING },
    electores_habiles: { type: SchemaType.NUMBER },
    total_emitidos: { type: SchemaType.NUMBER },
    ciudadanos_votaron: { type: SchemaType.NUMBER },
    votos: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          tipo: { type: SchemaType.STRING },
          organizacion: { type: SchemaType.STRING },
          valor: { type: SchemaType.NUMBER },
        },
      },
    },
  },
  required: ["numero_mesa", "votos", "total_emitidos"],
};

const PROMPT = `Lee este documento electoral ONPE 2026 (acta o cartel de resultados).
Organizaciones esperadas en orden: ${ORGS.join(", ")}. '---' o vacío = 0.
Devuelve numero_mesa (6 dígitos), tipo_documento ("acta"|"cartel"), ubicación, electores_habiles,
votos por organización + blanco/nulo/impugnado, total_emitidos y ciudadanos_votaron.`;

const genAI = new GoogleGenerativeAI(KEY);
const model = genAI.getGenerativeModel({
  model: MODEL,
  generationConfig: { responseMimeType: "application/json", responseSchema: schema },
});

function suma(d) {
  return (d.votos || []).reduce((a, v) => a + (v.valor ?? 0), 0);
}

async function ocr(path) {
  const data = readFileSync(path).toString("base64");
  const res = await model.generateContent([PROMPT, { inlineData: { data, mimeType: "image/jpeg" } }]);
  return JSON.parse(res.response.text());
}

async function subir(d) {
  const valida = suma(d) === d.total_emitidos;
  const body = {
    numero_mesa: String(d.numero_mesa).trim(),
    estado: valida ? "verificada" : "pendiente_revision",
    suma_valida: valida,
    data: { ...d, miembros: d.miembros || [] },
    meta: {
      personero_nombre: process.env.PERSONERO_NOMBRE || "",
      personero_dni: process.env.PERSONERO_DNI || "",
      email: process.env.PERSONERO_EMAIL || "",
      ip: "carga-lote",
      enviado_en: new Date().toISOString(),
    },
  };
  const r = await fetch(`${SB_URL}/rest/v1/actas`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (r.status === 201) return "✅ subida";
  if (r.status === 409) return "⏭️  duplicada (ya existía)";
  return `❌ error ${r.status}: ${(await r.text()).slice(0, 120)}`;
}

let okCount = 0, dup = 0, skip = 0, err = 0;
for (const path of imgs) {
  const nombre = path.split("/").pop();
  try {
    const d = await ocr(path);
    const mesa = String(d.numero_mesa || "").trim();
    const s = suma(d);
    const ok = s === d.total_emitidos;
    const fp = d.votos?.find((v) => v.organizacion === "FUERZA POPULAR")?.valor ?? "?";
    const jp = d.votos?.find((v) => v.organizacion === "JUNTOS POR EL PERÚ")?.valor ?? "?";
    console.log(`\n📄 ${nombre}`);
    if (!/^\d{6}$/.test(mesa)) {
      console.log(`   ⚠️  SALTADA: sin número de mesa legible (leyó "${mesa}")`);
      skip++;
      continue;
    }
    console.log(`   Mesa ${mesa} · ${d.distrito} · ${d.tipo_documento}`);
    console.log(`   FP=${fp}  JP=${jp}  total=${d.total_emitidos}  → suma ${s} ${ok ? "✓ cuadra" : "✗ NO cuadra"}`);
    if (SUBIR) {
      const r = await subir(d);
      console.log(`   ${r}`);
      if (r.startsWith("✅")) okCount++; else if (r.includes("duplicada")) dup++; else err++;
    }
  } catch (e) {
    console.log(`\n📄 ${nombre}\n   ❌ error OCR: ${e.message}`);
    err++;
  }
  if (DELAY) await sleep(DELAY);
}
if (SUBIR) console.log(`\n=== RESUMEN: ✅ ${okCount} subidas · ⏭️ ${dup} duplicadas · ⚠️ ${skip} sin mesa · ❌ ${err} errores ===`);
console.log(SUBIR ? "\n— Carga terminada —" : "\n— Modo lectura (dry-run). Para subir: SUBIR=1 —");

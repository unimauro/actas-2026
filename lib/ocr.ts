import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ActaData, ActaDraft, MapaConfianza } from "./types";
import { lineasVacias, ORGANIZACIONES } from "./organizaciones";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const PROMPT = `Eres un lector experto de documentos electorales de la ONPE (Perú), Segunda Elección Presidencial 2026.
La imagen puede ser un "ACTA ELECTORAL" (tipo_documento="acta") o un "CARTEL DE RESULTADOS" (tipo_documento="cartel").
Extrae TODOS los datos disponibles. Reglas:
- Los números son MANUSCRITOS. Léelos con cuidado.
- Si una casilla tiene rayas "---" o está vacía, su valor es 0.
- Las organizaciones esperadas, en orden, son: ${ORGANIZACIONES.map((o) => o.nombre).join(", ")}.
- "numero_mesa" son los 6 dígitos de la MESA DE SUFRAGIO (esta es la clave única).
- El CARTEL DE RESULTADOS NO tiene miembros de mesa ni "ciudadanos que votaron": deja esos campos vacíos.
- En el ACTA sí: devuelve nombres, apellidos y DNI de los 3 miembros (presidente, secretario, tercero).
- Para cada número da una "confianza" de 0 a 1 (1 = totalmente seguro).
Responde SOLO con el JSON del esquema.`;

// Esquema estructurado que Gemini debe respetar
const schema = {
  type: SchemaType.OBJECT,
  properties: {
    numero_mesa: { type: SchemaType.STRING },
    tipo_documento: { type: SchemaType.STRING },
    codigo_barra: { type: SchemaType.STRING },
    tipo_pagina: { type: SchemaType.STRING },
    departamento: { type: SchemaType.STRING },
    provincia: { type: SchemaType.STRING },
    distrito: { type: SchemaType.STRING },
    electores_habiles: { type: SchemaType.NUMBER },
    fecha: { type: SchemaType.STRING },
    hora_inicio: { type: SchemaType.STRING },
    hora_fin: { type: SchemaType.STRING },
    total_emitidos: { type: SchemaType.NUMBER },
    ciudadanos_votaron: { type: SchemaType.NUMBER },
    observaciones: { type: SchemaType.STRING },
    votos: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          tipo: { type: SchemaType.STRING },
          organizacion: { type: SchemaType.STRING },
          valor: { type: SchemaType.NUMBER },
          confianza: { type: SchemaType.NUMBER },
        },
        required: ["tipo", "valor"],
      },
    },
    miembros: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          cargo: { type: SchemaType.STRING },
          nombres: { type: SchemaType.STRING },
          apellidos: { type: SchemaType.STRING },
          dni: { type: SchemaType.STRING },
          confianza: { type: SchemaType.NUMBER },
        },
      },
    },
  },
  required: ["numero_mesa", "votos", "total_emitidos"],
} as const;

export function ocrDisponible(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function extraerActa(imagen: Buffer, mime: string): Promise<ActaDraft> {
  if (!ocrDisponible()) return draftDemo();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      // @ts-expect-error responseSchema soportado en runtime
      responseSchema: schema,
    },
  });

  const res = await model.generateContent([
    PROMPT,
    { inlineData: { data: imagen.toString("base64"), mimeType: mime } },
  ]);

  const raw = JSON.parse(res.response.text());
  return normalizar(raw, MODEL);
}

// Convierte la respuesta cruda del LLM al formato interno + mapa de confianza
function normalizar(raw: any, modelo: string): ActaDraft {
  const confianza: MapaConfianza = {};
  const votos = (raw.votos?.length ? raw.votos : lineasVacias()).map(
    (v: any, i: number) => {
      if (typeof v.confianza === "number") confianza[`votos.${i}.valor`] = v.confianza;
      return {
        tipo: v.tipo ?? "partido",
        organizacion: v.organizacion,
        valor: v.valor ?? null,
      };
    }
  );

  const miembros = (raw.miembros ?? []).map((m: any, i: number) => {
    if (typeof m.confianza === "number") confianza[`miembros.${i}`] = m.confianza;
    return {
      cargo: m.cargo ?? (["presidente", "secretario", "tercero"][i] as any),
      nombres: m.nombres ?? "",
      apellidos: m.apellidos ?? "",
      dni: m.dni ?? "",
    };
  });

  const data: ActaData = {
    numero_mesa: String(raw.numero_mesa ?? "").trim(),
    tipo_documento: raw.tipo_documento === "cartel" ? "cartel" : "acta",
    codigo_barra: raw.codigo_barra,
    tipo_pagina: raw.tipo_pagina,
    departamento: raw.departamento ?? "",
    provincia: raw.provincia ?? "",
    distrito: raw.distrito ?? "",
    electores_habiles: raw.electores_habiles ?? null,
    fecha: raw.fecha,
    hora_inicio: raw.hora_inicio,
    hora_fin: raw.hora_fin,
    votos,
    total_emitidos: raw.total_emitidos ?? null,
    ciudadanos_votaron: raw.ciudadanos_votaron ?? null,
    observaciones: raw.observaciones,
    miembros,
  };

  return { data, confianza, modelo, demo: false };
}

// Modo demo (sin GEMINI_API_KEY): datos del acta de muestra (Mesa 040293, Comas)
function draftDemo(): ActaDraft {
  const data: ActaData = {
    numero_mesa: "040293",
    tipo_documento: "acta",
    codigo_barra: "040293-91-M",
    tipo_pagina: "4b",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "COMAS",
    electores_habiles: 299,
    fecha: "2026-06-07",
    hora_inicio: "5:32 p.m.",
    hora_fin: "6:55 p.m.",
    votos: [
      { tipo: "partido", organizacion: "FUERZA POPULAR", valor: 145 },
      { tipo: "partido", organizacion: "JUNTOS POR EL PERÚ", valor: 96 },
      { tipo: "blanco", valor: 0 },
      { tipo: "nulo", valor: 12 },
      { tipo: "impugnado", valor: 0 },
    ],
    total_emitidos: 253,
    ciudadanos_votaron: 253,
    observaciones: "",
    miembros: [
      { cargo: "presidente", nombres: "NOMBRE EJEMPLO", apellidos: "APELLIDO EJEMPLO", dni: "00000001" },
      { cargo: "secretario", nombres: "NOMBRE EJEMPLO", apellidos: "APELLIDO EJEMPLO", dni: "00000002" },
      { cargo: "tercero", nombres: "NOMBRE EJEMPLO", apellidos: "APELLIDO EJEMPLO", dni: "00000003" },
    ],
  };
  const confianza: MapaConfianza = {
    "votos.0.valor": 0.97,
    "votos.1.valor": 0.62, // JP tapado por brillo -> revisar
    "votos.2.valor": 0.95,
    "votos.3.valor": 0.9,
    "votos.4.valor": 0.95,
    "miembros.0": 0.55,
    "miembros.1": 0.7,
    "miembros.2": 0.6,
  };
  return { data, confianza, modelo: "demo", demo: true };
}

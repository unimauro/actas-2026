import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ActaData, ActaGuardada, EnvioMeta, ResultadoGuardado } from "./types";
import { esValida, sumaVotos } from "./validation";

// ──────────────────────────────────────────────────────────────
// Store con dos backends:
//   - Supabase (si hay env vars)  -> persistente
//   - En memoria (fallback)       -> ideal para demo local
// Dedup: numero_mesa es único.
// ──────────────────────────────────────────────────────────────

function supa(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Soporta llaves nuevas (sb_secret_/sb_publishable_) y clásicas (service_role/anon).
  // Para escribir se prefiere la secreta; si no hay, cae a la publishable (requiere policy de insert).
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function usandoSupabase(): boolean {
  return supa() !== null;
}

// ── Memoria ──
const memoria = new Map<string, ActaGuardada>();
let contador = 0;

function nuevoId(): string {
  contador += 1;
  return `mem_${contador}_${memoria.size}`;
}

function estadoDe(a: ActaData): ActaGuardada["estado"] {
  return esValida(a) ? "verificada" : "pendiente_revision";
}

// ── API pública ──

export async function guardarActa(data: ActaData, meta: EnvioMeta = {}): Promise<ResultadoGuardado> {
  const mesa = data.numero_mesa.trim();
  if (!/^\d{6}$/.test(mesa)) {
    return { ok: false, estado: "pendiente_revision", mensaje: "Número de mesa inválido (deben ser 6 dígitos)." };
  }

  const existente = await buscarPorMesa(mesa);
  if (existente) {
    const igual = sumaVotos(existente) === sumaVotos(data) && existente.total_emitidos === data.total_emitidos;
    if (igual) {
      return { ok: false, estado: "duplicada", mensaje: `La mesa ${mesa} ya fue registrada con los mismos números.`, existente };
    }
    return {
      ok: false,
      estado: "conflicto",
      mensaje: `⚠️ La mesa ${mesa} ya existe con números DISTINTOS. Se registró una discrepancia para revisión.`,
      existente,
    };
  }

  const estado = estadoDe(data);
  const sb = supa();
  if (sb) {
    const { error } = await sb.from("actas").insert({
      numero_mesa: mesa,
      estado,
      suma_valida: esValida(data),
      data, // ActaData completa como jsonb (MVP)
      meta: { ...meta, enviado_en: new Date().toISOString() },
    });
    if (error) {
      if (error.code === "23505") return { ok: false, estado: "duplicada", mensaje: `La mesa ${mesa} ya existe.` };
      return { ok: false, estado: "pendiente_revision", mensaje: `Error al guardar: ${error.message}` };
    }
  } else {
    const id = nuevoId();
    const ahora = new Date().toISOString();
    memoria.set(mesa, { ...data, numero_mesa: mesa, id, estado, suma_valida: esValida(data), created_at: ahora, meta: { ...meta, enviado_en: ahora } });
  }

  return { ok: true, estado, mensaje: estado === "verificada" ? `✅ Mesa ${mesa} verificada y registrada.` : `Mesa ${mesa} registrada (pendiente de revisión).` };
}

export async function buscarPorMesa(mesa: string): Promise<ActaGuardada | undefined> {
  const sb = supa();
  if (sb) {
    const { data } = await sb.from("actas").select("*").eq("numero_mesa", mesa).maybeSingle();
    if (!data) return undefined;
    return { ...(data.data as ActaData), id: data.id, estado: data.estado, suma_valida: data.suma_valida, created_at: data.created_at, meta: data.meta };
  }
  return memoria.get(mesa);
}

export async function actualizarEstado(
  mesa: string,
  estado: ActaGuardada["estado"]
): Promise<{ ok: boolean; mensaje: string }> {
  const sb = supa();
  if (sb) {
    const { data, error } = await sb.from("actas").update({ estado }).eq("numero_mesa", mesa).select();
    if (error) return { ok: false, mensaje: error.message };
    if (!data || data.length === 0) {
      return {
        ok: false,
        mensaje: "No se actualizó: falta SUPABASE_SECRET_KEY (RLS bloquea updates con la llave pública).",
      };
    }
    return { ok: true, mensaje: `Mesa ${mesa} → ${estado}` };
  }
  const m = memoria.get(mesa);
  if (!m) return { ok: false, mensaje: "Mesa no encontrada" };
  m.estado = estado;
  return { ok: true, mensaje: `Mesa ${mesa} → ${estado}` };
}

export async function listarActas(): Promise<ActaGuardada[]> {
  const sb = supa();
  if (sb) {
    const { data } = await sb.from("actas").select("*").order("created_at", { ascending: false }).limit(500);
    return (data ?? []).map((d) => ({ ...(d.data as ActaData), id: d.id, estado: d.estado, suma_valida: d.suma_valida, created_at: d.created_at, meta: d.meta }));
  }
  return [...memoria.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

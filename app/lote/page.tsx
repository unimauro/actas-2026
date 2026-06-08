"use client";

import { useState } from "react";
import Link from "next/link";
import DatosPersonero, { type Personero } from "@/components/DatosPersonero";
import { comprimirImagen } from "@/lib/compress";
import type { ActaDraft } from "@/lib/types";

type Estado = "pendiente" | "procesando" | "ok" | "duplicada" | "conflicto" | "revisar" | "error";
interface Fila {
  nombre: string;
  estado: Estado;
  mesa?: string;
  distrito?: string;
  fp?: number;
  jp?: number;
  total?: number;
  msg?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function votoDe(draft: ActaDraft, org: string) {
  return draft.data.votos?.find((v) => v.organizacion === org)?.valor ?? undefined;
}

export default function LotePage() {
  const [personero, setPersonero] = useState<Personero | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [corriendo, setCorriendo] = useState(false);

  async function procesarUna(file: File, i: number, set: (f: Partial<Fila>) => void) {
    set({ estado: "procesando" });
    try {
      const blob = await comprimirImagen(file);
      const form = new FormData();
      form.append("imagen", blob, "acta.jpg");
      const er = await fetch("/api/actas/extract", { method: "POST", body: form });
      if (!er.ok) {
        const e = await er.json().catch(() => ({}));
        const lim = (e.error || "").includes("429") || (e.error || "").toLowerCase().includes("quota");
        set({ estado: "error", msg: lim ? "Límite de Gemini, reintenta más tarde" : e.error || "Error de OCR" });
        return;
      }
      const draft = (await er.json()) as ActaDraft;
      const data = draft.data;
      const sr = await fetch("/api/actas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          meta: { personero_nombre: personero!.personero_nombre, personero_dni: personero!.personero_dni, email: personero!.email },
        }),
      });
      const j = await sr.json();
      const base: Partial<Fila> = {
        mesa: data.numero_mesa,
        distrito: data.distrito,
        fp: votoDe(draft, "FUERZA POPULAR"),
        jp: votoDe(draft, "JUNTOS POR EL PERÚ"),
        total: data.total_emitidos ?? undefined,
      };
      if (sr.ok) set({ ...base, estado: j.estado === "verificada" ? "ok" : "revisar", msg: j.mensaje });
      else if (j.estado === "duplicada") set({ ...base, estado: "duplicada", msg: "Ya existía" });
      else if (j.estado === "conflicto") set({ ...base, estado: "conflicto", msg: j.mensaje });
      else set({ ...base, estado: "error", msg: j.error || j.mensaje || "Error" });
    } catch (e: any) {
      set({ estado: "error", msg: e?.message ?? "Error" });
    }
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const iniciales: Fila[] = files.map((f) => ({ nombre: f.name, estado: "pendiente" }));
    setFilas(iniciales);
    setCorriendo(true);
    for (let i = 0; i < files.length; i++) {
      await procesarUna(files[i], i, (patch) =>
        setFilas((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)))
      );
      if (i < files.length - 1) await sleep(1500); // respeta el límite por minuto de Gemini
    }
    setCorriendo(false);
  }

  if (!personero) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Subir varias actas</h1>
        <DatosPersonero onListo={setPersonero} />
      </div>
    );
  }

  const r = (e: Estado) => filas.filter((f) => f.estado === e).length;
  const icono: Record<Estado, string> = {
    pendiente: "⏳", procesando: "🔄", ok: "✅", duplicada: "⏭️", conflicto: "⚠️", revisar: "🟡", error: "❌",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subir varias actas</h1>
          <p className="text-xs text-white/40">DNI {personero.personero_dni}{personero.personero_nombre ? ` · ${personero.personero_nombre}` : ""}</p>
        </div>
        <Link href="/subir" className="text-sm text-sky-400 hover:underline">Subir una sola →</Link>
      </div>

      <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-8 text-center hover:border-sky-400/60 ${corriendo ? "pointer-events-none opacity-50" : ""}`}>
        <span className="text-3xl">🖼️</span>
        <span className="font-semibold">Elige varias fotos de actas</span>
        <span className="text-sm text-white/50">Se procesan una por una (comprime → IA → sube)</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={corriendo} />
      </label>

      {filas.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-emerald-500/15 px-3 py-1 text-emerald-300">✅ {r("ok")} subidas</span>
            <span className="rounded-lg bg-amber-500/15 px-3 py-1 text-amber-300">🟡 {r("revisar")} a revisar</span>
            <span className="rounded-lg bg-white/10 px-3 py-1">⏭️ {r("duplicada")} duplicadas</span>
            <span className="rounded-lg bg-amber-600/15 px-3 py-1 text-amber-300">⚠️ {r("conflicto")} conflictos</span>
            <span className="rounded-lg bg-red-500/15 px-3 py-1 text-red-300">❌ {r("error")} errores</span>
            {corriendo && <span className="rounded-lg bg-sky-500/15 px-3 py-1 text-sky-300">🔄 procesando…</span>}
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="p-2">#</th><th className="p-2">Archivo</th><th className="p-2">Mesa</th>
                  <th className="p-2 text-right">FP</th><th className="p-2 text-right">JP</th><th className="p-2 text-right">Total</th><th className="p-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-2 text-white/40">{i + 1}</td>
                    <td className="p-2 max-w-[140px] truncate text-white/60">{f.nombre}</td>
                    <td className="p-2 font-semibold">{f.mesa || "—"}<span className="block text-xs font-normal text-white/40">{f.distrito || ""}</span></td>
                    <td className="p-2 text-right">{f.fp ?? "—"}</td>
                    <td className="p-2 text-right">{f.jp ?? "—"}</td>
                    <td className="p-2 text-right">{f.total ?? "—"}</td>
                    <td className="p-2">{icono[f.estado]} <span className="text-xs text-white/50">{f.msg || f.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-white/40">
            🟡 "a revisar" = la suma no cuadró o faltan datos; quedan como <b>pendientes</b> y las puedes corregir en el panel admin o subiéndolas de a una.
          </p>
          <Link href="/dashboard" className="inline-block rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400">Ver dashboard</Link>
        </>
      )}
    </div>
  );
}

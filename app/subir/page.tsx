"use client";

import { useState } from "react";
import Link from "next/link";
import ActaForm from "@/components/ActaForm";
import DatosPersonero, { type Personero } from "@/components/DatosPersonero";
import { comprimirImagen, tamanoLegible } from "@/lib/compress";
import type { ActaData, ActaDraft, ResultadoGuardado } from "@/lib/types";

type Fase = "idle" | "procesando" | "revision" | "listo";

export default function SubirPage() {
  const [personero, setPersonero] = useState<Personero | null>(null);
  const [fase, setFase] = useState<Fase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [info, setInfo] = useState<string>("");
  const [draft, setDraft] = useState<ActaDraft | null>(null);
  const [resultado, setResultado] = useState<{ res: ResultadoGuardado; data: ActaData } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFase("procesando");
    try {
      const original = file.size;
      const blob = await comprimirImagen(file);
      setPreview(URL.createObjectURL(blob));
      setInfo(`${tamanoLegible(original)} → ${tamanoLegible(blob.size)} optimizada`);

      const form = new FormData();
      form.append("imagen", blob, "acta.jpg");
      const res = await fetch("/api/actas/extract", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error || "Error en OCR");
      const d = (await res.json()) as ActaDraft;
      setDraft(d);
      setFase("revision");
    } catch (err: any) {
      setError(err?.message ?? "Error procesando la imagen");
      setFase("idle");
    }
  }

  function reset() {
    setFase("idle");
    setPreview(null);
    setDraft(null);
    setResultado(null);
    setError(null);
  }

  if (!personero) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Subir acta</h1>
        <DatosPersonero onListo={setPersonero} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subir acta</h1>
          <p className="text-xs text-white/40">
            Subiendo como DNI {personero.personero_dni}
            {personero.personero_nombre ? ` · ${personero.personero_nombre}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/lote" className="text-sm text-sky-400 hover:underline">Subir varias →</Link>
          {fase !== "idle" && (
            <button onClick={reset} className="text-sm text-sky-400 hover:underline">
              ↺ Subir otra
            </button>
          )}
        </div>
      </div>

      {fase === "idle" && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-12 text-center hover:border-sky-400/60">
          <span className="text-4xl">📸</span>
          <span className="font-semibold">Toma o elige la foto del acta</span>
          <span className="text-sm text-white/50">Se comprime en tu celular antes de subir</span>
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      )}

      {error && <p className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p>}

      {fase === "procesando" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
          <p>Analizando el acta con IA…</p>
        </div>
      )}

      {(fase === "revision" || fase === "listo") && (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2 lg:sticky lg:top-20 lg:self-start">
            {preview && <img src={preview} alt="acta" className="w-full rounded-xl border border-white/10" />}
            <p className="text-center text-xs text-white/40">{info}</p>
            {draft?.demo && (
              <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-center text-xs text-amber-300">
                Modo demo (sin GEMINI_API_KEY): datos de ejemplo
              </p>
            )}
            {!draft?.demo && draft && (
              <p className="text-center text-xs text-white/40">OCR: {draft.modelo}</p>
            )}
          </div>

          <div>
            {fase === "revision" && draft && (
              <ActaForm
                draft={draft}
                personero={personero}
                onGuardado={(res, data) => {
                  setResultado({ res, data });
                  setFase("listo");
                }}
              />
            )}

            {fase === "listo" && resultado && (
              <div
                className={`rounded-xl border p-6 ${
                  resultado.res.ok
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : resultado.res.estado === "conflicto"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-white/20 bg-white/5"
                }`}
              >
                <p className="text-lg font-semibold">{resultado.res.mensaje}</p>
                {resultado.res.existente && (
                  <div className="mt-3 rounded-lg bg-black/30 p-3 text-sm">
                    <p className="mb-1 text-white/50">Acta ya registrada:</p>
                    <p>
                      Mesa {resultado.res.existente.numero_mesa} · {resultado.res.existente.distrito} ·
                      Total {resultado.res.existente.total_emitidos}
                    </p>
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <button onClick={reset} className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400">
                    Subir otra acta
                  </button>
                  <Link href="/dashboard" className="rounded-lg border border-white/20 px-4 py-2 font-semibold hover:bg-white/10">
                    Ver dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

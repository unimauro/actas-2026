"use client";

import { useMemo, useState } from "react";
import type { ActaData, ActaDraft, ResultadoGuardado } from "@/lib/types";
import type { Personero } from "@/components/DatosPersonero";
import { etiquetaLinea } from "@/lib/organizaciones";
import { sumaVotos, validarActa } from "@/lib/validation";

function colorConfianza(c?: number): string {
  if (c == null) return "border-white/20";
  if (c >= 0.85) return "border-emerald-500/60 bg-emerald-500/5";
  if (c >= 0.6) return "border-amber-500/70 bg-amber-500/10";
  return "border-red-500/70 bg-red-500/10";
}

function Campo({
  label,
  value,
  onChange,
  confianza,
  tipo = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  confianza?: number;
  tipo?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/50">{label}</span>
      <input
        type={tipo}
        inputMode={tipo === "number" ? "numeric" : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-black/30 px-3 py-2 outline-none focus:border-sky-400 ${colorConfianza(confianza)}`}
      />
    </label>
  );
}

export default function ActaForm({ draft, personero, onGuardado }: { draft: ActaDraft; personero: Personero; onGuardado: (r: ResultadoGuardado, data: ActaData) => void }) {
  const [data, setData] = useState<ActaData>(draft.data);
  const [enviando, setEnviando] = useState(false);
  const conf = draft.confianza;

  const reglas = useMemo(() => validarActa(data), [data]);
  const suma = sumaVotos(data);
  const todoOk = reglas.every((r) => r.ok);

  function setNum(campo: keyof ActaData, v: string) {
    setData((d) => ({ ...d, [campo]: v === "" ? null : Number(v) }));
  }
  function setStr(campo: keyof ActaData, v: string) {
    setData((d) => ({ ...d, [campo]: v }));
  }
  function setVoto(i: number, v: string) {
    setData((d) => ({ ...d, votos: d.votos.map((l, j) => (j === i ? { ...l, valor: v === "" ? null : Number(v) } : l)) }));
  }
  function setMiembro(i: number, campo: "nombres" | "apellidos" | "dni", v: string) {
    setData((d) => ({ ...d, miembros: d.miembros.map((m, j) => (j === i ? { ...m, [campo]: v } : m)) }));
  }

  async function guardar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/actas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          meta: {
            personero_nombre: personero.personero_nombre,
            personero_dni: personero.personero_dni,
            email: personero.email,
          },
        }),
      });
      const json = (await res.json()) as ResultadoGuardado;
      onGuardado(json, data);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Formulario */}
      <div className="space-y-6">
        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 font-semibold text-sky-300">Identificación de la mesa</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Número de mesa (6 dígitos)" value={data.numero_mesa} onChange={(v) => setStr("numero_mesa", v)} />
            <Campo label="Electores hábiles" value={data.electores_habiles ?? ""} tipo="number" onChange={(v) => setNum("electores_habiles", v)} />
            <Campo label="Departamento" value={data.departamento} onChange={(v) => setStr("departamento", v)} />
            <Campo label="Provincia" value={data.provincia} onChange={(v) => setStr("provincia", v)} />
            <Campo label="Distrito" value={data.distrito} onChange={(v) => setStr("distrito", v)} />
            <Campo label="Código de barra" value={data.codigo_barra ?? ""} onChange={(v) => setStr("codigo_barra" as any, v)} />
            <Campo label="Hora inicio" value={data.hora_inicio ?? ""} onChange={(v) => setStr("hora_inicio" as any, v)} />
            <Campo label="Hora fin" value={data.hora_fin ?? ""} onChange={(v) => setStr("hora_fin" as any, v)} />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 font-semibold text-sky-300">Votos</h3>
          <div className="space-y-2">
            {data.votos.map((l, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex-1 text-sm">{etiquetaLinea(l)}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={l.valor ?? ""}
                  onChange={(e) => setVoto(i, e.target.value)}
                  className={`w-28 rounded-lg border bg-black/30 px-3 py-2 text-right outline-none focus:border-sky-400 ${colorConfianza(conf[`votos.${i}.valor`])}`}
                />
              </div>
            ))}
            <div className="flex items-center gap-3 border-t border-white/10 pt-2">
              <span className="flex-1 text-sm font-semibold">Total emitidos</span>
              <input type="number" inputMode="numeric" value={data.total_emitidos ?? ""} onChange={(e) => setNum("total_emitidos", e.target.value)} className="w-28 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-right outline-none focus:border-sky-400" />
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm font-semibold">Ciudadanos que votaron</span>
              <input type="number" inputMode="numeric" value={data.ciudadanos_votaron ?? ""} onChange={(e) => setNum("ciudadanos_votaron", e.target.value)} className="w-28 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-right outline-none focus:border-sky-400" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 font-semibold text-sky-300">Miembros de mesa</h3>
          <div className="space-y-4">
            {data.miembros.map((m, i) => (
              <div key={i} className="rounded-lg border border-white/10 p-3">
                <p className="mb-2 text-xs uppercase text-white/40">{m.cargo}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Campo label="Nombres" value={m.nombres} onChange={(v) => setMiembro(i, "nombres", v)} confianza={conf[`miembros.${i}`]} />
                  <Campo label="Apellidos" value={m.apellidos} onChange={(v) => setMiembro(i, "apellidos", v)} confianza={conf[`miembros.${i}`]} />
                  <Campo label="DNI" value={m.dni} onChange={(v) => setMiembro(i, "dni", v)} confianza={conf[`miembros.${i}`]} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Panel de validación */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 font-semibold">Validación</h3>
          <ul className="space-y-2 text-sm">
            {reglas.map((r) => (
              <li key={r.id} className="flex items-start gap-2">
                <span>{r.ok ? "✅" : "❌"}</span>
                <span>
                  <span className={r.ok ? "" : "text-red-300"}>{r.etiqueta}</span>
                  <span className="block text-xs text-white/40">{r.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-lg bg-black/30 p-2 text-center text-sm">
            Σ votos = <b>{suma}</b> · Total = <b>{data.total_emitidos ?? "—"}</b>
          </div>
        </div>

        <button
          onClick={guardar}
          disabled={enviando}
          className={`w-full rounded-xl px-4 py-3 font-semibold ${todoOk ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-amber-500/90 text-black hover:bg-amber-400"} disabled:opacity-50`}
        >
          {enviando ? "Guardando…" : todoOk ? "✅ Aceptar y registrar acta" : "⚠️ Registrar para revisión"}
        </button>
        <p className="text-center text-xs text-white/40">
          {todoOk ? "Todas las validaciones pasan." : "Algunas validaciones fallan: revisa los campos en rojo."}
        </p>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ActaGuardada } from "@/lib/types";

const ESTADOS: ActaGuardada["estado"][] = ["verificada", "pendiente_revision", "conflicto", "rechazada"];

function voto(a: ActaGuardada, org: string): number {
  return a.votos?.find((v) => v.organizacion === org)?.valor ?? 0;
}

export default function AdminPage() {
  const [pwd, setPwd] = useState("");
  const [entrado, setEntrado] = useState(false);
  const [actas, setActas] = useState<ActaGuardada[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [onpe, setOnpe] = useState({ fp_pct: "", fp_votos: "", jp_pct: "", jp_votos: "", pct_actas: "" });

  async function guardarOnpe() {
    setMsg(null);
    const r = await fetch("/api/onpe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pwd },
      body: JSON.stringify(onpe),
    });
    const j = await r.json();
    setMsg(r.ok ? "✅ Dato de ONPE guardado (se reflejará en el dashboard)" : j.error || "Error");
  }

  // Sesión persistente: recuerda la contraseña en este navegador.
  useEffect(() => {
    const saved = localStorage.getItem("admin_pwd");
    if (saved) {
      setPwd(saved);
      cargar(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargar(p = pwd) {
    setError(null);
    const r = await fetch("/api/admin/actas", { headers: { "x-admin-password": p }, cache: "no-store" });
    if (r.status === 403) {
      setError("Contraseña incorrecta.");
      localStorage.removeItem("admin_pwd");
      return;
    }
    const j = await r.json();
    localStorage.setItem("admin_pwd", p);
    setActas(j.actas || []);
    setEntrado(true);
  }

  function salir() {
    localStorage.removeItem("admin_pwd");
    setPwd("");
    setEntrado(false);
  }

  async function cambiarEstado(mesa: string, estado: ActaGuardada["estado"]) {
    setMsg(null);
    const r = await fetch("/api/admin/actas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pwd },
      body: JSON.stringify({ numero_mesa: mesa, estado }),
    });
    const j = await r.json();
    setMsg(j.mensaje || j.error);
    if (r.ok) cargar();
  }

  if (!entrado) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-lg font-semibold">Panel de administrador</h1>
        <p className="mt-1 text-sm text-white/50">Acceso restringido.</p>
        {error && <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}
        <div className="mt-4 space-y-3">
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="contraseña de admin"
            onKeyDown={(e) => e.key === "Enter" && cargar()}
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button onClick={() => cargar()} className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-400">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de administrador</h1>
        <div className="flex gap-3">
          <button onClick={() => cargar()} className="text-sm text-sky-400 hover:underline">↻ Recargar</button>
          <button onClick={salir} className="text-sm text-white/50 hover:underline">Salir</button>
        </div>
      </div>
      {msg && <p className="rounded-lg bg-white/10 px-3 py-2 text-sm">{msg}</p>}

      {/* Ingresar dato oficial de ONPE (desde Perú, mirando resultadosegundavuelta.onpe.gob.pe) */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-1 font-semibold">Dato oficial de ONPE</h2>
        <p className="mb-3 text-xs text-white/40">
          Mira <a className="text-sky-400 underline" href="https://resultadosegundavuelta.onpe.gob.pe/main/resumen" target="_blank" rel="noreferrer">resultadosegundavuelta.onpe.gob.pe</a> y copia los números. Se guarda con fecha/hora (histórico).
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {([
            ["fp_pct", "FP %"],
            ["fp_votos", "FP votos"],
            ["jp_pct", "JP %"],
            ["jp_votos", "JP votos"],
            ["pct_actas", "% actas (opc.)"],
          ] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs text-white/50">{label}</span>
              <input
                value={(onpe as any)[k]}
                onChange={(e) => setOnpe({ ...onpe, [k]: e.target.value })}
                inputMode="decimal"
                className="w-full rounded-lg border border-white/20 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
          ))}
        </div>
        <button onClick={guardarOnpe} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
          Guardar dato ONPE
        </button>
      </div>

      <p className="text-sm text-white/50">{actas.length} actas registradas</p>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="p-2">Mesa</th><th className="p-2">Distrito</th>
              <th className="p-2 text-right">FP</th><th className="p-2 text-right">JP</th><th className="p-2 text-right">Total</th>
              <th className="p-2">Nombre</th><th className="p-2">DNI</th><th className="p-2">Correo</th><th className="p-2">IP</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {actas.map((a) => (
              <tr key={a.id} className="border-t border-white/5">
                <td className="p-2 font-semibold">{a.numero_mesa}</td>
                <td className="p-2">{a.distrito}</td>
                <td className="p-2 text-right">{voto(a, "FUERZA POPULAR")}</td>
                <td className="p-2 text-right">{voto(a, "JUNTOS POR EL PERÚ")}</td>
                <td className="p-2 text-right">{a.total_emitidos}</td>
                <td className="p-2">{a.meta?.personero_nombre || "—"}</td>
                <td className="p-2">{a.meta?.personero_dni || "—"}</td>
                <td className="p-2 text-white/60">{a.meta?.email || "—"}</td>
                <td className="p-2 text-white/40">{a.meta?.ip || "—"}</td>
                <td className="p-2">
                  <select value={a.estado} onChange={(e) => cambiarEstado(a.numero_mesa, e.target.value as ActaGuardada["estado"])} className="rounded border border-white/20 bg-black/40 px-1 py-1 text-xs">
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

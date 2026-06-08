"use client";

import { useEffect, useState } from "react";
import type { ResumenDashboard } from "@/lib/dashboard";
import { META_MESAS, ONPE_OFICIAL, COLORES } from "@/lib/config";

function pct(n: number, d: number) {
  return d ? (n / d) * 100 : 0;
}

export default function Dashboard() {
  const [data, setData] = useState<ResumenDashboard | null>(null);
  const [onpeData, setOnpeData] = useState<{ latest: any; historia: any[] } | null>(null);
  const [auto, setAuto] = useState(true);
  const [ultima, setUltima] = useState<string>("");

  // Buscador de actas
  const [mesaQ, setMesaQ] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<any>(undefined); // undefined = sin buscar; null = no encontrada

  async function buscar() {
    const mesa = mesaQ.trim();
    if (!mesa) return;
    setBuscando(true);
    setResultado(undefined);
    try {
      const r = await fetch(`/api/actas/buscar?mesa=${encodeURIComponent(mesa)}`, { cache: "no-store" });
      const j = await r.json();
      setResultado(j.encontrada ? j.acta : null);
    } finally {
      setBuscando(false);
    }
  }

  async function cargar() {
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    setData(await res.json());
    try {
      const ro = await fetch("/api/onpe", { cache: "no-store" });
      setOnpeData(await ro.json());
    } catch {}
    setUltima(new Date().toLocaleTimeString("es-PE"));
  }

  // % oficial de ONPE: usa el último snapshot guardado; si no hay, el default.
  function onpePct(nombre: string): number {
    const l = onpeData?.latest;
    if (l) {
      if (nombre === "FUERZA POPULAR") return Number(l.fp_pct) || 0;
      if (nombre === "JUNTOS POR EL PERÚ") return Number(l.jp_pct) || 0;
    }
    return ONPE_OFICIAL.organizaciones.find((x) => x.nombre === nombre)?.pct ?? 0;
  }

  useEffect(() => {
    cargar();
    if (!auto) return;
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
  }, [auto]);

  if (!data) return <p className="text-white/60">Cargando…</p>;

  const avance = pct(data.total_actas, META_MESAS);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conteo ciudadano en vivo</h1>
          <p className="text-sm text-white/50">
            Actualizado {ultima} · {data.total_actas.toLocaleString("es-PE")} actas recolectadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/opengraph-image?t=${Date.now()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
          >
            📥 Imagen para compartir
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent("🗳️ Conteo Ciudadano 2026 en vivo: https://conteojp.netlify.app")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Compartir en WhatsApp
          </a>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-refresco
          </label>
        </div>
      </div>

      {/* Buscador de actas (arriba) */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-1 font-semibold">Buscar un acta</h2>
        <p className="mb-3 text-xs text-white/40">Verifica una mesa por su número (datos públicos: solo votos).</p>
        <div className="flex gap-2">
          <input
            value={mesaQ}
            onChange={(e) => setMesaQ(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            inputMode="numeric"
            maxLength={6}
            placeholder="Número de mesa (6 dígitos, ej. 040293)"
            className="flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-sky-400"
          />
          <button onClick={buscar} disabled={buscando || mesaQ.length !== 6} className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400 disabled:opacity-50">
            {buscando ? "…" : "Buscar"}
          </button>
        </div>

        {resultado === null && <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/60">No se encontró ninguna acta con ese número.</p>}

        {resultado && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">
                Mesa {resultado.numero_mesa} · {resultado.distrito || "—"}
              </span>
              <span className={`text-xs ${resultado.estado === "verificada" ? "text-emerald-400" : "text-amber-400"}`}>{resultado.estado}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              {(resultado.votos || []).map((v: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-white/60">{v.organizacion || v.tipo}</span>
                  <span className="font-semibold">{v.valor ?? 0}</span>
                </div>
              ))}
              <div className="flex justify-between border-b border-white/10 py-1">
                <span className="text-white/60">Total</span>
                <span className="font-semibold">{resultado.total_emitidos}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/30">{resultado.tipo_documento} · registrada {new Date(resultado.created_at).toLocaleString("es-PE")}</p>
          </div>
        )}
      </section>

      {/* Head to head */}
      <section className="grid gap-4 sm:grid-cols-2">
        {data.por_organizacion.map((o) => {
          const total = data.por_organizacion.reduce((a, x) => a + x.votos, 0);
          const p = pct(o.votos, total);
          return (
            <div key={o.nombre} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-white/60">{o.nombre}</p>
              <p className="mt-1 text-4xl font-black" style={{ color: COLORES[o.nombre] }}>
                {p.toFixed(2)}%
              </p>
              <p className="text-white/70">{o.votos.toLocaleString("es-PE")} votos</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: COLORES[o.nombre] }} />
              </div>
            </div>
          );
        })}
      </section>

      {/* Avance + estados */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Avance del conteo</h2>
          <span className="text-sm text-white/60">
            {data.total_actas.toLocaleString("es-PE")} / {META_MESAS.toLocaleString("es-PE")} mesas ({avance.toFixed(2)}%)
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-black/40">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, avance)}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Verificadas" value={data.verificadas} color="text-emerald-400" />
          <Stat label="Pendientes" value={data.pendientes} color="text-amber-400" />
          <Stat label="Conflictos" value={data.conflictos} color="text-red-400" />
        </div>
      </section>

      {/* Comparación con ONPE */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-1 font-semibold">Nuestro conteo vs ONPE oficial</h2>
        <p className="mb-4 text-xs text-white/40">
          ONPE actualizado: {onpeData?.latest ? new Date(onpeData.latest.created_at).toLocaleString("es-PE") : ONPE_OFICIAL.actualizado}
          {onpeData?.latest?.pct_actas != null ? ` · ${onpeData.latest.pct_actas}% actas computadas` : ""}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/50">
              <tr className="border-b border-white/10 text-left">
                <th className="py-2">Organización</th>
                <th className="text-right">Nuestro %</th>
                <th className="text-right">ONPE %</th>
                <th className="text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {data.por_organizacion.map((o) => {
                const total = data.por_organizacion.reduce((a, x) => a + x.votos, 0);
                const nuestro = pct(o.votos, total);
                const onpe = onpePct(o.nombre);
                const diff = nuestro - onpe;
                return (
                  <tr key={o.nombre} className="border-b border-white/5">
                    <td className="py-2">{o.nombre}</td>
                    <td className="text-right font-semibold">{nuestro.toFixed(2)}%</td>
                    <td className="text-right text-white/60">{onpe.toFixed(2)}%</td>
                    <td className={`text-right ${Math.abs(diff) > 2 ? "text-amber-400" : "text-white/60"}`}>
                      {diff >= 0 ? "+" : ""}
                      {diff.toFixed(2)} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {onpeData && onpeData.historia.length > 1 && (
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs font-semibold text-white/50">Histórico ONPE (FP / JP)</p>
            <div className="space-y-1 text-xs text-white/60">
              {onpeData.historia.slice(0, 6).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span>{new Date(s.created_at).toLocaleString("es-PE")}</span>
                  <span>
                    <b style={{ color: "#f97316" }}>{Number(s.fp_pct).toFixed(2)}%</b> / <b style={{ color: "#dc2626" }}>{Number(s.jp_pct).toFixed(2)}%</b>
                    {s.pct_actas != null ? ` · ${s.pct_actas}% actas` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Otros votos */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Votos en blanco" value={data.blancos} />
        <Stat label="Votos nulos" value={data.nulos} />
        <Stat label="Impugnados" value={data.impugnados} />
        <Stat label="Votos totales" value={data.votos_totales} />
      </section>

      {/* Por distrito + feed */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 font-semibold">Actas por distrito</h2>
          {data.por_distrito.length === 0 && <p className="text-sm text-white/40">Aún no hay datos.</p>}
          <div className="space-y-2">
            {data.por_distrito.slice(0, 12).map((d) => (
              <div key={d.distrito} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate">{d.distrito}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct(d.actas, data.total_actas)}%` }} />
                </div>
                <span className="w-8 text-right text-white/60">{d.actas}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 font-semibold">Últimas actas registradas</h2>
          {data.ultimas.length === 0 && <p className="text-sm text-white/40">Aún no hay actas.</p>}
          <ul className="space-y-2 text-sm">
            {data.ultimas.map((u) => (
              <li key={u.numero_mesa} className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>
                  Mesa <b>{u.numero_mesa}</b> · <span className="text-white/50">{u.distrito || "—"}</span>
                </span>
                <span className={u.estado === "verificada" ? "text-emerald-400" : "text-amber-400"}>{u.estado}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}

function Stat({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString("es-PE")}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

import type { ActaGuardada } from "./types";
import { listarActas } from "./store";
import { ORGANIZACIONES } from "./organizaciones";

export interface ResumenDashboard {
  total_actas: number;
  verificadas: number;
  pendientes: number;
  conflictos: number;
  por_organizacion: { nombre: string; votos: number; pct: number }[];
  blancos: number;
  nulos: number;
  impugnados: number;
  votos_totales: number;
  por_distrito: { distrito: string; actas: number }[];
  ultimas: { numero_mesa: string; distrito: string; estado: string; created_at: string }[];
}

function sumaTipo(actas: ActaGuardada[], pred: (org?: string, tipo?: string) => boolean): number {
  let s = 0;
  for (const a of actas) for (const l of a.votos) if (pred(l.organizacion, l.tipo)) s += l.valor ?? 0;
  return s;
}

export async function resumen(): Promise<ResumenDashboard> {
  const actas = await listarActas();

  const porOrg = ORGANIZACIONES.map((o) => ({
    nombre: o.nombre,
    votos: sumaTipo(actas, (org) => org === o.nombre),
    pct: 0,
  }));
  const totalPartidos = porOrg.reduce((acc, o) => acc + o.votos, 0);
  porOrg.forEach((o) => (o.pct = totalPartidos ? +((o.votos / totalPartidos) * 100).toFixed(2) : 0));

  const blancos = sumaTipo(actas, (_, t) => t === "blanco");
  const nulos = sumaTipo(actas, (_, t) => t === "nulo");
  const impugnados = sumaTipo(actas, (_, t) => t === "impugnado");

  const distritos = new Map<string, number>();
  for (const a of actas) {
    const d = a.distrito || "—";
    distritos.set(d, (distritos.get(d) ?? 0) + 1);
  }

  return {
    total_actas: actas.length,
    verificadas: actas.filter((a) => a.estado === "verificada").length,
    pendientes: actas.filter((a) => a.estado === "pendiente_revision").length,
    conflictos: actas.filter((a) => a.estado === "conflicto").length,
    por_organizacion: porOrg,
    blancos,
    nulos,
    impugnados,
    votos_totales: totalPartidos + blancos + nulos + impugnados,
    por_distrito: [...distritos.entries()].map(([distrito, actas]) => ({ distrito, actas })).sort((a, b) => b.actas - a.actas),
    ultimas: actas.slice(0, 10).map((a) => ({ numero_mesa: a.numero_mesa, distrito: a.distrito, estado: a.estado, created_at: a.created_at })),
  };
}

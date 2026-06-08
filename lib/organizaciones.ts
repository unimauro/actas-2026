// Catálogo de organizaciones de la Segunda Elección Presidencial 2026.
// (En 2da vuelta solo pasan 2 organizaciones.)
export const ORGANIZACIONES = [
  { nombre: "FUERZA POPULAR", sigla: "K", orden: 1 },
  { nombre: "JUNTOS POR EL PERÚ", sigla: "JP", orden: 2 },
] as const;

// Plantilla de líneas de voto en el orden del acta física.
import type { LineaVoto } from "./types";

export function lineasVacias(): LineaVoto[] {
  return [
    ...ORGANIZACIONES.map((o) => ({
      tipo: "partido" as const,
      organizacion: o.nombre,
      valor: null,
    })),
    { tipo: "blanco" as const, valor: null },
    { tipo: "nulo" as const, valor: null },
    { tipo: "impugnado" as const, valor: null },
  ];
}

export function etiquetaLinea(l: LineaVoto): string {
  if (l.tipo === "partido") return l.organizacion ?? "Organización";
  if (l.tipo === "blanco") return "Votos en blanco";
  if (l.tipo === "nulo") return "Votos nulos";
  return "Votos impugnados";
}

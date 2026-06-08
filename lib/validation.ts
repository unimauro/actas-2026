import type { ActaData, ReglaValidacion } from "./types";

// Suma de todas las líneas de voto (partidos + blanco + nulo + impugnado)
export function sumaVotos(a: ActaData): number {
  return a.votos.reduce((acc, l) => acc + (l.valor ?? 0), 0);
}

// Todas las validaciones del acta. No usa IA: pura aritmética (gratis).
export function validarActa(a: ActaData): ReglaValidacion[] {
  const suma = sumaVotos(a);
  const total = a.total_emitidos;
  const ciudadanos = a.ciudadanos_votaron;
  const habiles = a.electores_habiles;
  const reglas: ReglaValidacion[] = [];

  reglas.push({
    id: "mesa",
    etiqueta: "Número de mesa presente",
    ok: /^\d{6}$/.test(a.numero_mesa.trim()),
    detalle: a.numero_mesa ? `Mesa ${a.numero_mesa}` : "Falta el número de mesa (6 dígitos)",
  });

  reglas.push({
    id: "suma",
    etiqueta: "Σ votos = total emitidos",
    ok: total != null && suma === total,
    detalle:
      total == null
        ? "Falta el total emitido"
        : `${suma} ${suma === total ? "=" : "≠"} ${total}`,
  });

  // El "Cartel de Resultados" no tiene el campo "ciudadanos que votaron": esta regla no aplica.
  const esCartel = a.tipo_documento === "cartel" || ciudadanos == null;
  reglas.push({
    id: "ciudadanos",
    etiqueta: "Total emitidos = ciudadanos que votaron",
    ok: esCartel ? true : total === ciudadanos,
    detalle: esCartel
      ? "No aplica (cartel de resultados)"
      : `${total} ${total === ciudadanos ? "=" : "≠"} ${ciudadanos}`,
  });

  // Si no se leyó "electores hábiles" (común en carteles), esta regla no aplica.
  reglas.push({
    id: "habiles",
    etiqueta: "Emitidos ≤ electores hábiles",
    ok: habiles == null ? true : total != null && total <= habiles,
    detalle:
      habiles == null
        ? "No aplica (sin dato de electores hábiles)"
        : `${total} ${total != null && total <= habiles ? "≤" : ">"} ${habiles}`,
  });

  reglas.push({
    id: "negativos",
    etiqueta: "Sin valores negativos o vacíos",
    ok: a.votos.every((l) => l.valor != null && l.valor >= 0),
    detalle: a.votos.some((l) => l.valor == null)
      ? "Hay líneas sin valor"
      : "Todos los valores son válidos",
  });

  return reglas;
}

export function esValida(a: ActaData): boolean {
  return validarActa(a).every((r) => r.ok);
}

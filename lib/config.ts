// Parámetros del conteo ciudadano (ajustables)

// Total estimado de mesas presidenciales a nivel nacional (segunda vuelta).
export const META_MESAS = 90000;

// Referencia OFICIAL ONPE para comparar (actualizar con el último dato publicado).
// Fuente: resultadosegundavuelta.onpe.gob.pe
export const ONPE_OFICIAL = {
  actualizado: "7-jun-2026 7:10 p.m.",
  organizaciones: [
    { nombre: "FUERZA POPULAR", pct: 54.009, votos: 205339 },
    { nombre: "JUNTOS POR EL PERÚ", pct: 45.991, votos: 174859 },
  ],
};

export const COLORES: Record<string, string> = {
  "FUERZA POPULAR": "#f97316", // naranja
  "JUNTOS POR EL PERÚ": "#dc2626", // rojo
};

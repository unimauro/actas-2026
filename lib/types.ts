// Tipos compartidos del acta electoral ONPE

export type TipoVoto = "partido" | "blanco" | "nulo" | "impugnado";

export interface LineaVoto {
  tipo: TipoVoto;
  organizacion?: string; // solo si tipo === 'partido'
  valor: number | null;
}

export type CargoMiembro = "presidente" | "secretario" | "tercero";

export interface Miembro {
  cargo: CargoMiembro;
  nombres: string;
  apellidos: string;
  dni: string;
}

export type TipoDocumento = "acta" | "cartel"; // Acta Electoral | Cartel de Resultados

export interface ActaData {
  numero_mesa: string;
  tipo_documento?: TipoDocumento;
  codigo_barra?: string;
  tipo_pagina?: string; // ej. "4b", "7"
  departamento: string;
  provincia: string;
  distrito: string;
  electores_habiles: number | null;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  votos: LineaVoto[];
  total_emitidos: number | null;
  ciudadanos_votaron: number | null;
  observaciones?: string;
  miembros: Miembro[];
}

// Confianza 0..1 por campo (clave = ruta del campo, ej. "votos.0.valor")
export type MapaConfianza = Record<string, number>;

export interface ActaDraft {
  data: ActaData;
  confianza: MapaConfianza;
  modelo: string;
  demo: boolean;
}

export interface ReglaValidacion {
  id: string;
  etiqueta: string;
  ok: boolean;
  detalle: string;
}

// Metadatos del envío: quién subió, desde dónde, con qué correo verificado.
export interface EnvioMeta {
  email?: string;
  personero_nombre?: string;
  personero_dni?: string;
  ip?: string;
  user_agent?: string;
  enviado_en?: string;
}

// Estados persistidos de un acta
export type ActaEstado = "verificada" | "pendiente_revision" | "conflicto" | "rechazada";

export interface ResultadoGuardado {
  ok: boolean;
  estado: ActaEstado | "duplicada"; // "duplicada" es un resultado transitorio, no se persiste
  mensaje: string;
  existente?: ActaData;
}

export interface ActaGuardada extends ActaData {
  id: string;
  estado: ActaEstado;
  suma_valida: boolean;
  created_at: string;
  meta?: EnvioMeta;
}

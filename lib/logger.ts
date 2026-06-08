// Log estructurado (JSON) — Netlify/Vercel lo capturan en sus paneles de logs.
export function log(evento: string, payload: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), evento, ...payload }));
}

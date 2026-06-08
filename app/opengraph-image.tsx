import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Conteo Ciudadano 2026 — en vivo";
export const revalidate = 60; // se regenera cada minuto con los datos nuevos

async function tally() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { fp: 0, jp: 0, actas: 0 };
    const r = await fetch(`${url}/rest/v1/actas?select=data`, {
      headers: { apikey: key },
      next: { revalidate: 60 },
    });
    const rows = (await r.json()) as { data: { votos?: { organizacion?: string; valor?: number }[] } }[];
    let fp = 0,
      jp = 0;
    for (const row of rows || []) {
      for (const v of row.data?.votos || []) {
        if (v.organizacion === "FUERZA POPULAR") fp += v.valor || 0;
        if (v.organizacion === "JUNTOS POR EL PERÚ") jp += v.valor || 0;
      }
    }
    return { fp, jp, actas: (rows || []).length };
  } catch {
    return { fp: 0, jp: 0, actas: 0 };
  }
}

export default async function OG() {
  const { fp, jp, actas } = await tally();
  const tot = fp + jp || 1;
  const fpPct = (fp / tot) * 100;
  const jpPct = (jp / tot) * 100;
  const fmt = (n: number) => n.toLocaleString("es-PE");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0b1220 0%, #0e2235 60%, #0b1220 100%)",
          color: "#e7ecf3",
          fontFamily: "sans-serif",
        }}
      >
        {/* Encabezado */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 16, height: 28, borderRight: "7px solid white", borderBottom: "7px solid white", transform: "rotate(45deg)", marginTop: -5 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 800 }}>Conteo Ciudadano 2026</span>
            <span style={{ fontSize: 24, color: "#94a3b8" }}>Segunda Elección Presidencial · en vivo</span>
          </div>
        </div>

        {/* Porcentajes */}
        <div style={{ display: "flex", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 28, color: "#fdba74" }}>FUERZA POPULAR</span>
            <span style={{ fontSize: 92, fontWeight: 800, color: "#f97316", lineHeight: 1 }}>{fpPct.toFixed(1)}%</span>
            <span style={{ fontSize: 26, color: "#cbd5e1" }}>{fmt(fp)} votos</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 28, color: "#fca5a5" }}>JUNTOS POR EL PERÚ</span>
            <span style={{ fontSize: 92, fontWeight: 800, color: "#dc2626", lineHeight: 1 }}>{jpPct.toFixed(1)}%</span>
            <span style={{ fontSize: 26, color: "#cbd5e1" }}>{fmt(jp)} votos</span>
          </div>
        </div>

        {/* Barra comparativa */}
        <div style={{ display: "flex", width: "100%", height: 34, borderRadius: 17, overflow: "hidden", background: "#1e293b" }}>
          <div style={{ display: "flex", width: `${fpPct}%`, background: "#f97316" }} />
          <div style={{ display: "flex", width: `${jpPct}%`, background: "#dc2626" }} />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#64748b" }}>
          <span>{fmt(actas)} actas recolectadas</span>
          <span>conteojp.netlify.app</span>
        </div>
      </div>
    ),
    size
  );
}

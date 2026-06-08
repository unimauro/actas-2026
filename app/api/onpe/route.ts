import { NextRequest, NextResponse } from "next/server";
import { adminOk } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// GET -> { latest, historia } de los snapshots oficiales de ONPE
export async function GET() {
  if (!URL || !KEY) return NextResponse.json({ latest: null, historia: [] });
  const r = await fetch(`${URL}/rest/v1/onpe_snapshots?select=*&order=created_at.desc&limit=50`, {
    headers: { apikey: KEY },
    cache: "no-store",
  });
  const historia = await r.json();
  return NextResponse.json({ latest: historia?.[0] ?? null, historia: historia ?? [] });
}

// POST { fp_pct, fp_votos, jp_pct, jp_votos, pct_actas } (header x-admin-password)
export async function POST(req: NextRequest) {
  if (!adminOk(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!URL || !KEY) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  const b = await req.json();
  const fila = {
    fp_pct: Number(b.fp_pct) || null,
    fp_votos: b.fp_votos != null ? Number(b.fp_votos) : null,
    jp_pct: Number(b.jp_pct) || null,
    jp_votos: b.jp_votos != null ? Number(b.jp_votos) : null,
    pct_actas: b.pct_actas != null && b.pct_actas !== "" ? Number(b.pct_actas) : null,
  };
  const r = await fetch(`${URL}/rest/v1/onpe_snapshots`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(fila),
  });
  if (r.status !== 201) return NextResponse.json({ error: `Error ${r.status}: ${await r.text()}` }, { status: 500 });
  return NextResponse.json({ ok: true });
}

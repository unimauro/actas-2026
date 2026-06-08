import { NextRequest, NextResponse } from "next/server";
import { guardarActa, listarActas } from "@/lib/store";
import { log } from "@/lib/logger";
import type { ActaData, EnvioMeta } from "@/lib/types";

export const runtime = "nodejs";

function ipDe(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "desconocida";
}

// POST { data, meta } -> guarda con validación + antiduplicado + trazabilidad (IP)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { data: ActaData; meta?: Partial<EnvioMeta> };
    if (!body?.data) return NextResponse.json({ error: "Falta data" }, { status: 400 });

    const meta: EnvioMeta = {
      email: body.meta?.email || undefined,
      personero_nombre: body.meta?.personero_nombre || undefined,
      personero_dni: body.meta?.personero_dni || undefined,
      ip: ipDe(req),
      user_agent: req.headers.get("user-agent") ?? undefined,
    };

    const res = await guardarActa(body.data, meta);

    log("envio_acta", {
      mesa: body.data.numero_mesa,
      estado: res.estado,
      ok: res.ok,
      personero_dni: meta.personero_dni,
      email: meta.email,
      ip: meta.ip,
    });

    return NextResponse.json(res, { status: res.ok ? 201 : 409 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

// GET -> lista de actas
export async function GET() {
  return NextResponse.json(await listarActas());
}

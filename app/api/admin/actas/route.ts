import { NextRequest, NextResponse } from "next/server";
import { listarActas, actualizarEstado } from "@/lib/store";
import { adminOk } from "@/lib/auth";
import { log } from "@/lib/logger";
import type { ActaGuardada } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET (header x-admin-password) -> todas las actas con metadatos
export async function GET(req: NextRequest) {
  if (!adminOk(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json({ actas: await listarActas() });
}

// PATCH { numero_mesa, estado } (header x-admin-password) -> cambia estado
export async function PATCH(req: NextRequest) {
  if (!adminOk(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = (await req.json()) as { numero_mesa?: string; estado?: ActaGuardada["estado"] };
  if (!body.numero_mesa || !body.estado) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const r = await actualizarEstado(body.numero_mesa, body.estado);
  log("admin_cambio_estado", { mesa: body.numero_mesa, estado: body.estado, ok: r.ok });
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}

import { NextRequest, NextResponse } from "next/server";
import { buscarPorMesa } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?mesa=XXXXXX -> datos PÚBLICOS del acta (sin meta: nada de DNI/IP)
export async function GET(req: NextRequest) {
  const mesa = req.nextUrl.searchParams.get("mesa")?.trim();
  if (!mesa) return NextResponse.json({ error: "Falta el número de mesa" }, { status: 400 });

  const a = await buscarPorMesa(mesa);
  if (!a) return NextResponse.json({ encontrada: false });

  return NextResponse.json({
    encontrada: true,
    acta: {
      numero_mesa: a.numero_mesa,
      tipo_documento: a.tipo_documento,
      departamento: a.departamento,
      provincia: a.provincia,
      distrito: a.distrito,
      votos: a.votos,
      total_emitidos: a.total_emitidos,
      estado: a.estado,
      created_at: a.created_at,
    },
  });
}

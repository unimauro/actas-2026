import { NextRequest, NextResponse } from "next/server";
import { extraerActa } from "@/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST multipart/form-data { imagen: File } -> borrador del acta (OCR)
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("imagen") as File | null;
    if (!file) return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const draft = await extraerActa(buf, file.type || "image/jpeg");
    return NextResponse.json(draft);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error en OCR" }, { status: 500 });
  }
}

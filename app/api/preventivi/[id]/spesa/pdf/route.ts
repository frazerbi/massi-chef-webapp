import { NextResponse } from "next/server";
import { listaSpesaPreventivo } from "@/lib/db/listaSpesa";
import { generaPdfListaSpesa } from "@/lib/pdf/listaSpesaPdf";

export const runtime = "nodejs";

export async function GET(
  _richiesta: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const lista = await listaSpesaPreventivo(id);
    const pdf = await generaPdfListaSpesa(lista);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="lista-spesa-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (errore) {
    return NextResponse.json(
      { errore: (errore as Error).message },
      { status: 400 },
    );
  }
}

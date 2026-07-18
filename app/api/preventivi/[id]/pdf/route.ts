import { NextResponse } from "next/server";
import { calcolaPreventivo } from "@/lib/db/preventivi";
import { generaPdfPreventivo } from "@/lib/pdf/preventivoPdf";

export const runtime = "nodejs";

export async function GET(
  _richiesta: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const calcolo = await calcolaPreventivo(id);
    const pdf = await generaPdfPreventivo(calcolo);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="preventivo-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (errore) {
    return NextResponse.json(
      { errore: (errore as Error).message },
      { status: 400 },
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { creaClientServer } from "@/lib/db/server";

/**
 * Riceve il redirect dei link email di Supabase (recupero password, invito, ecc.)
 * e scambia il "code" PKCE per una sessione, prima di proseguire su "next".
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await creaClientServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?errore=recupero`);
}

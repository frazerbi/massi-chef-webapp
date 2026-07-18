import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rinnova la sessione Supabase a ogni richiesta e reindirizza a /login
 * gli utenti non autenticati (tranne le route pubbliche).
 */
export async function aggiornaSessione(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chiave) {
    return response;
  }

  const supabase = createServerClient(url, chiave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const percorso = request.nextUrl.pathname;
  const pubblica = percorso.startsWith("/login");

  if (!user && !pubblica) {
    const destinazione = request.nextUrl.clone();
    destinazione.pathname = "/login";
    return NextResponse.redirect(destinazione);
  }
  if (user && pubblica) {
    const destinazione = request.nextUrl.clone();
    destinazione.pathname = "/";
    return NextResponse.redirect(destinazione);
  }

  return response;
}

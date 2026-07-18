import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Unico punto di creazione del client Supabase lato server.
 * Tutte le query del progetto passano dai moduli di /lib/db/.
 */
export async function creaClientServer(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chiave) {
    throw new Error(
      "Variabili d'ambiente Supabase mancanti: impostare NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, chiave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // chiamato da un Server Component: i cookie sono gestiti dal middleware
        }
      },
    },
  });
}

/** Utente autenticato corrente; lancia se la sessione manca. */
export async function utenteCorrente() {
  const supabase = await creaClientServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Utente non autenticato");
  }
  return data.user;
}

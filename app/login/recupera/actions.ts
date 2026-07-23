"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { creaClientServer } from "@/lib/db/server";
import { parseTesto } from "@/lib/form";

export async function richiediRecuperoPassword(formData: FormData): Promise<void> {
  const email = parseTesto(formData.get("email"), "email");

  const elencoHeader = await headers();
  const host = elencoHeader.get("x-forwarded-host") ?? elencoHeader.get("host") ?? "localhost:3000";
  const protocollo = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocollo}://${host}`;

  const supabase = await creaClientServer();
  // L'esito non viene distinto in UI per non rivelare se l'email è registrata.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/login/recupera/imposta`,
  });

  redirect("/login/recupera?inviato=1");
}

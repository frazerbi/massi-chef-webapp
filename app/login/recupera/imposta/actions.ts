"use server";

import { redirect } from "next/navigation";
import { creaClientServer } from "@/lib/db/server";
import { parseTesto } from "@/lib/form";

export async function impostaNuovaPassword(formData: FormData): Promise<void> {
  const password = parseTesto(formData.get("password"), "password");
  const conferma = parseTesto(formData.get("conferma"), "conferma password");

  if (password.length < 8) {
    redirect("/login/recupera/imposta?errore=corta");
  }
  if (password !== conferma) {
    redirect("/login/recupera/imposta?errore=mismatch");
  }

  const supabase = await creaClientServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/login/recupera/imposta?errore=generico");
  }

  redirect("/");
}

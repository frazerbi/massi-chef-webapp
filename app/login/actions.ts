"use server";

import { redirect } from "next/navigation";
import { creaClientServer } from "@/lib/db/server";
import { parseTesto } from "@/lib/form";

export async function accedi(formData: FormData): Promise<void> {
  const email = parseTesto(formData.get("email"), "email");
  const password = parseTesto(formData.get("password"), "password");

  const supabase = await creaClientServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?errore=credenziali");
  }
  redirect("/");
}

export async function esci(): Promise<void> {
  const supabase = await creaClientServer();
  await supabase.auth.signOut();
  redirect("/login");
}

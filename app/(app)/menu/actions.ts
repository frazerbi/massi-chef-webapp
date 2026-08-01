"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aggiungiMateriaPrimaAMenu,
  aggiungiRicettaAMenu,
  creaMenu,
  eliminaMenu,
  rimuoviRigaMenu,
} from "@/lib/db/menu";
import { parseNumero, parseTesto, parseTestoOpzionale } from "@/lib/form";

export async function azioneCreaMenu(formData: FormData): Promise<void> {
  const id = await creaMenu(
    parseTesto(formData.get("nome"), "nome"),
    parseTestoOpzionale(formData.get("descrizione")),
  );
  revalidatePath("/menu");
  redirect(`/menu/${id}`);
}

export async function azioneAggiungiRicettaAMenu(formData: FormData): Promise<void> {
  const menuId = parseTesto(formData.get("menu_id"), "menu");
  await aggiungiRicettaAMenu(
    menuId,
    parseTesto(formData.get("ricetta_id"), "ricetta"),
    parseNumero(formData.get("ordine") || "0", "ordine"),
  );
  revalidatePath(`/menu/${menuId}`);
}

export async function azioneAggiungiMateriaPrimaAMenu(formData: FormData): Promise<void> {
  const menuId = parseTesto(formData.get("menu_id"), "menu");
  await aggiungiMateriaPrimaAMenu(
    menuId,
    parseTesto(formData.get("materia_prima_id"), "materia prima"),
    parseNumero(formData.get("quantita_persona"), "quantità a persona"),
    parseNumero(formData.get("ordine") || "0", "ordine"),
  );
  revalidatePath(`/menu/${menuId}`);
}

export async function azioneRimuoviRigaMenu(formData: FormData): Promise<void> {
  const menuId = parseTesto(formData.get("menu_id"), "menu");
  await rimuoviRigaMenu(parseTesto(formData.get("id"), "id"));
  revalidatePath(`/menu/${menuId}`);
}

export async function azioneEliminaMenu(formData: FormData): Promise<void> {
  await eliminaMenu(parseTesto(formData.get("id"), "id"));
  revalidatePath("/menu");
  redirect("/menu");
}

"use server";

import { revalidatePath } from "next/cache";
import { creaBevanda, eliminaBevanda, type InputBevanda } from "@/lib/db/bevande";
import type { CategoriaBevanda, UnitaBevanda } from "@/lib/db/types";
import { parseEuroCent, parseNumero, parseTesto, parseTestoOpzionale } from "@/lib/form";

export async function azioneCreaBevanda(formData: FormData): Promise<void> {
  const input: InputBevanda = {
    nome: parseTesto(formData.get("nome"), "nome"),
    categoria: parseTesto(formData.get("categoria"), "categoria") as CategoriaBevanda,
    formato_confezione: parseTestoOpzionale(formData.get("formato")),
    capacita_unitaria: parseNumero(formData.get("capacita"), "capacità unitaria"),
    unita: parseTesto(formData.get("unita"), "unità") as UnitaBevanda,
    unita_per_collo: parseNumero(formData.get("unita_per_collo"), "unità per collo"),
    prezzo_unitario_cent: parseEuroCent(formData.get("prezzo"), "prezzo unitario"),
    alcolica: false, // derivata dalla categoria in /lib/db/bevande
    note: parseTestoOpzionale(formData.get("note")),
  };
  await creaBevanda(input);
  revalidatePath("/bevande");
}

export async function azioneEliminaBevanda(formData: FormData): Promise<void> {
  await eliminaBevanda(parseTesto(formData.get("id"), "id"));
  revalidatePath("/bevande");
}

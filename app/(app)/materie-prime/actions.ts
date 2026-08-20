"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aggiornaMateriaPrima,
  aggiornaPrezzoMateriaPrima,
  creaMateriaPrima,
  eliminaMateriaPrima,
  type InputMateriaPrima,
} from "@/lib/db/materiePrime";
import type { UnitaAcquisto, UnitaUso } from "@/lib/db/types";
import { parseEuroCent, parseNumero, parseTesto, parseTestoOpzionale } from "@/lib/form";

const COPPIE_UNITA: Record<string, { acquisto: UnitaAcquisto; uso: UnitaUso }> = {
  kg: { acquisto: "kg", uso: "g" },
  l: { acquisto: "l", uso: "ml" },
  pz: { acquisto: "pz", uso: "pz" },
  conf: { acquisto: "conf", uso: "pz" },
};

function leggiForm(formData: FormData): InputMateriaPrima {
  const coppia = COPPIE_UNITA[parseTesto(formData.get("unita"), "unità")];
  if (!coppia) throw new Error("Unità di misura non ammessa");
  return {
    nome: parseTesto(formData.get("nome"), "nome"),
    categoria: parseTesto(formData.get("categoria"), "categoria"),
    marca: parseTestoOpzionale(formData.get("marca")),
    unita_acquisto: coppia.acquisto,
    unita_uso: coppia.uso,
    prezzo_acquisto_cent: parseEuroCent(formData.get("prezzo"), "prezzo"),
    fattore_conversione: parseNumero(formData.get("fattore"), "fattore di conversione"),
    resa_percentuale: parseNumero(formData.get("resa"), "resa"),
    fornitore_preferito: parseTestoOpzionale(formData.get("fornitore")),
    allergeni: formData.getAll("allergeni").map(String),
    note: parseTestoOpzionale(formData.get("note")),
  };
}

export async function azioneCreaMateriaPrima(formData: FormData): Promise<void> {
  await creaMateriaPrima(leggiForm(formData));
  revalidatePath("/materie-prime");
  redirect("/materie-prime");
}

export async function azioneAggiornaMateriaPrima(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  await aggiornaMateriaPrima(id, leggiForm(formData));
  revalidatePath("/materie-prime");
  redirect("/materie-prime");
}

export async function azioneAggiornaPrezzo(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  await aggiornaPrezzoMateriaPrima(id, parseEuroCent(formData.get("prezzo"), "prezzo"));
  revalidatePath("/materie-prime");
}

export async function azioneEliminaMateriaPrima(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  await eliminaMateriaPrima(id);
  revalidatePath("/materie-prime");
  redirect("/materie-prime");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aggiornaConsumabile,
  creaConsumabile,
  eliminaConsumabile,
  type InputConsumabile,
} from "@/lib/db/consumabili";
import type { TipoConsumabile, UnitaAcquisto, UnitaUso } from "@/lib/db/types";
import { parseEuroCent, parseNumero, parseTesto, parseTestoOpzionale } from "@/lib/form";

const COPPIE_UNITA: Record<string, { acquisto: UnitaAcquisto; uso: UnitaUso }> = {
  kg: { acquisto: "kg", uso: "g" },
  l: { acquisto: "l", uso: "ml" },
  pz: { acquisto: "pz", uso: "pz" },
  conf: { acquisto: "conf", uso: "pz" },
};

function leggiForm(formData: FormData): InputConsumabile {
  const coppia = COPPIE_UNITA[parseTesto(formData.get("unita"), "unità")];
  if (!coppia) throw new Error("Unità di misura non ammessa");
  const tipo = parseTesto(formData.get("tipo_consumabile"), "tipo");
  if (tipo !== "apparecchiatura" && tipo !== "consumabile") {
    throw new Error("Tipo consumabile non ammesso");
  }
  return {
    nome: parseTesto(formData.get("nome"), "nome"),
    categoria: parseTesto(formData.get("categoria"), "categoria"),
    tipo_consumabile: tipo as TipoConsumabile,
    unita_acquisto: coppia.acquisto,
    unita_uso: coppia.uso,
    prezzo_acquisto_cent: parseEuroCent(formData.get("prezzo"), "prezzo"),
    fattore_conversione: parseNumero(formData.get("fattore"), "fattore di conversione"),
    fornitore_preferito: parseTestoOpzionale(formData.get("fornitore")),
    note: parseTestoOpzionale(formData.get("note")),
  };
}

export async function azioneCreaConsumabile(formData: FormData): Promise<void> {
  await creaConsumabile(leggiForm(formData));
  revalidatePath("/consumabili");
}

export async function azioneAggiornaConsumabile(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  await aggiornaConsumabile(id, leggiForm(formData));
  revalidatePath("/consumabili");
  redirect("/consumabili");
}

export async function azioneEliminaConsumabile(formData: FormData): Promise<void> {
  await eliminaConsumabile(parseTesto(formData.get("id"), "id"));
  revalidatePath("/consumabili");
}

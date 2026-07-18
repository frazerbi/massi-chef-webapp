"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  aggiornaRicetta,
  aggiungiIngredienteMateriaPrima,
  aggiungiSottoRicetta,
  creaRicetta,
  eliminaRicetta,
  rimuoviIngrediente,
  type InputRicetta,
} from "@/lib/db/ricette";
import type { CategoriaPortata } from "@/lib/db/types";
import {
  parseEuroCent,
  parseNumero,
  parseNumeroOpzionale,
  parseTesto,
  parseTestoOpzionale,
} from "@/lib/form";

function leggiForm(formData: FormData): InputRicetta {
  return {
    nome: parseTesto(formData.get("nome"), "nome"),
    descrizione: parseTestoOpzionale(formData.get("descrizione")),
    categoria_portata: parseTesto(formData.get("portata"), "portata") as CategoriaPortata,
    porzioni_base: parseNumero(formData.get("porzioni_base"), "porzioni base"),
    tempo_preparazione_min: parseNumeroOpzionale(formData.get("tempo")),
    costo_manuale_extra_cent: parseEuroCent(
      formData.get("costo_extra") || "0",
      "costo manuale extra",
    ),
    istruzioni: parseTestoOpzionale(formData.get("istruzioni")),
    attiva: formData.get("attiva") === "on",
  };
}

export async function azioneCreaRicetta(formData: FormData): Promise<void> {
  const id = await creaRicetta(leggiForm(formData));
  revalidatePath("/ricette");
  redirect(`/ricette/${id}`);
}

export async function azioneAggiornaRicetta(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  await aggiornaRicetta(id, leggiForm(formData));
  revalidatePath(`/ricette/${id}`);
  revalidatePath("/ricette");
}

export async function azioneEliminaRicetta(formData: FormData): Promise<void> {
  await eliminaRicetta(parseTesto(formData.get("id"), "id"));
  revalidatePath("/ricette");
  redirect("/ricette");
}

export async function azioneAggiungiIngrediente(formData: FormData): Promise<void> {
  const ricettaId = parseTesto(formData.get("ricetta_id"), "ricetta");
  await aggiungiIngredienteMateriaPrima(
    ricettaId,
    parseTesto(formData.get("materia_prima_id"), "materia prima"),
    parseNumero(formData.get("quantita"), "quantità"),
    formData.get("opzionale") === "on",
  );
  revalidatePath(`/ricette/${ricettaId}`);
}

export async function azioneAggiungiSottoRicetta(formData: FormData): Promise<void> {
  const ricettaId = parseTesto(formData.get("ricetta_id"), "ricetta");
  await aggiungiSottoRicetta(
    ricettaId,
    parseTesto(formData.get("sotto_ricetta_id"), "sotto-ricetta"),
    parseNumero(formData.get("quantita_porzioni"), "porzioni"),
    formData.get("opzionale") === "on",
  );
  revalidatePath(`/ricette/${ricettaId}`);
}

export async function azioneRimuoviIngrediente(formData: FormData): Promise<void> {
  const ricettaId = parseTesto(formData.get("ricetta_id"), "ricetta");
  await rimuoviIngrediente(parseTesto(formData.get("id"), "id"));
  revalidatePath(`/ricette/${ricettaId}`);
}

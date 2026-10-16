"use server";

import { revalidatePath } from "next/cache";
import {
  creaCategoriaMateriaPrima,
  eliminaCategoriaMateriaPrima,
  rinominaCategoriaMateriaPrima,
  spostaCategoriaMateriaPrima,
} from "@/lib/db/categorieMateriaPrima";
import { aggiornaImpostazioni } from "@/lib/db/impostazioni";
import { parseEuroCent, parseNumero, parseTesto } from "@/lib/form";

export async function azioneSalvaImpostazioni(formData: FormData): Promise<void> {
  await aggiornaImpostazioni({
    sfrido_catering_pct: parseNumero(formData.get("sfrido_catering"), "sfrido catering"),
    sfrido_privato_pct: parseNumero(formData.get("sfrido_privato"), "sfrido privato"),
    fattore_distribuzione_pct: parseNumero(
      formData.get("fattore_distribuzione"),
      "fattore di distribuzione",
    ),
    quota_bibite_bambini_pct: parseNumero(
      formData.get("quota_bibite_bambini"),
      "quota bibite bambini",
    ),
    acconto_pct: parseNumero(formData.get("acconto"), "acconto"),
    soglia_spesatura_cent: parseEuroCent(formData.get("soglia_spesatura"), "soglia spesatura"),
    giorni_avviso_scadenze: parseNumero(formData.get("giorni_avviso"), "avviso scadenze"),
    validita_preventivo_giorni: parseNumero(
      formData.get("validita_preventivo"),
      "validità preventivo",
    ),
  });
  revalidatePath("/impostazioni");
}

// ---------- CL-2: categorie delle materie prime ----------

function aggiornaPagineCategorie() {
  revalidatePath("/impostazioni");
  revalidatePath("/prodotti");
  revalidatePath("/materie-prime");
}

export async function azioneCreaCategoria(formData: FormData): Promise<void> {
  await creaCategoriaMateriaPrima(parseTesto(formData.get("nome"), "nome categoria"));
  aggiornaPagineCategorie();
}

export async function azioneRinominaCategoria(formData: FormData): Promise<void> {
  await rinominaCategoriaMateriaPrima(
    parseTesto(formData.get("id"), "id"),
    parseTesto(formData.get("nome"), "nome categoria"),
  );
  aggiornaPagineCategorie();
}

export async function azioneSpostaCategoria(formData: FormData): Promise<void> {
  const direzione = parseTesto(formData.get("direzione"), "direzione");
  if (direzione !== "su" && direzione !== "giu") throw new Error("Direzione non valida");
  await spostaCategoriaMateriaPrima(parseTesto(formData.get("id"), "id"), direzione);
  aggiornaPagineCategorie();
}

export async function azioneEliminaCategoria(formData: FormData): Promise<void> {
  await eliminaCategoriaMateriaPrima(parseTesto(formData.get("id"), "id"));
  aggiornaPagineCategorie();
}

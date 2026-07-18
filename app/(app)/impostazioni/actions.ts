"use server";

import { revalidatePath } from "next/cache";
import { aggiornaImpostazioni } from "@/lib/db/impostazioni";
import { parseEuroCent, parseNumero } from "@/lib/form";

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

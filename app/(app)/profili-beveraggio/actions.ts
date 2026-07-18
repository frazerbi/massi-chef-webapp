"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  creaProfilo,
  creaProfiloStandard,
  eliminaProfilo,
  impostaRigaProfilo,
  rimuoviRigaProfilo,
} from "@/lib/db/profiliBeveraggio";
import type { CategoriaBevanda, UnitaBevanda } from "@/lib/db/types";
import { parseNumero, parseTesto, parseTestoOpzionale } from "@/lib/form";

export async function azioneCreaProfilo(formData: FormData): Promise<void> {
  const id = await creaProfilo(
    parseTesto(formData.get("nome"), "nome"),
    parseTestoOpzionale(formData.get("note")),
  );
  revalidatePath("/profili-beveraggio");
  redirect(`/profili-beveraggio/${id}`);
}

export async function azioneCreaProfiloStandard(): Promise<void> {
  const id = await creaProfiloStandard();
  revalidatePath("/profili-beveraggio");
  redirect(`/profili-beveraggio/${id}`);
}

export async function azioneImpostaRigaProfilo(formData: FormData): Promise<void> {
  const profiloId = parseTesto(formData.get("profilo_id"), "profilo");
  await impostaRigaProfilo(
    profiloId,
    parseTesto(formData.get("categoria"), "categoria") as CategoriaBevanda,
    parseNumero(formData.get("quantita"), "quantità a testa"),
    parseTesto(formData.get("unita"), "unità") as UnitaBevanda,
    parseNumero(formData.get("quantita_ora") || "0", "quantità a testa/ora"),
  );
  revalidatePath(`/profili-beveraggio/${profiloId}`);
}

export async function azioneRimuoviRigaProfilo(formData: FormData): Promise<void> {
  const profiloId = parseTesto(formData.get("profilo_id"), "profilo");
  await rimuoviRigaProfilo(parseTesto(formData.get("id"), "id"));
  revalidatePath(`/profili-beveraggio/${profiloId}`);
}

export async function azioneEliminaProfilo(formData: FormData): Promise<void> {
  await eliminaProfilo(parseTesto(formData.get("id"), "id"));
  revalidatePath("/profili-beveraggio");
  redirect("/profili-beveraggio");
}

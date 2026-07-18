import { PROFILO_STANDARD } from "@/lib/calc/beveraggio";
import { creaClientServer } from "./server";
import type {
  CategoriaBevanda,
  ProfiloBeveraggio,
  ProfiloBeveraggioRiga,
  UnitaBevanda,
} from "./types";
import { validaTesto } from "./validazioni";

export async function elencoProfili(): Promise<ProfiloBeveraggio[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("profilo_beveraggio")
    .select("*")
    .is("deleted_at", null)
    .order("nome");
  if (error) throw new Error(`Lettura profili beveraggio fallita: ${error.message}`);
  return (data ?? []) as ProfiloBeveraggio[];
}

export async function righeDiProfilo(
  profiloId: string,
): Promise<ProfiloBeveraggioRiga[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("profilo_beveraggio_riga")
    .select("*")
    .eq("profilo_id", profiloId)
    .order("categoria");
  if (error) throw new Error(`Lettura righe profilo fallita: ${error.message}`);
  return (data ?? []) as ProfiloBeveraggioRiga[];
}

export async function creaProfilo(
  nome: string,
  note?: string | null,
): Promise<string> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("profilo_beveraggio")
    .insert({ nome: validaTesto(nome, "nome profilo"), note })
    .select("id")
    .single();
  if (error) throw new Error(`Creazione profilo fallita: ${error.message}`);
  return data.id as string;
}

export async function impostaRigaProfilo(
  profiloId: string,
  categoria: CategoriaBevanda,
  quantitaATesta: number,
  unita: UnitaBevanda,
  quantitaATestaOra = 0,
): Promise<void> {
  if (!Number.isFinite(quantitaATesta) || quantitaATesta < 0) {
    throw new Error(`Quantità a testa non valida: ${quantitaATesta}`);
  }
  const supabase = await creaClientServer();
  const { error } = await supabase.from("profilo_beveraggio_riga").upsert(
    {
      profilo_id: profiloId,
      categoria,
      quantita_a_testa: quantitaATesta,
      unita,
      quantita_a_testa_ora: quantitaATestaOra,
    },
    { onConflict: "profilo_id,categoria" },
  );
  if (error) throw new Error(`Salvataggio riga profilo fallito: ${error.message}`);
}

export async function rimuoviRigaProfilo(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("profilo_beveraggio_riga")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Rimozione riga profilo fallita: ${error.message}`);
}

export async function eliminaProfilo(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("profilo_beveraggio")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Eliminazione profilo fallita: ${error.message}`);
}

/**
 * Crea il "Profilo standard" con i valori a testa della specifica §5.11.
 * Nessun dato inventato: solo i default documentati.
 */
export async function creaProfiloStandard(): Promise<string> {
  const profiloId = await creaProfilo(
    "Profilo standard",
    "Valori a testa della specifica (servizio completo)",
  );
  for (const riga of PROFILO_STANDARD) {
    await impostaRigaProfilo(
      profiloId,
      riga.categoria,
      riga.quantitaATesta,
      riga.unita,
    );
  }
  return profiloId;
}

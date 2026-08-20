import { creaClientServer } from "./server";
import type { Consumabile, TipoConsumabile, UnitaAcquisto, UnitaUso } from "./types";
import {
  validaCentesimi,
  validaConversioneUnita,
  validaQuantita,
  validaTesto,
} from "./validazioni";

export interface InputConsumabile {
  nome: string;
  categoria: string;
  /** CL-1: apparecchiatura o consumabile — gruppo di presentazione nel preventivo */
  tipo_consumabile: TipoConsumabile;
  unita_acquisto: UnitaAcquisto;
  prezzo_acquisto_cent: number;
  unita_uso: UnitaUso;
  fattore_conversione: number;
  fornitore_preferito?: string | null;
  note?: string | null;
}

function validaInput(input: InputConsumabile) {
  const nome = validaTesto(input.nome, "nome");
  validaCentesimi(input.prezzo_acquisto_cent, "prezzo di acquisto");
  validaQuantita(input.fattore_conversione, "fattore di conversione");
  validaConversioneUnita(input.unita_acquisto, input.unita_uso);
  if (input.tipo_consumabile !== "apparecchiatura" && input.tipo_consumabile !== "consumabile") {
    throw new Error(`Tipo consumabile non ammesso: ${input.tipo_consumabile}`);
  }
  return { ...input, nome };
}

export async function elencoConsumabili(): Promise<Consumabile[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("consumabile")
    .select("*")
    .is("deleted_at", null)
    .order("nome");
  if (error) throw new Error(`Lettura consumabili fallita: ${error.message}`);
  return (data ?? []) as Consumabile[];
}

export async function consumabilePerId(id: string): Promise<Consumabile> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("consumabile")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Consumabile non trovato: ${error.message}`);
  return data as Consumabile;
}

export async function creaConsumabile(input: InputConsumabile): Promise<string> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("consumabile")
    .insert(validaInput(input))
    .select("id")
    .single();
  if (error) throw new Error(`Creazione consumabile fallita: ${error.message}`);
  return data.id as string;
}

export async function aggiornaConsumabile(
  id: string,
  input: InputConsumabile,
): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("consumabile")
    .update(validaInput(input))
    .eq("id", id);
  if (error) throw new Error(`Aggiornamento consumabile fallito: ${error.message}`);
}

export async function eliminaConsumabile(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("consumabile")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Eliminazione consumabile fallita: ${error.message}`);
}

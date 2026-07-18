import { creaClientServer } from "./server";
import type { MateriaPrima, UnitaAcquisto, UnitaUso } from "./types";
import {
  validaCentesimi,
  validaConversioneUnita,
  validaQuantita,
  validaResa,
  validaTesto,
} from "./validazioni";

export interface InputMateriaPrima {
  nome: string;
  categoria: string;
  unita_acquisto: UnitaAcquisto;
  prezzo_acquisto_cent: number;
  unita_uso: UnitaUso;
  fattore_conversione: number;
  resa_percentuale: number;
  fornitore_preferito?: string | null;
  allergeni?: string[];
  note?: string | null;
}

function validaInput(input: InputMateriaPrima) {
  const nome = validaTesto(input.nome, "nome");
  validaCentesimi(input.prezzo_acquisto_cent, "prezzo di acquisto");
  validaQuantita(input.fattore_conversione, "fattore di conversione");
  validaResa(input.resa_percentuale);
  validaConversioneUnita(input.unita_acquisto, input.unita_uso);
  return { ...input, nome, allergeni: input.allergeni ?? [] };
}

export async function elencoMateriePrime(): Promise<MateriaPrima[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("materia_prima")
    .select("*")
    .is("deleted_at", null)
    .order("nome");
  if (error) throw new Error(`Lettura materie prime fallita: ${error.message}`);
  return (data ?? []) as MateriaPrima[];
}

export async function materiaPrimaPerId(id: string): Promise<MateriaPrima> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("materia_prima")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Materia prima non trovata: ${error.message}`);
  return data as MateriaPrima;
}

export async function creaMateriaPrima(input: InputMateriaPrima): Promise<string> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("materia_prima")
    .insert(validaInput(input))
    .select("id")
    .single();
  if (error) throw new Error(`Creazione materia prima fallita: ${error.message}`);
  return data.id as string;
}

export async function aggiornaMateriaPrima(
  id: string,
  input: InputMateriaPrima,
): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("materia_prima")
    .update(validaInput(input))
    .eq("id", id);
  if (error) throw new Error(`Aggiornamento materia prima fallito: ${error.message}`);
}

/** Modifica rapida del solo prezzo dalla tabella (schermata §6.2). */
export async function aggiornaPrezzoMateriaPrima(
  id: string,
  prezzoCent: number,
): Promise<void> {
  validaCentesimi(prezzoCent, "prezzo di acquisto");
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("materia_prima")
    .update({ prezzo_acquisto_cent: prezzoCent })
    .eq("id", id);
  if (error) throw new Error(`Aggiornamento prezzo fallito: ${error.message}`);
}

/** Soft delete (invariante 3): mai DELETE fisico. */
export async function eliminaMateriaPrima(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("materia_prima")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Eliminazione materia prima fallita: ${error.message}`);
}

/** Conteggio "usata in N ricette" per l'indicatore in tabella. */
export async function conteggioUsoInRicette(): Promise<Map<string, number>> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("ricetta_ingrediente")
    .select("materia_prima_id, ricetta_id")
    .not("materia_prima_id", "is", null);
  if (error) throw new Error(`Conteggio uso fallito: ${error.message}`);
  const perMateria = new Map<string, Set<string>>();
  for (const riga of data ?? []) {
    const mp = riga.materia_prima_id as string;
    if (!perMateria.has(mp)) perMateria.set(mp, new Set());
    perMateria.get(mp)!.add(riga.ricetta_id as string);
  }
  return new Map([...perMateria].map(([mp, ricette]) => [mp, ricette.size]));
}

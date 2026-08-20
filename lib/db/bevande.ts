import { creaClientServer } from "./server";
import type { Bevanda, CategoriaBevanda, UnitaBevanda } from "./types";
import { validaCentesimi, validaIntero, validaQuantita, validaTesto } from "./validazioni";

export interface InputBevanda {
  nome: string;
  categoria: CategoriaBevanda;
  formato_confezione?: string | null;
  capacita_unitaria: number;
  unita: UnitaBevanda;
  unita_per_collo: number;
  prezzo_unitario_cent: number;
  alcolica: boolean;
  note?: string | null;
}

const CATEGORIE_ALCOLICHE: CategoriaBevanda[] = [
  "vino_bianco",
  "vino_rosso",
  "bollicine",
  "birra",
  "amari_distillati",
];

function validaInput(input: InputBevanda) {
  const nome = validaTesto(input.nome, "nome bevanda");
  validaQuantita(input.capacita_unitaria, "capacità unitaria");
  validaIntero(input.unita_per_collo, "unità per collo", 1);
  validaCentesimi(input.prezzo_unitario_cent, "prezzo unitario");
  // coerenza flag alcolica con la categoria (esclusione automatica bambini)
  const alcolica = CATEGORIE_ALCOLICHE.includes(input.categoria);
  return { ...input, nome, alcolica };
}

export async function elencoBevande(): Promise<Bevanda[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("bevanda")
    .select("*")
    .is("deleted_at", null)
    .order("categoria")
    .order("nome");
  if (error) throw new Error(`Lettura bevande fallita: ${error.message}`);
  return (data ?? []) as Bevanda[];
}

export async function bevandaPerId(id: string): Promise<Bevanda> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase.from("bevanda").select("*").eq("id", id).single();
  if (error) throw new Error(`Bevanda non trovata: ${error.message}`);
  return data as Bevanda;
}

export async function creaBevanda(input: InputBevanda): Promise<string> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("bevanda")
    .insert(validaInput(input))
    .select("id")
    .single();
  if (error) throw new Error(`Creazione bevanda fallita: ${error.message}`);
  return data.id as string;
}

export async function aggiornaBevanda(id: string, input: InputBevanda): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("bevanda")
    .update(validaInput(input))
    .eq("id", id);
  if (error) throw new Error(`Aggiornamento bevanda fallito: ${error.message}`);
}

export async function eliminaBevanda(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("bevanda")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Eliminazione bevanda fallita: ${error.message}`);
}

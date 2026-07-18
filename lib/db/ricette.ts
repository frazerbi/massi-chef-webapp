import type {
  MateriaPrimaCalc,
  RicettaCalc,
} from "@/lib/calc/ricetta";
import { creaClientServer } from "./server";
import type {
  CategoriaPortata,
  MateriaPrima,
  Ricetta,
  RicettaIngrediente,
} from "./types";
import { validaCentesimi, validaIntero, validaQuantita, validaTesto } from "./validazioni";

export interface InputRicetta {
  nome: string;
  descrizione?: string | null;
  categoria_portata: CategoriaPortata;
  porzioni_base: number;
  tempo_preparazione_min?: number | null;
  costo_manuale_extra_cent: number;
  istruzioni?: string | null;
  attiva: boolean;
}

function validaInput(input: InputRicetta) {
  const nome = validaTesto(input.nome, "nome ricetta");
  validaIntero(input.porzioni_base, "porzioni base", 1);
  validaCentesimi(input.costo_manuale_extra_cent, "costo manuale extra");
  if (input.tempo_preparazione_min != null) {
    validaIntero(input.tempo_preparazione_min, "tempo di preparazione", 0);
  }
  return { ...input, nome };
}

export async function elencoRicette(soloAttive = false): Promise<Ricetta[]> {
  const supabase = await creaClientServer();
  let query = supabase
    .from("ricetta")
    .select("*")
    .is("deleted_at", null)
    .order("categoria_portata")
    .order("nome");
  if (soloAttive) query = query.eq("attiva", true);
  const { data, error } = await query;
  if (error) throw new Error(`Lettura ricette fallita: ${error.message}`);
  return (data ?? []) as Ricetta[];
}

export async function ricettaPerId(id: string): Promise<Ricetta> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("ricetta")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Ricetta non trovata: ${error.message}`);
  return data as Ricetta;
}

export async function ingredientiDiRicetta(
  ricettaId: string,
): Promise<RicettaIngrediente[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("ricetta_ingrediente")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .order("created_at");
  if (error) throw new Error(`Lettura ingredienti fallita: ${error.message}`);
  return (data ?? []) as RicettaIngrediente[];
}

export async function creaRicetta(input: InputRicetta): Promise<string> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("ricetta")
    .insert(validaInput(input))
    .select("id")
    .single();
  if (error) throw new Error(`Creazione ricetta fallita: ${error.message}`);
  return data.id as string;
}

export async function aggiornaRicetta(id: string, input: InputRicetta): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("ricetta")
    .update(validaInput(input))
    .eq("id", id);
  if (error) throw new Error(`Aggiornamento ricetta fallito: ${error.message}`);
}

export async function eliminaRicetta(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("ricetta")
    .update({ deleted_at: new Date().toISOString(), attiva: false })
    .eq("id", id);
  if (error) throw new Error(`Eliminazione ricetta fallita: ${error.message}`);
}

export async function aggiungiIngredienteMateriaPrima(
  ricettaId: string,
  materiaPrimaId: string,
  quantita: number,
  opzionale: boolean,
): Promise<void> {
  validaQuantita(quantita, "quantità ingrediente");
  const supabase = await creaClientServer();
  const { error } = await supabase.from("ricetta_ingrediente").insert({
    ricetta_id: ricettaId,
    materia_prima_id: materiaPrimaId,
    quantita,
    opzionale,
  });
  if (error) throw new Error(`Aggiunta ingrediente fallita: ${error.message}`);
}

/** L'anti-ciclo e la profondità massima sono verificati dal trigger SQL. */
export async function aggiungiSottoRicetta(
  ricettaId: string,
  sottoRicettaId: string,
  quantitaPorzioni: number,
  opzionale: boolean,
): Promise<void> {
  validaQuantita(quantitaPorzioni, "porzioni sotto-ricetta");
  const supabase = await creaClientServer();
  const { error } = await supabase.from("ricetta_ingrediente").insert({
    ricetta_id: ricettaId,
    sotto_ricetta_id: sottoRicettaId,
    quantita_porzioni: quantitaPorzioni,
    opzionale,
  });
  if (error) {
    if (/ciclo|profondità/i.test(error.message)) throw new Error(error.message);
    throw new Error(`Aggiunta sotto-ricetta fallita: ${error.message}`);
  }
}

export async function rimuoviIngrediente(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase.from("ricetta_ingrediente").delete().eq("id", id);
  if (error) throw new Error(`Rimozione ingrediente fallita: ${error.message}`);
}

export interface GrafoCalc {
  ricette: Map<string, RicettaCalc>;
  materiePrime: Map<string, MateriaPrimaCalc>;
  /** righe complete per la UI */
  ricetteRighe: Ricetta[];
  materiePrimeRighe: MateriaPrima[];
}

/**
 * Carica l'intero grafo ricette + materie prime nelle strutture usate da
 * /lib/calc/ (unica fonte delle formule, condivisa da UI e PDF).
 * Include anche le entità soft-deleted: i preventivi storici le referenziano.
 */
export async function caricaGrafoCalc(): Promise<GrafoCalc> {
  const supabase = await creaClientServer();
  const [ricetteRes, ingredientiRes, materieRes] = await Promise.all([
    supabase.from("ricetta").select("*"),
    supabase.from("ricetta_ingrediente").select("*"),
    supabase.from("materia_prima").select("*"),
  ]);
  if (ricetteRes.error) throw new Error(ricetteRes.error.message);
  if (ingredientiRes.error) throw new Error(ingredientiRes.error.message);
  if (materieRes.error) throw new Error(materieRes.error.message);

  const ricetteRighe = (ricetteRes.data ?? []) as Ricetta[];
  const ingredienti = (ingredientiRes.data ?? []) as RicettaIngrediente[];
  const materiePrimeRighe = (materieRes.data ?? []) as MateriaPrima[];

  const ricette = new Map<string, RicettaCalc>(
    ricetteRighe.map((r) => [
      r.id,
      {
        id: r.id,
        porzioniBase: Number(r.porzioni_base),
        costoManualeExtraCent: Number(r.costo_manuale_extra_cent),
        ingredienti: [],
      },
    ]),
  );
  for (const ing of ingredienti) {
    ricette.get(ing.ricetta_id)?.ingredienti.push({
      materiaPrimaId: ing.materia_prima_id,
      sottoRicettaId: ing.sotto_ricetta_id,
      quantita: ing.quantita != null ? Number(ing.quantita) : null,
      quantitaPorzioni:
        ing.quantita_porzioni != null ? Number(ing.quantita_porzioni) : null,
      opzionale: ing.opzionale,
    });
  }
  const materiePrime = new Map<string, MateriaPrimaCalc>(
    materiePrimeRighe.map((mp) => [
      mp.id,
      {
        id: mp.id,
        prezzoAcquistoCent: Number(mp.prezzo_acquisto_cent),
        fattoreConversione: Number(mp.fattore_conversione),
        resaPercentuale: Number(mp.resa_percentuale),
        allergeni: mp.allergeni ?? [],
      },
    ]),
  );
  return { ricette, materiePrime, ricetteRighe, materiePrimeRighe };
}

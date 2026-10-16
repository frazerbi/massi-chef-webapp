import { spostaInElenco } from "@/lib/calc/catalogoProdotti";
import { creaClientServer, utenteCorrente } from "./server";
import type { CategoriaMateriaPrima } from "./types";
import { validaTesto } from "./validazioni";

/**
 * CL-2: categorie iniziali, create al primo accesso di un utente che non ne
 * ha mai avute. Stessa lista del passo 1 della migrazione 0011 (che le ha
 * create per gli utenti gia' esistenti): se cambia qui, cambia anche li'.
 */
export const CATEGORIE_MATERIA_PRIMA_INIZIALI = [
  "Carne",
  "Pesce",
  "Ortofrutta",
  "Latticini e uova",
  "Dispensa",
  "Surgelati",
  "Panetteria",
] as const;

/** Postgres: violazione di indice unico (nome gia' usato) */
const CODICE_DUPLICATO = "23505";

/** Categorie attive nell'ordine scelto dall'utente. */
export async function elencoCategorieMateriaPrima(): Promise<CategoriaMateriaPrima[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("categoria_materia_prima")
    .select("*")
    .is("deleted_at", null)
    .order("ordine")
    .order("nome");
  if (error) throw new Error(`Lettura categorie fallita: ${error.message}`);
  if (data && data.length > 0) return data as CategoriaMateriaPrima[];

  // Nessuna attiva: le creo solo se l'utente non ne ha mai avute. Se le ha
  // eliminate tutte di proposito, non ricompaiono da sole.
  const { count, error: erroreConteggio } = await supabase
    .from("categoria_materia_prima")
    .select("id", { count: "exact", head: true });
  if (erroreConteggio) throw new Error(`Lettura categorie fallita: ${erroreConteggio.message}`);
  if ((count ?? 0) > 0) return [];

  const utente = await utenteCorrente();
  const { data: create, error: erroreCreazione } = await supabase
    .from("categoria_materia_prima")
    .insert(
      CATEGORIE_MATERIA_PRIMA_INIZIALI.map((nome, i) => ({
        user_id: utente.id,
        nome,
        ordine: i + 1,
      })),
    )
    .select("*")
    .order("ordine");
  if (erroreCreazione) {
    throw new Error(`Creazione categorie iniziali fallita: ${erroreCreazione.message}`);
  }
  return (create ?? []) as CategoriaMateriaPrima[];
}

/** Verifica lato server che la categoria esista e sia attiva. */
export async function verificaCategoriaMateriaPrima(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("categoria_materia_prima")
    .select("id")
    .eq("id", validaTesto(id, "categoria"))
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Verifica categoria fallita: ${error.message}`);
  if (!data) throw new Error("Categoria non trovata o eliminata: scegline un'altra");
}

export async function creaCategoriaMateriaPrima(nome: string): Promise<void> {
  const nomePulito = validaTesto(nome, "nome categoria");
  const supabase = await creaClientServer();
  const { data: ultima, error: erroreLettura } = await supabase
    .from("categoria_materia_prima")
    .select("ordine")
    .is("deleted_at", null)
    .order("ordine", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroreLettura) throw new Error(`Lettura categorie fallita: ${erroreLettura.message}`);
  const { error } = await supabase
    .from("categoria_materia_prima")
    .insert({ nome: nomePulito, ordine: (ultima?.ordine ?? 0) + 1 });
  if (error?.code === CODICE_DUPLICATO) {
    throw new Error(`Esiste gia' una categoria "${nomePulito}"`);
  }
  if (error) throw new Error(`Creazione categoria fallita: ${error.message}`);
}

export async function rinominaCategoriaMateriaPrima(id: string, nome: string): Promise<void> {
  const nomePulito = validaTesto(nome, "nome categoria");
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("categoria_materia_prima")
    .update({ nome: nomePulito })
    .eq("id", id)
    .is("deleted_at", null);
  if (error?.code === CODICE_DUPLICATO) {
    throw new Error(`Esiste gia' una categoria "${nomePulito}"`);
  }
  if (error) throw new Error(`Rinomina categoria fallita: ${error.message}`);
}

/** Sposta una categoria di una posizione e rinumera l'ordine da 1. */
export async function spostaCategoriaMateriaPrima(
  id: string,
  direzione: "su" | "giu",
): Promise<void> {
  const categorie = await elencoCategorieMateriaPrima();
  const nuovoOrdine = spostaInElenco(
    categorie.map((c) => c.id),
    id,
    direzione,
  );
  const supabase = await creaClientServer();
  for (const [i, idCategoria] of nuovoOrdine.entries()) {
    const attuale = categorie.find((c) => c.id === idCategoria)!;
    if (attuale.ordine === i + 1) continue;
    const { error } = await supabase
      .from("categoria_materia_prima")
      .update({ ordine: i + 1 })
      .eq("id", idCategoria);
    if (error) throw new Error(`Riordino categorie fallito: ${error.message}`);
  }
}

/**
 * Soft delete (invariante 3: materie prime gia' eliminate possono puntarvi).
 * Bloccata se ci sono materie prime attive in questa categoria: vanno prima
 * spostate, altrimenti finirebbero in "Senza categoria" senza che l'utente
 * se ne accorga.
 */
export async function eliminaCategoriaMateriaPrima(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { count, error: erroreConteggio } = await supabase
    .from("materia_prima")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id)
    .is("deleted_at", null);
  if (erroreConteggio) throw new Error(`Verifica categoria fallita: ${erroreConteggio.message}`);
  if ((count ?? 0) > 0) {
    throw new Error(
      `La categoria contiene ancora ${count} materie prime: spostale in un'altra categoria prima di eliminarla`,
    );
  }
  const { error } = await supabase
    .from("categoria_materia_prima")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Eliminazione categoria fallita: ${error.message}`);
}

/** Materie prime attive per categoria (per il contatore e il blocco in eliminazione). */
export async function conteggioMateriePrimePerCategoria(): Promise<Map<string, number>> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("materia_prima")
    .select("categoria_id")
    .is("deleted_at", null)
    .not("categoria_id", "is", null);
  if (error) throw new Error(`Conteggio materie prime fallito: ${error.message}`);
  const conteggi = new Map<string, number>();
  for (const riga of data ?? []) {
    const id = riga.categoria_id as string;
    conteggi.set(id, (conteggi.get(id) ?? 0) + 1);
  }
  return conteggi;
}

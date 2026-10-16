/**
 * CL-2: vista unica "Prodotti" — materie prime, bevande e consumabili in un
 * solo elenco a categorie. Le tre anagrafiche restano separate (ognuna ha i
 * propri campi di calcolo); qui si decide solo in che gruppo e in che ordine
 * compare ogni voce. Funzione pura: nessun accesso a DB, nessun costo.
 *
 * Ordine dei gruppi:
 *   1. le categorie delle materie prime, nell'ordine scelto dall'utente
 *   2. "Senza categoria" (materie prime senza categoria o con categoria
 *      eliminata), solo se contiene qualcosa
 *   3. Bevande
 *   4. Consumabili apparecchio, Consumabili cucina (etichette di CL-1)
 */

import { ETICHETTE_GRUPPO_PREVENTIVO } from "./raggruppamentoPreventivo";

export type TipoVoceCatalogo = "materia_prima" | "bevanda" | "consumabile";

export const GRUPPO_SENZA_CATEGORIA = "senza_categoria";
export const GRUPPO_BEVANDE = "bevande";

/** Dati minimi per collocare una voce; il resto passa intatto (generico T). */
export interface VoceCatalogo {
  tipo: TipoVoceCatalogo;
  nome: string;
  marca?: string | null;
  /** solo materie prime: id della categoria (null = senza categoria) */
  categoriaId?: string | null;
  /** solo consumabili: gruppo apparecchio/cucina */
  tipoConsumabile?: "apparecchiatura" | "consumabile";
  /** sotto-ordinamento dentro il gruppo prima del nome (es. categoria bevanda) */
  ordineNelGruppo?: number;
}

export interface CategoriaCatalogo {
  id: string;
  nome: string;
}

export interface GruppoCatalogo<T> {
  chiave: string;
  titolo: string;
  tipo: TipoVoceCatalogo;
  voci: T[];
}

/** minuscolo e senza accenti: "caffè" trova "Caffe" e viceversa */
function normalizza(testo: string): string {
  return testo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** true se la ricerca (vuota = tutto) compare nel nome o nella marca */
export function voceCorrisponde(voce: VoceCatalogo, ricerca: string): boolean {
  const cerca = normalizza(ricerca);
  if (cerca === "") return true;
  return normalizza(`${voce.nome} ${voce.marca ?? ""}`).includes(cerca);
}

/**
 * Raggruppa le voci. Senza ricerca i gruppi vuoti restano (si vede che una
 * categoria esiste ma non ha ancora prodotti), tranne "Senza categoria";
 * con una ricerca attiva restano solo i gruppi con almeno un risultato.
 * `categorie` arriva gia' nell'ordine scelto dall'utente.
 */
export function raggruppaCatalogo<T extends VoceCatalogo>(
  voci: readonly T[],
  categorie: readonly CategoriaCatalogo[],
  ricerca = "",
): GruppoCatalogo<T>[] {
  const gruppi: GruppoCatalogo<T>[] = [
    ...categorie.map((c) => ({
      chiave: c.id,
      titolo: c.nome,
      tipo: "materia_prima" as const,
      voci: [] as T[],
    })),
    { chiave: GRUPPO_SENZA_CATEGORIA, titolo: "Senza categoria", tipo: "materia_prima", voci: [] },
    { chiave: GRUPPO_BEVANDE, titolo: "Bevande", tipo: "bevanda", voci: [] },
    {
      chiave: "apparecchiatura",
      titolo: ETICHETTE_GRUPPO_PREVENTIVO.apparecchiatura,
      tipo: "consumabile",
      voci: [],
    },
    {
      chiave: "consumabile",
      titolo: ETICHETTE_GRUPPO_PREVENTIVO.consumabile,
      tipo: "consumabile",
      voci: [],
    },
  ];
  const perChiave = new Map(gruppi.map((g) => [g.chiave, g]));
  const idCategorie = new Set(categorie.map((c) => c.id));

  for (const voce of voci) {
    if (!voceCorrisponde(voce, ricerca)) continue;
    let chiave: string;
    if (voce.tipo === "bevanda") chiave = GRUPPO_BEVANDE;
    else if (voce.tipo === "consumabile") {
      if (!voce.tipoConsumabile) throw new Error(`Consumabile senza tipo: ${voce.nome}`);
      chiave = voce.tipoConsumabile;
    } else {
      // categoria assente o non piu' attiva -> "Senza categoria"
      chiave =
        voce.categoriaId && idCategorie.has(voce.categoriaId)
          ? voce.categoriaId
          : GRUPPO_SENZA_CATEGORIA;
    }
    perChiave.get(chiave)!.voci.push(voce);
  }

  for (const g of gruppi) {
    g.voci.sort(
      (a, b) =>
        (a.ordineNelGruppo ?? 0) - (b.ordineNelGruppo ?? 0) ||
        a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
    );
  }

  const cercando = normalizza(ricerca) !== "";
  return gruppi.filter((g) =>
    cercando || g.chiave === GRUPPO_SENZA_CATEGORIA ? g.voci.length > 0 : true,
  );
}

/**
 * Nuovo ordine di un elenco dopo aver spostato un elemento di una posizione.
 * Agli estremi l'elenco resta invariato; lancia se l'id non c'e'.
 */
export function spostaInElenco(
  ids: readonly string[],
  id: string,
  direzione: "su" | "giu",
): string[] {
  const i = ids.indexOf(id);
  if (i === -1) throw new Error(`Elemento non trovato nell'elenco: ${id}`);
  const j = direzione === "su" ? i - 1 : i + 1;
  const risultato = [...ids];
  if (j < 0 || j >= ids.length) return risultato;
  [risultato[i], risultato[j]] = [risultato[j], risultato[i]];
  return risultato;
}

/**
 * §5.6 / CL-4 — Lista della spesa di un singolo preventivo.
 *
 * Passi (specifica §5.6, punti 1–3 e 5; il 4 — sottrazione del magazzino —
 * arriverà con CL-11):
 *   1. esplode ogni riga ricetta in materie prime, ricorsivamente sulle
 *      sotto-ricette, e applica lo sfrido di servizio;
 *   2. somma per articolo le quantità nette in unità d'uso;
 *   3. riporta al lordo della resa (la quantità in ricetta è quella pulita,
 *      come nel costo §5.1), converte in unità d'acquisto e arrotonda per
 *      eccesso all'unità d'acquisto intera (invariante 6);
 *   5. stima il costo ai prezzi passati in input.
 *
 * Sfrido: qui vale per TUTTE le righe alimentari, ricette comprese — è il suo
 * scopo originario. Il food cost del preventivo invece non lo applica alle
 * righe ricetta (decisione di fase 1): i due numeri differiscono di proposito.
 * I consumabili non hanno sfrido (FEATURE-018).
 */

import { costoUnitaUsoCent, type CostoMateriaPrimaInput } from "./materiaPrima";
import {
  PROFONDITA_MASSIMA_SOTTO_RICETTE,
  type RicettaCalc,
} from "./ricetta";
import {
  quantitaEventoConsumabile,
  quantitaEventoMateriaPrima,
} from "./preventivo";

export type TipoArticoloSpesa = "materia_prima" | "consumabile";

export type RigaSpesaInput =
  | {
      tipo: "ricetta";
      ricettaId: string;
      /** porzioni salvate sulla riga del preventivo */
      porzioni: number;
      escludiOpzionali: boolean;
    }
  | { tipo: "materia_prima"; materiaPrimaId: string; quantitaPersona: number }
  | { tipo: "consumabile"; consumabileId: string; quantitaPersona: number };

export interface ListaSpesaInput {
  righe: RigaSpesaInput[];
  ospitiTotali: number;
  sfridoPct: number;
  ricette: ReadonlyMap<string, RicettaCalc>;
  /** prezzo, conversione e resa (100 per i consumabili) per id */
  materiePrime: ReadonlyMap<string, CostoMateriaPrimaInput>;
  consumabili: ReadonlyMap<string, Omit<CostoMateriaPrimaInput, "resaPercentuale">>;
}

export interface ArticoloSpesa {
  tipo: TipoArticoloSpesa;
  id: string;
  /** quantità pulita da portare in tavola, in unità d'uso, sfrido incluso */
  quantitaNettaUso: number;
  /** quantità da acquistare al lordo della resa, in unità d'uso */
  quantitaLordaUso: number;
  /** quantità lorda in unità d'acquisto, non arrotondata */
  quantitaAcquistoEsatta: number;
  /** unità d'acquisto intere da comprare (per eccesso) */
  unitaDaAcquistare: number;
  /** costo della quantità esatta: è il food cost con sfrido */
  costoNecessarioCent: number;
  /** costo di quanto si compra davvero (unità intere) */
  costoAcquistoCent: number;
}

/** Fabbisogno netto per materia prima (unità d'uso) di `porzioni` porzioni di
 * una ricetta, esploso sulle sotto-ricette. Senza sfrido. */
export function esplodiRicetta(
  ricettaId: string,
  porzioni: number,
  ricette: ReadonlyMap<string, RicettaCalc>,
  opzioni: { includiOpzionali?: boolean } = {},
): Map<string, number> {
  if (!Number.isFinite(porzioni) || porzioni <= 0) {
    throw new Error(`Porzioni non valide: ${porzioni}`);
  }
  const fabbisogno = new Map<string, number>();
  esplodiRicorsivo(
    ricettaId,
    porzioni,
    ricette,
    opzioni.includiOpzionali ?? true,
    fabbisogno,
    [],
    1,
  );
  return fabbisogno;
}

function esplodiRicorsivo(
  ricettaId: string,
  porzioni: number,
  ricette: ReadonlyMap<string, RicettaCalc>,
  includiOpzionali: boolean,
  fabbisogno: Map<string, number>,
  catena: string[],
  profondita: number,
): void {
  if (catena.includes(ricettaId)) {
    throw new Error(
      `Ciclo di sotto-ricette rilevato: ${[...catena, ricettaId].join(" -> ")}`,
    );
  }
  if (profondita > PROFONDITA_MASSIMA_SOTTO_RICETTE) {
    throw new Error(
      `Profondità massima delle sotto-ricette superata (max ${PROFONDITA_MASSIMA_SOTTO_RICETTE})`,
    );
  }
  const ricetta = ricette.get(ricettaId);
  if (!ricetta) throw new Error(`Ricetta non trovata: ${ricettaId}`);
  if (!Number.isFinite(ricetta.porzioniBase) || ricetta.porzioniBase <= 0) {
    throw new Error(`Porzioni base non valide per la ricetta ${ricettaId}`);
  }
  const fattore = porzioni / ricetta.porzioniBase;

  for (const ing of ricetta.ingredienti) {
    if (ing.opzionale && !includiOpzionali) continue;
    if (ing.materiaPrimaId) {
      if (ing.quantita == null || ing.quantita <= 0) {
        throw new Error(
          `Quantità non valida per la materia prima ${ing.materiaPrimaId} nella ricetta ${ricettaId}`,
        );
      }
      fabbisogno.set(
        ing.materiaPrimaId,
        (fabbisogno.get(ing.materiaPrimaId) ?? 0) + ing.quantita * fattore,
      );
    } else if (ing.sottoRicettaId) {
      if (ing.quantitaPorzioni == null || ing.quantitaPorzioni <= 0) {
        throw new Error(
          `Porzioni non valide per la sotto-ricetta ${ing.sottoRicettaId}`,
        );
      }
      esplodiRicorsivo(
        ing.sottoRicettaId,
        ing.quantitaPorzioni * fattore,
        ricette,
        includiOpzionali,
        fabbisogno,
        [...catena, ricettaId],
        profondita + 1,
      );
    } else {
      throw new Error(
        `Riga di distinta senza materia prima né sotto-ricetta nella ricetta ${ricettaId}`,
      );
    }
  }
}

/** Arrotonda a 3 decimali (precisione delle quantità, invariante 6) e poi per
 * eccesso: senza il primo passo un residuo in virgola mobile come
 * 3.0000000000000004 farebbe comprare un'unità in più. */
export function arrotondaAcquistoPerEccesso(quantita: number): number {
  if (!Number.isFinite(quantita) || quantita < 0) {
    throw new Error(`Quantità d'acquisto non valida: ${quantita}`);
  }
  return Math.ceil(Math.round(quantita * 1000) / 1000);
}

function articolo(
  tipo: TipoArticoloSpesa,
  id: string,
  quantitaNettaUso: number,
  costi: CostoMateriaPrimaInput,
): ArticoloSpesa {
  const costoUnitaUso = costoUnitaUsoCent(costi);
  const quantitaLordaUso = quantitaNettaUso / (costi.resaPercentuale / 100);
  const quantitaAcquistoEsatta = quantitaLordaUso / costi.fattoreConversione;
  const unitaDaAcquistare = arrotondaAcquistoPerEccesso(quantitaAcquistoEsatta);
  return {
    tipo,
    id,
    quantitaNettaUso,
    quantitaLordaUso,
    quantitaAcquistoEsatta,
    unitaDaAcquistare,
    costoNecessarioCent: quantitaNettaUso * costoUnitaUso,
    costoAcquistoCent: unitaDaAcquistare * costi.prezzoAcquistoCent,
  };
}

export function calcolaListaSpesa(input: ListaSpesaInput): ArticoloSpesa[] {
  const { righe, ospitiTotali, sfridoPct, ricette, materiePrime, consumabili } = input;
  if (!Number.isInteger(ospitiTotali) || ospitiTotali <= 0) {
    throw new Error(`Ospiti totali non validi: ${ospitiTotali}`);
  }
  if (!Number.isFinite(sfridoPct) || sfridoPct < 0) {
    throw new Error(`Sfrido non valido: ${sfridoPct}`);
  }
  const fattoreSfrido = 1 + sfridoPct / 100;

  const nettoMateriePrime = new Map<string, number>();
  const nettoConsumabili = new Map<string, number>();
  const somma = (mappa: Map<string, number>, id: string, q: number) =>
    mappa.set(id, (mappa.get(id) ?? 0) + q);

  for (const riga of righe) {
    if (riga.tipo === "ricetta") {
      const fabbisogno = esplodiRicetta(riga.ricettaId, riga.porzioni, ricette, {
        includiOpzionali: !riga.escludiOpzionali,
      });
      for (const [id, q] of fabbisogno) somma(nettoMateriePrime, id, q * fattoreSfrido);
    } else if (riga.tipo === "materia_prima") {
      // stessa formula della riga nel preventivo (FEATURE-017): sfrido incluso
      somma(
        nettoMateriePrime,
        riga.materiaPrimaId,
        quantitaEventoMateriaPrima(riga.quantitaPersona, ospitiTotali, sfridoPct),
      );
    } else {
      somma(
        nettoConsumabili,
        riga.consumabileId,
        quantitaEventoConsumabile(riga.quantitaPersona, ospitiTotali),
      );
    }
  }

  const risultato: ArticoloSpesa[] = [];
  for (const [id, q] of nettoMateriePrime) {
    const mp = materiePrime.get(id);
    if (!mp) throw new Error(`Materia prima non trovata: ${id}`);
    risultato.push(articolo("materia_prima", id, q, mp));
  }
  for (const [id, q] of nettoConsumabili) {
    const c = consumabili.get(id);
    if (!c) throw new Error(`Consumabile non trovato: ${id}`);
    // il consumabile non ha resa: 100 è un no-op matematico (come FEATURE-018)
    risultato.push(articolo("consumabile", id, q, { ...c, resaPercentuale: 100 }));
  }
  return risultato;
}

/** Presentazione: fino a 3 decimali con la virgola (es. "24,75 kg"). */
export function formattaQuantita(quantita: number, unita: string): string {
  if (!Number.isFinite(quantita)) {
    throw new Error(`Quantità non valida: ${quantita}`);
  }
  const numero = quantita.toLocaleString("it-IT", { maximumFractionDigits: 3 });
  return unita ? `${numero} ${unita}` : numero;
}

export const ETICHETTA_FORNITORE_MANCANTE = "Fornitore non indicato";

export interface GruppoFornitore<T> {
  /** nome del fornitore come scritto la prima volta; null = non indicato */
  fornitore: string | null;
  articoli: T[];
  costoAcquistoCent: number;
}

/** Raggruppa per fornitore (testo libero: confronto senza maiuscole e spazi
 * esterni), gruppi in ordine alfabetico con "non indicato" in coda, articoli
 * per nome. Unica funzione usata da pagina e PDF. */
export function raggruppaPerFornitore<
  T extends { nome: string; fornitore: string | null; costoAcquistoCent: number },
>(articoli: T[]): GruppoFornitore<T>[] {
  const gruppi = new Map<string, GruppoFornitore<T>>();
  for (const a of articoli) {
    const pulito = a.fornitore?.trim() || null;
    const chiave = pulito?.toLocaleLowerCase("it-IT") ?? "";
    if (!gruppi.has(chiave)) {
      gruppi.set(chiave, { fornitore: pulito, articoli: [], costoAcquistoCent: 0 });
    }
    const g = gruppi.get(chiave)!;
    g.articoli.push(a);
    g.costoAcquistoCent += a.costoAcquistoCent;
  }
  const confronta = (x: string, y: string) => x.localeCompare(y, "it-IT");
  for (const g of gruppi.values()) g.articoli.sort((x, y) => confronta(x.nome, y.nome));
  return [...gruppi.values()].sort((x, y) => {
    if (x.fornitore == null) return 1;
    if (y.fornitore == null) return -1;
    return confronta(x.fornitore, y.fornitore);
  });
}

/**
 * §5.2 — Costo di una ricetta, ricorsivo sulle sotto-ricette.
 *
 * costo_ricetta_base = Σ (quantità ingrediente × costo_per_unita_uso)
 *                    + Σ (porzioni sotto-ricetta × costo_porzione sotto-ricetta)
 * costo_porzione     = costo_ricetta_base / porzioni_base + costo_manuale_extra
 *
 * Profondità massima 5, controllo anti-ciclo. Le funzioni lanciano su input
 * invalidi o riferimenti mancanti: mai valori di ripiego silenziosi.
 */

import { costoUnitaUsoCent, type CostoMateriaPrimaInput } from "./materiaPrima";

export const PROFONDITA_MASSIMA_SOTTO_RICETTE = 5;

export interface MateriaPrimaCalc extends CostoMateriaPrimaInput {
  id: string;
  allergeni: string[];
}

export interface IngredienteCalc {
  materiaPrimaId?: string | null;
  sottoRicettaId?: string | null;
  /** in unità d'uso della materia prima, riferita a porzioniBase */
  quantita?: number | null;
  /** porzioni della sotto-ricetta, riferite a porzioniBase */
  quantitaPorzioni?: number | null;
  opzionale: boolean;
}

export interface RicettaCalc {
  id: string;
  porzioniBase: number;
  costoManualeExtraCent: number;
  ingredienti: IngredienteCalc[];
}

export interface OpzioniCostoRicetta {
  /** default true: gli opzionali sono inclusi ma escludibili nel preventivo */
  includiOpzionali?: boolean;
}

function ricettaOrThrow(
  id: string,
  ricette: ReadonlyMap<string, RicettaCalc>,
): RicettaCalc {
  const r = ricette.get(id);
  if (!r) throw new Error(`Ricetta non trovata: ${id}`);
  if (!Number.isFinite(r.porzioniBase) || r.porzioniBase <= 0) {
    throw new Error(`Porzioni base non valide per la ricetta ${id}`);
  }
  if (r.costoManualeExtraCent < 0) {
    throw new Error(`Costo manuale extra negativo per la ricetta ${id}`);
  }
  return r;
}

/** Costo porzione in centesimi (frazionari). */
export function costoPorzioneCent(
  ricettaId: string,
  ricette: ReadonlyMap<string, RicettaCalc>,
  materiePrime: ReadonlyMap<string, MateriaPrimaCalc>,
  opzioni: OpzioniCostoRicetta = {},
): number {
  return calcolaRicorsivo(ricettaId, ricette, materiePrime, opzioni, [], 1);
}

function calcolaRicorsivo(
  ricettaId: string,
  ricette: ReadonlyMap<string, RicettaCalc>,
  materiePrime: ReadonlyMap<string, MateriaPrimaCalc>,
  opzioni: OpzioniCostoRicetta,
  catena: string[],
  profondita: number,
): number {
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
  const ricetta = ricettaOrThrow(ricettaId, ricette);
  const includiOpzionali = opzioni.includiOpzionali ?? true;

  let costoBaseCent = 0;
  for (const ing of ricetta.ingredienti) {
    if (ing.opzionale && !includiOpzionali) continue;

    if (ing.materiaPrimaId) {
      const mp = materiePrime.get(ing.materiaPrimaId);
      if (!mp) throw new Error(`Materia prima non trovata: ${ing.materiaPrimaId}`);
      if (ing.quantita == null || ing.quantita <= 0) {
        throw new Error(`Quantità non valida per la materia prima ${mp.id}`);
      }
      costoBaseCent += ing.quantita * costoUnitaUsoCent(mp);
    } else if (ing.sottoRicettaId) {
      if (ing.quantitaPorzioni == null || ing.quantitaPorzioni <= 0) {
        throw new Error(
          `Porzioni non valide per la sotto-ricetta ${ing.sottoRicettaId}`,
        );
      }
      const costoPorzioneSotto = calcolaRicorsivo(
        ing.sottoRicettaId,
        ricette,
        materiePrime,
        opzioni,
        [...catena, ricettaId],
        profondita + 1,
      );
      costoBaseCent += ing.quantitaPorzioni * costoPorzioneSotto;
    } else {
      throw new Error(
        `Riga di distinta senza materia prima né sotto-ricetta nella ricetta ${ricettaId}`,
      );
    }
  }

  return costoBaseCent / ricetta.porzioniBase + ricetta.costoManualeExtraCent;
}

/** Allergeni ereditati ricorsivamente dagli ingredienti (inclusi gli opzionali). */
export function allergeniRicetta(
  ricettaId: string,
  ricette: ReadonlyMap<string, RicettaCalc>,
  materiePrime: ReadonlyMap<string, MateriaPrimaCalc>,
  catena: string[] = [],
): string[] {
  if (catena.includes(ricettaId)) {
    throw new Error(`Ciclo di sotto-ricette rilevato: ${ricettaId}`);
  }
  const ricetta = ricettaOrThrow(ricettaId, ricette);
  const risultato = new Set<string>();
  for (const ing of ricetta.ingredienti) {
    if (ing.materiaPrimaId) {
      const mp = materiePrime.get(ing.materiaPrimaId);
      if (!mp) throw new Error(`Materia prima non trovata: ${ing.materiaPrimaId}`);
      for (const a of mp.allergeni) risultato.add(a);
    } else if (ing.sottoRicettaId) {
      for (const a of allergeniRicetta(ing.sottoRicettaId, ricette, materiePrime, [
        ...catena,
        ricettaId,
      ])) {
        risultato.add(a);
      }
    }
  }
  return [...risultato].sort();
}

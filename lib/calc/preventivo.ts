/**
 * §5.4 — Totali del preventivo: food cost, extra, prezzo suggerito, margini.
 *
 * costo_riga       = costo_porzione × numero_ospiti (quantità della riga)
 * food_cost        = Σ costo righe ricette (+ beveraggio, che entra nel costo)
 * costo_totale     = food_cost + costo_extra
 * prezzo_suggerito = costo_totale / (1 − margine_target_pct/100)
 */

import { arrotondaCentesimi } from "./money";

export interface RigaPreventivoCalc {
  tipoRiga: "ricetta" | "extra";
  quantita: number;
  /** costo unitario in centesimi (frazionari ammessi); null = riga senza costo */
  costoUnitarioCent: number | null;
  /** prezzo unitario proposto al cliente; null = non ancora deciso */
  prezzoUnitarioCent: number | null;
}

export interface TotaliPreventivoInput {
  righe: RigaPreventivoCalc[];
  /** costo del beveraggio calcolato da §5.11 (0 se disattivato) */
  costoBeveraggioCent: number;
  /** prezzo del beveraggio proposto al cliente (0 se incluso altrove) */
  prezzoBeveraggioCent: number;
  margineTargetPct: number;
}

export interface TotaliPreventivo {
  foodCostCent: number;
  costoExtraCent: number;
  costoTotaleCent: number;
  prezzoSuggeritoCent: number;
  /** somma dei prezzi riga + beveraggio: il prezzo effettivamente proposto */
  prezzoTotaleCent: number;
  utileCent: number;
  margineEffettivoPct: number | null;
  foodCostPct: number | null;
}

export function calcolaTotaliPreventivo(
  input: TotaliPreventivoInput,
): TotaliPreventivo {
  const { righe, costoBeveraggioCent, prezzoBeveraggioCent, margineTargetPct } =
    input;
  if (
    !Number.isFinite(margineTargetPct) ||
    margineTargetPct < 0 ||
    margineTargetPct >= 100
  ) {
    throw new Error(`Margine target non valido (0–99,99): ${margineTargetPct}`);
  }
  if (costoBeveraggioCent < 0) {
    throw new Error(`Costo beveraggio negativo: ${costoBeveraggioCent}`);
  }

  let foodCost = costoBeveraggioCent;
  let costoExtra = 0;
  let prezzoTotale = prezzoBeveraggioCent;

  for (const riga of righe) {
    if (!Number.isFinite(riga.quantita) || riga.quantita <= 0) {
      throw new Error(`Quantità riga non valida: ${riga.quantita}`);
    }
    const costoRiga =
      riga.costoUnitarioCent != null ? riga.costoUnitarioCent * riga.quantita : 0;
    if (riga.tipoRiga === "ricetta") {
      foodCost += costoRiga;
    } else {
      costoExtra += costoRiga;
    }
    if (riga.prezzoUnitarioCent != null) {
      prezzoTotale += riga.prezzoUnitarioCent * riga.quantita;
    }
  }

  const costoTotale = foodCost + costoExtra;
  const prezzoSuggerito = costoTotale / (1 - margineTargetPct / 100);
  const utile = prezzoTotale - costoTotale;

  return {
    foodCostCent: arrotondaCentesimi(foodCost),
    costoExtraCent: arrotondaCentesimi(costoExtra),
    costoTotaleCent: arrotondaCentesimi(costoTotale),
    prezzoSuggeritoCent: arrotondaCentesimi(prezzoSuggerito),
    prezzoTotaleCent: arrotondaCentesimi(prezzoTotale),
    utileCent: arrotondaCentesimi(utile),
    margineEffettivoPct:
      prezzoTotale > 0 ? ((prezzoTotale - costoTotale) / prezzoTotale) * 100 : null,
    foodCostPct: prezzoTotale > 0 ? (foodCost / prezzoTotale) * 100 : null,
  };
}

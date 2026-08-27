/**
 * §5.4 — Totali del preventivo: food cost, extra, prezzo suggerito, margini.
 *
 * costo_riga       = costo_porzione × numero_ospiti (quantità della riga)
 * food_cost        = Σ costo righe ricette (+ beveraggio, che entra nel costo)
 * costo_totale     = food_cost + costo_extra
 * prezzo_suggerito = costo_totale / (1 − margine_target_pct/100)
 * prezzo_lordo     = Σ prezzi riga (+ beveraggio), oppure il totale imposto a mano
 * sconto           = prezzo_lordo × sconto_pct/100                  [FEATURE-021]
 * prezzo_totale    = prezzo_lordo − sconto
 * utile            = prezzo_totale − costo_totale
 */

import { arrotondaCentesimi } from "./money";

export interface RigaPreventivoCalc {
  tipoRiga: "ricetta" | "materia_prima" | "consumabile" | "extra";
  quantita: number;
  /** costo unitario in centesimi (frazionari ammessi); null = riga senza costo */
  costoUnitarioCent: number | null;
  /** prezzo unitario proposto al cliente; null = non ancora deciso */
  prezzoUnitarioCent: number | null;
}

/**
 * FEATURE-017 — quantità evento di una riga materia prima "nuda" (senza
 * ricetta) inserita nel preventivo: quantità a persona × ospiti × (1 +
 * sfrido%), formula §5 letterale. A differenza delle righe ricetta (il cui
 * food cost non applica lo sfrido, decisione presa in fase 1), questa riga lo
 * applica: scelta esplicita dell'utente, segnalata come incoerenza nota tra i
 * due tipi di riga dello stesso preventivo.
 */
export function quantitaEventoMateriaPrima(
  quantitaPersona: number,
  ospitiTotali: number,
  sfridoPct: number,
): number {
  if (!Number.isFinite(quantitaPersona) || quantitaPersona <= 0) {
    throw new Error(`Quantità a persona non valida: ${quantitaPersona}`);
  }
  if (!Number.isInteger(ospitiTotali) || ospitiTotali <= 0) {
    throw new Error(`Ospiti totali non validi: ${ospitiTotali}`);
  }
  if (!Number.isFinite(sfridoPct) || sfridoPct < 0) {
    throw new Error(`Sfrido non valido: ${sfridoPct}`);
  }
  return quantitaPersona * ospitiTotali * (1 + sfridoPct / 100);
}

/**
 * FEATURE-018 — quantità evento di una riga consumabile diretta (piatti,
 * bicchieri, posate) inserita nel preventivo: quantità a persona × ospiti,
 * §5. A differenza delle righe materia prima (che applicano lo sfrido),
 * questa NON lo applica: decisione esplicita dell'utente.
 */
export function quantitaEventoConsumabile(
  quantitaPersona: number,
  ospitiTotali: number,
): number {
  if (!Number.isFinite(quantitaPersona) || quantitaPersona <= 0) {
    throw new Error(`Quantità a persona non valida: ${quantitaPersona}`);
  }
  if (!Number.isInteger(ospitiTotali) || ospitiTotali <= 0) {
    throw new Error(`Ospiti totali non validi: ${ospitiTotali}`);
  }
  return quantitaPersona * ospitiTotali;
}

/**
 * FEATURE-021 — sconto commerciale in percentuale sul prezzo proposto.
 * Non tocca i costi: riduce solo il prezzo al cliente (e quindi utile e
 * margine effettivo). Arrotondamento a centesimi interi qui, non in
 * presentazione, così che lordo − sconto = netto sia esatto ovunque.
 */
export function scontoSuPrezzoCent(
  prezzoLordoCent: number,
  scontoPct: number,
): number {
  if (!Number.isFinite(prezzoLordoCent) || prezzoLordoCent < 0) {
    throw new Error(`Prezzo lordo non valido: ${prezzoLordoCent}`);
  }
  if (!Number.isFinite(scontoPct) || scontoPct < 0 || scontoPct >= 100) {
    throw new Error(`Sconto non valido (0–99,99): ${scontoPct}`);
  }
  return arrotondaCentesimi((prezzoLordoCent * scontoPct) / 100);
}

/** FEATURE-021 — prezzo netto dopo lo sconto: usato anche dagli elenchi, che
 * hanno il preventivo ma non il calcolo completo delle righe. */
export function prezzoScontatoCent(
  prezzoLordoCent: number,
  scontoPct: number,
): number {
  return (
    arrotondaCentesimi(prezzoLordoCent) -
    scontoSuPrezzoCent(prezzoLordoCent, scontoPct)
  );
}

export interface TotaliPreventivoInput {
  righe: RigaPreventivoCalc[];
  /** costo del beveraggio calcolato da §5.11 (0 se disattivato) */
  costoBeveraggioCent: number;
  /** prezzo del beveraggio proposto al cliente (0 se incluso altrove) */
  prezzoBeveraggioCent: number;
  margineTargetPct: number;
  /** FEATURE-021: prezzo proposto imposto a mano, AL LORDO dello sconto;
   * null/assente = somma dei prezzi riga */
  prezzoTotaleManualeCent?: number | null;
  /** FEATURE-021: sconto commerciale in % (0 = nessuno) */
  scontoPct?: number;
}

export interface TotaliPreventivo {
  foodCostCent: number;
  costoExtraCent: number;
  costoTotaleCent: number;
  prezzoSuggeritoCent: number;
  /** somma dei prezzi riga + beveraggio (o il totale imposto a mano), PRIMA
   * dello sconto */
  prezzoLordoCent: number;
  /** FEATURE-021: importo dello sconto applicato (0 se nessuno sconto) */
  scontoCent: number;
  /** prezzo effettivamente proposto al cliente, al netto dello sconto */
  prezzoTotaleCent: number;
  utileCent: number;
  margineEffettivoPct: number | null;
  foodCostPct: number | null;
}

export function calcolaTotaliPreventivo(
  input: TotaliPreventivoInput,
): TotaliPreventivo {
  const {
    righe,
    costoBeveraggioCent,
    prezzoBeveraggioCent,
    margineTargetPct,
    prezzoTotaleManualeCent,
    scontoPct = 0,
  } = input;
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
  if (prezzoTotaleManualeCent != null && prezzoTotaleManualeCent < 0) {
    throw new Error(`Prezzo totale manuale negativo: ${prezzoTotaleManualeCent}`);
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
    if (riga.tipoRiga === "extra" || riga.tipoRiga === "consumabile") {
      costoExtra += costoRiga;
    } else {
      foodCost += costoRiga;
    }
    if (riga.prezzoUnitarioCent != null) {
      prezzoTotale += riga.prezzoUnitarioCent * riga.quantita;
    }
  }

  const costoTotale = foodCost + costoExtra;
  const prezzoSuggerito = costoTotale / (1 - margineTargetPct / 100);
  // il totale imposto a mano sostituisce la somma delle righe ed è anch'esso
  // un LORDO: lo sconto si applica in entrambi i casi allo stesso modo
  const prezzoLordoCent = arrotondaCentesimi(prezzoTotaleManualeCent ?? prezzoTotale);
  const scontoCent = scontoSuPrezzoCent(prezzoLordoCent, scontoPct);
  const prezzoNettoCent = prezzoLordoCent - scontoCent;
  const utile = prezzoNettoCent - costoTotale;

  return {
    foodCostCent: arrotondaCentesimi(foodCost),
    costoExtraCent: arrotondaCentesimi(costoExtra),
    costoTotaleCent: arrotondaCentesimi(costoTotale),
    prezzoSuggeritoCent: arrotondaCentesimi(prezzoSuggerito),
    prezzoLordoCent,
    scontoCent,
    prezzoTotaleCent: prezzoNettoCent,
    utileCent: arrotondaCentesimi(utile),
    margineEffettivoPct:
      prezzoNettoCent > 0
        ? ((prezzoNettoCent - costoTotale) / prezzoNettoCent) * 100
        : null,
    foodCostPct: prezzoNettoCent > 0 ? (foodCost / prezzoNettoCent) * 100 : null,
  };
}

/**
 * FEATURE-020 — le righe ricetta portano una quantità di porzioni salvata a
 * mano (copiata dal menu o inserita a mano), che NON scala da sola con gli
 * ospiti: è voluto, perché di una portata si possono voler fare meno porzioni
 * degli ospiti presenti. Questa funzione dice solo se la riga si è scostata
 * dal numero di ospiti, così la UI può segnalarlo e offrire l'allineamento:
 * non cambia nessun valore e non entra in nessun calcolo di costo.
 */
export function porzioniDisallineate(
  porzioni: number,
  ospitiTotali: number,
): boolean {
  if (!Number.isFinite(porzioni) || porzioni <= 0) {
    throw new Error(`Porzioni non valide: ${porzioni}`);
  }
  if (!Number.isInteger(ospitiTotali) || ospitiTotali <= 0) {
    throw new Error(`Ospiti totali non validi: ${ospitiTotali}`);
  }
  return porzioni !== ospitiTotali;
}

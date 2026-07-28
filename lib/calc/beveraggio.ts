/**
 * §5.11 — Beveraggio: stima a testa con correttivi, fattore di distribuzione
 * degli alcolici, scalatura adulti/bambini e arrotondamento per eccesso a
 * unità e a collo.
 *
 * Ordine delle operazioni (vincolante):
 *   correttivi rapidi → fattore di distribuzione → scalatura ospiti →
 *   arrotondamento per eccesso a unità e poi a collo.
 *
 * Si mostrano sempre quantità teorica e quantità corretta.
 */

import { arrotondaCentesimi } from "./money";

export type CategoriaBevanda =
  | "acqua_naturale"
  | "acqua_frizzante"
  | "vino_bianco"
  | "vino_rosso"
  | "bollicine"
  | "birra"
  | "soft_drink"
  | "succhi"
  | "caffe"
  | "amari_distillati";

export type UnitaBevanda = "ml" | "pz";

export const CATEGORIE_ALCOLICHE: ReadonlySet<CategoriaBevanda> = new Set([
  "vino_bianco",
  "vino_rosso",
  "bollicine",
  "birra",
  "amari_distillati",
]);

/** Vino e birra sono le categorie "concorrenti" del fattore di distribuzione;
 *  lo spumante (bollicine) resta escluso: è legato al brindisi. */
const CATEGORIE_VINO: ReadonlySet<CategoriaBevanda> = new Set([
  "vino_bianco",
  "vino_rosso",
]);

const CATEGORIE_ACQUA: ReadonlySet<CategoriaBevanda> = new Set([
  "acqua_naturale",
  "acqua_frizzante",
]);

const CATEGORIE_BIBITE: ReadonlySet<CategoriaBevanda> = new Set([
  "soft_drink",
  "succhi",
]);

export interface BevandaCalc {
  id: string;
  nome: string;
  capacitaUnitaria: number;
  unita: UnitaBevanda;
  unitaPerCollo: number;
  prezzoUnitarioCent: number;
}

/** Un prodotto assegnato a una categoria, con la quota di quantità che copre
 * (BUG-001: più prodotti possono condividere la stessa categoria). */
export interface ProdottoBeveraggioInput {
  bevanda: BevandaCalc;
  /** quota (0-100] della quantità di categoria coperta da questo prodotto */
  quotaPct: number;
}

export interface RigaBeveraggioInput {
  categoria: CategoriaBevanda;
  quantitaATesta: number;
  unita: UnitaBevanda;
  /** consumo aggiuntivo per ora di servizio (voci a durata) */
  quantitaATestaOra: number;
  /** prodotti scelti per prezzare la categoria; vuoto = riga non prezzata */
  prodotti: ProdottoBeveraggioInput[];
}

export interface OpzioniBeveraggio {
  ospitiAdulti: number;
  ospitiBambini: number;
  oreServizio: number;
  /** riduzione % applicata a vino+birra quando entrambi attivi (default 25) */
  fattoreDistribuzionePct: number;
  /** quota bibite per i bambini (default 50); acqua sempre piena */
  quotaBibiteBambiniPct: number;
  correttivoStagioneCalda: boolean;
  correttivoEventoLungo: boolean;
  correttivoPubblico: "normale" | "beve_poco" | "beve_molto";
}

export interface ProdottoBeveraggioRisultato {
  bevanda: BevandaCalc;
  quotaPct: number;
  /** porzione di volume corretto assegnata a questo prodotto */
  volumeAssegnato: number;
  unitaNecessarie: number;
  colli: number;
  unitaAcquistate: number;
  costoCent: number;
  /** scorta residua stimata: capacità acquistata − volume assegnato */
  scortaResidua: number;
}

export interface RigaBeveraggioRisultato {
  categoria: CategoriaBevanda;
  unita: UnitaBevanda;
  /** volume totale teorico (senza correttivi né distribuzione) */
  volumeTeorico: number;
  /** volume totale dopo correttivi e fattore di distribuzione */
  volumeCorretto: number;
  /** un elemento per prodotto assegnato alla categoria (BUG-001) */
  prodotti: ProdottoBeveraggioRisultato[];
  /** somma delle quote assegnate: <100 = categoria parzialmente prezzata */
  quotaCopertaPct: number;
  /** somma dei costi dei prodotti; null se nessun prodotto assegnato */
  costoCent: number | null;
  /** somma delle scorte residue dei prodotti; null se nessun prodotto assegnato */
  scortaResidua: number | null;
}

export interface RisultatoBeveraggio {
  righe: RigaBeveraggioRisultato[];
  /** somma dei costi delle righe prezzate */
  costoTotaleCent: number;
  /** true se almeno una riga con volume > 0 non ha una bevanda associata */
  righeSenzaPrezzo: boolean;
  fattoreDistribuzioneApplicato: boolean;
}

function validaOpzioni(o: OpzioniBeveraggio): void {
  if (!Number.isInteger(o.ospitiAdulti) || o.ospitiAdulti < 0) {
    throw new Error(`Ospiti adulti non validi: ${o.ospitiAdulti}`);
  }
  if (!Number.isInteger(o.ospitiBambini) || o.ospitiBambini < 0) {
    throw new Error(`Ospiti bambini non validi: ${o.ospitiBambini}`);
  }
  if (o.ospitiAdulti + o.ospitiBambini <= 0) {
    throw new Error("Serve almeno un ospite");
  }
  if (!Number.isFinite(o.oreServizio) || o.oreServizio < 0) {
    throw new Error(`Ore di servizio non valide: ${o.oreServizio}`);
  }
  if (
    !Number.isFinite(o.fattoreDistribuzionePct) ||
    o.fattoreDistribuzionePct < 0 ||
    o.fattoreDistribuzionePct > 100
  ) {
    throw new Error(
      `Fattore di distribuzione non valido: ${o.fattoreDistribuzionePct}`,
    );
  }
  if (
    !Number.isFinite(o.quotaBibiteBambiniPct) ||
    o.quotaBibiteBambiniPct < 0 ||
    o.quotaBibiteBambiniPct > 100
  ) {
    throw new Error(`Quota bibite bambini non valida: ${o.quotaBibiteBambiniPct}`);
  }
}

/** Moltiplicatore dei correttivi rapidi per una categoria. */
function moltiplicatoreCorrettivi(
  categoria: CategoriaBevanda,
  o: OpzioniBeveraggio,
): number {
  let m = 1;
  // stagione calda: +30% su acqua e birra
  if (
    o.correttivoStagioneCalda &&
    (CATEGORIE_ACQUA.has(categoria) || categoria === "birra")
  ) {
    m *= 1.3;
  }
  // evento lungo oltre 4 ore: +20% su tutto
  if (o.correttivoEventoLungo) {
    m *= 1.2;
  }
  // pubblico che beve poco/molto: ∓20% sugli alcolici
  if (CATEGORIE_ALCOLICHE.has(categoria)) {
    if (o.correttivoPubblico === "beve_poco") m *= 0.8;
    if (o.correttivoPubblico === "beve_molto") m *= 1.2;
  }
  return m;
}

/**
 * Ospiti equivalenti per categoria: gli alcolici e il caffè valgono per i soli
 * adulti; l'acqua per tutti a quota piena; bibite e succhi per gli adulti più
 * i bambini a quota ridotta.
 */
function ospitiEquivalenti(
  categoria: CategoriaBevanda,
  o: OpzioniBeveraggio,
): number {
  if (CATEGORIE_ALCOLICHE.has(categoria) || categoria === "caffe") {
    return o.ospitiAdulti;
  }
  if (CATEGORIE_ACQUA.has(categoria)) {
    return o.ospitiAdulti + o.ospitiBambini;
  }
  if (CATEGORIE_BIBITE.has(categoria)) {
    return o.ospitiAdulti + (o.ospitiBambini * o.quotaBibiteBambiniPct) / 100;
  }
  return o.ospitiAdulti + o.ospitiBambini;
}

export function calcolaBeveraggio(
  righe: RigaBeveraggioInput[],
  opzioni: OpzioniBeveraggio,
): RisultatoBeveraggio {
  validaOpzioni(opzioni);

  const categorieViste = new Set<CategoriaBevanda>();
  for (const r of righe) {
    if (categorieViste.has(r.categoria)) {
      throw new Error(`Categoria duplicata nel profilo: ${r.categoria}`);
    }
    categorieViste.add(r.categoria);
    if (!Number.isFinite(r.quantitaATesta) || r.quantitaATesta < 0) {
      throw new Error(`Quantità a testa non valida per ${r.categoria}`);
    }
    if (!Number.isFinite(r.quantitaATestaOra) || r.quantitaATestaOra < 0) {
      throw new Error(`Quantità a testa/ora non valida per ${r.categoria}`);
    }
    let quotaTotale = 0;
    for (const p of r.prodotti) {
      if (!Number.isFinite(p.quotaPct) || p.quotaPct <= 0) {
        throw new Error(
          `Quota non valida per "${p.bevanda.nome}" (${r.categoria}): ${p.quotaPct}`,
        );
      }
      if (p.bevanda.unita !== r.unita) {
        throw new Error(
          `Unità incoerente per ${r.categoria}: riga in ${r.unita}, bevanda "${p.bevanda.nome}" in ${p.bevanda.unita}`,
        );
      }
      quotaTotale += p.quotaPct;
    }
    if (quotaTotale > 100 + 1e-6) {
      throw new Error(
        `Quote dei prodotti oltre il 100% per ${r.categoria}: ${quotaTotale}%`,
      );
    }
  }

  // 0. base a testa, voci a durata incluse
  const baseATesta = new Map<CategoriaBevanda, number>();
  for (const r of righe) {
    baseATesta.set(
      r.categoria,
      r.quantitaATesta + r.quantitaATestaOra * opzioni.oreServizio,
    );
  }

  // 1. correttivi rapidi
  const correttaATesta = new Map<CategoriaBevanda, number>();
  for (const r of righe) {
    correttaATesta.set(
      r.categoria,
      (baseATesta.get(r.categoria) ?? 0) *
        moltiplicatoreCorrettivi(r.categoria, opzioni),
    );
  }

  // 2. fattore di distribuzione: solo se vino E birra sono entrambi attivi;
  //    la riduzione si ripartisce proporzionalmente (rapporti interni invariati)
  const vinoAttivo = righe.some(
    (r) => CATEGORIE_VINO.has(r.categoria) && (correttaATesta.get(r.categoria) ?? 0) > 0,
  );
  const birraAttiva = righe.some(
    (r) => r.categoria === "birra" && (correttaATesta.get(r.categoria) ?? 0) > 0,
  );
  const applicaDistribuzione = vinoAttivo && birraAttiva;
  if (applicaDistribuzione) {
    const fattore = 1 - opzioni.fattoreDistribuzionePct / 100;
    for (const r of righe) {
      if (CATEGORIE_VINO.has(r.categoria) || r.categoria === "birra") {
        correttaATesta.set(
          r.categoria,
          (correttaATesta.get(r.categoria) ?? 0) * fattore,
        );
      }
    }
  }

  // 3. scalatura ospiti (adulti/bambini) — 4. arrotondamenti per eccesso
  const risultati: RigaBeveraggioRisultato[] = [];
  let costoTotaleCent = 0;
  let righeSenzaPrezzo = false;

  for (const r of righe) {
    const ospiti = ospitiEquivalenti(r.categoria, opzioni);
    const volumeTeorico = (baseATesta.get(r.categoria) ?? 0) * ospiti;
    const volumeCorretto = (correttaATesta.get(r.categoria) ?? 0) * ospiti;

    const prodottiRisultato: ProdottoBeveraggioRisultato[] = [];
    let quotaCopertaPct = 0;
    let costoRigaCent = 0;
    let scortaRigaResidua = 0;

    for (const p of r.prodotti) {
      quotaCopertaPct += p.quotaPct;
      let volumeAssegnato = 0;
      let unitaNecessarie = 0;
      let colli = 0;
      let unitaAcquistate = 0;
      let costoCent = 0;
      let scortaResidua = 0;

      if (volumeCorretto > 0) {
        if (p.bevanda.capacitaUnitaria <= 0 || p.bevanda.unitaPerCollo <= 0) {
          throw new Error(`Dati bevanda non validi per ${r.categoria}`);
        }
        volumeAssegnato = volumeCorretto * (p.quotaPct / 100);
        unitaNecessarie = Math.ceil(volumeAssegnato / p.bevanda.capacitaUnitaria);
        colli = Math.ceil(unitaNecessarie / p.bevanda.unitaPerCollo);
        unitaAcquistate = colli * p.bevanda.unitaPerCollo;
        costoCent = arrotondaCentesimi(unitaAcquistate * p.bevanda.prezzoUnitarioCent);
        scortaResidua = unitaAcquistate * p.bevanda.capacitaUnitaria - volumeAssegnato;
      }

      costoRigaCent += costoCent;
      scortaRigaResidua += scortaResidua;
      costoTotaleCent += costoCent;
      prodottiRisultato.push({
        bevanda: p.bevanda,
        quotaPct: p.quotaPct,
        volumeAssegnato,
        unitaNecessarie,
        colli,
        unitaAcquistate,
        costoCent,
        scortaResidua,
      });
    }

    if (volumeCorretto > 0 && quotaCopertaPct < 100 - 1e-6) {
      righeSenzaPrezzo = true;
    }

    risultati.push({
      categoria: r.categoria,
      unita: r.unita,
      volumeTeorico,
      volumeCorretto,
      prodotti: prodottiRisultato,
      quotaCopertaPct,
      costoCent: r.prodotti.length > 0 ? costoRigaCent : null,
      scortaResidua: r.prodotti.length > 0 ? scortaRigaResidua : null,
    });
  }

  return {
    righe: risultati,
    costoTotaleCent,
    righeSenzaPrezzo,
    fattoreDistribuzioneApplicato: applicaDistribuzione,
  };
}

/** Profilo standard della specifica (§5.11): valori a testa, servizio completo. */
export const PROFILO_STANDARD: ReadonlyArray<{
  categoria: CategoriaBevanda;
  quantitaATesta: number;
  unita: UnitaBevanda;
}> = [
  { categoria: "acqua_naturale", quantitaATesta: 600, unita: "ml" },
  { categoria: "acqua_frizzante", quantitaATesta: 400, unita: "ml" },
  { categoria: "vino_bianco", quantitaATesta: 200, unita: "ml" },
  { categoria: "vino_rosso", quantitaATesta: 200, unita: "ml" },
  { categoria: "bollicine", quantitaATesta: 100, unita: "ml" },
  { categoria: "birra", quantitaATesta: 400, unita: "ml" },
  { categoria: "soft_drink", quantitaATesta: 400, unita: "ml" },
  { categoria: "caffe", quantitaATesta: 1, unita: "pz" },
];

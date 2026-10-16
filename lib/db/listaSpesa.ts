import {
  calcolaListaSpesa,
  raggruppaPerFornitore,
  type ArticoloSpesa,
  type GruppoFornitore,
  type RigaSpesaInput,
} from "@/lib/calc/listaSpesa";
import type { ProdottoBeveraggioRisultato } from "@/lib/calc/beveraggio";
import { calcolaPreventivo } from "./preventivi";
import { caricaGrafoCalc } from "./ricette";
import {
  etichettaMateriaPrima,
  type CategoriaBevanda,
  type Cliente,
  type Preventivo,
  type UnitaAcquisto,
} from "./types";

export interface ArticoloListaSpesa extends ArticoloSpesa {
  nome: string;
  fornitore: string | null;
  unitaAcquisto: UnitaAcquisto;
  unitaUso: string;
  /** 100 per i consumabili */
  resaPercentuale: number;
}

export interface RicettaInLista {
  nome: string;
  porzioni: number;
  escludiOpzionali: boolean;
}

export interface ListaSpesaPreventivo {
  preventivo: Preventivo;
  cliente: Cliente;
  ospitiTotali: number;
  ricette: RicettaInLista[];
  gruppi: GruppoFornitore<ArticoloListaSpesa>[];
  costoAcquistoCent: number;
  costoNecessarioCent: number;
  /** prodotti assegnati nel preventivo, con colli e costo già calcolati */
  beveraggio: Array<ProdottoBeveraggioRisultato & { categoria: CategoriaBevanda }>;
  costoBeveraggioCent: number;
  /** true se almeno una categoria con volume > 0 non ha prodotti assegnati */
  beveraggioIncompleto: boolean;
  erroreBeveraggio: string | null;
}

/**
 * CL-4 — lista della spesa interna di un preventivo. Quantità e costi sono
 * calcolati sulle ricette e sui prezzi CORRENTI (§5.6 punto 5), anche per i
 * preventivi inviati: è una stima operativa, non un documento congelato. Il
 * beveraggio arriva invece dal calcolo del preventivo così com'è.
 */
export async function listaSpesaPreventivo(id: string): Promise<ListaSpesaPreventivo> {
  const [calcolo, grafo] = await Promise.all([calcolaPreventivo(id), caricaGrafoCalc()]);
  const { dati, materiePrime, consumabili, ricette } = calcolo;
  const { preventivo, cliente, righe } = dati;
  const ospitiTotali = preventivo.numero_ospiti_adulti + preventivo.numero_ospiti_bambini;

  const righeInput: RigaSpesaInput[] = [];
  for (const riga of righe) {
    if (riga.tipo_riga === "ricetta") {
      righeInput.push({
        tipo: "ricetta",
        ricettaId: riga.ricetta_id!,
        porzioni: Number(riga.quantita),
        escludiOpzionali: riga.escludi_opzionali,
      });
    } else if (riga.tipo_riga === "materia_prima") {
      righeInput.push({
        tipo: "materia_prima",
        materiaPrimaId: riga.materia_prima_id!,
        quantitaPersona: Number(riga.quantita),
      });
    } else if (riga.tipo_riga === "consumabile") {
      righeInput.push({
        tipo: "consumabile",
        consumabileId: riga.consumabile_id!,
        quantitaPersona: Number(riga.quantita),
      });
    }
    // le righe extra (personale, trasferta, noleggi…) non si comprano
  }

  const materiePrimePerId = new Map(materiePrime.map((mp) => [mp.id, mp]));
  const consumabiliPerId = new Map(consumabili.map((c) => [c.id, c]));
  const ricettePerId = new Map(ricette.map((r) => [r.id, r]));

  const articoli = calcolaListaSpesa({
    righe: righeInput,
    ospitiTotali,
    sfridoPct: Number(preventivo.sfrido_pct),
    ricette: grafo.ricette,
    materiePrime: grafo.materiePrime,
    consumabili: new Map(
      consumabili.map((c) => [
        c.id,
        {
          prezzoAcquistoCent: Number(c.prezzo_acquisto_cent),
          fattoreConversione: Number(c.fattore_conversione),
        },
      ]),
    ),
  });

  const articoliCompleti: ArticoloListaSpesa[] = articoli.map((a) => {
    if (a.tipo === "materia_prima") {
      const mp = materiePrimePerId.get(a.id);
      if (!mp) throw new Error(`Materia prima non trovata: ${a.id}`);
      return {
        ...a,
        // documento interno: la marca aiuta a non comprare l'omonimo sbagliato (UX-004)
        nome: etichettaMateriaPrima(mp),
        fornitore: mp.fornitore_preferito,
        unitaAcquisto: mp.unita_acquisto,
        unitaUso: mp.unita_uso,
        resaPercentuale: Number(mp.resa_percentuale),
      };
    }
    const c = consumabiliPerId.get(a.id);
    if (!c) throw new Error(`Consumabile non trovato: ${a.id}`);
    return {
      ...a,
      nome: c.nome,
      fornitore: c.fornitore_preferito,
      unitaAcquisto: c.unita_acquisto,
      unitaUso: c.unita_uso,
      resaPercentuale: 100,
    };
  });

  const beveraggio =
    calcolo.beveraggio?.righe.flatMap((r) =>
      r.prodotti.map((p) => ({ categoria: r.categoria, ...p })),
    ) ?? [];

  return {
    preventivo,
    cliente,
    ospitiTotali,
    ricette: righe
      .filter((r) => r.tipo_riga === "ricetta")
      .map((r) => ({
        nome: ricettePerId.get(r.ricetta_id!)?.nome ?? r.descrizione,
        porzioni: Number(r.quantita),
        escludiOpzionali: r.escludi_opzionali,
      })),
    gruppi: raggruppaPerFornitore(articoliCompleti),
    costoAcquistoCent: articoliCompleti.reduce((s, a) => s + a.costoAcquistoCent, 0),
    costoNecessarioCent: Math.round(
      articoliCompleti.reduce((s, a) => s + a.costoNecessarioCent, 0),
    ),
    beveraggio,
    costoBeveraggioCent: beveraggio.reduce((s, p) => s + p.costoCent, 0),
    beveraggioIncompleto: calcolo.beveraggio?.righeSenzaPrezzo ?? false,
    erroreBeveraggio: calcolo.erroreBeveraggio,
  };
}

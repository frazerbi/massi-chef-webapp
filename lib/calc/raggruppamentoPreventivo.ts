/**
 * CL-1 — Raggruppamento delle righe di preventivo per categoria di
 * presentazione. Funzione PURA (nessun accesso a DB o rete): è importata sia
 * dalla pagina preventivo sia dal PDF, che devono mostrare gli stessi gruppi
 * nello stesso ordine (§3: mai duplicare una regola condivisa).
 *
 * È solo presentazione: nessun costo viene ricalcolato, nessuna riga viene
 * scartata o aggiunta. L'ordine relativo delle righe dentro un gruppo è
 * quello di ingresso (cioè `ordine`), il raggruppamento è stabile.
 *
 * Mappa riga → gruppo:
 *   ricetta        → la portata della ricetta (antipasto…altro); "altro" se
 *                    la portata non è disponibile
 *   consumabile    → "Consumabili apparecchio" o "Consumabili cucina" secondo
 *                    `tipo_consumabile` dell'anagrafica (default consumabile).
 *                    I valori dell'enum restano `apparecchiatura`/`consumabile`:
 *                    qui cambia solo l'etichetta mostrata.
 *   materia_prima  → "Altri prodotti"
 *   extra          → "Servizi e altre voci", sempre in coda a tutti gli altri
 */

export type CategoriaPortata =
  | "antipasto"
  | "primo"
  | "secondo"
  | "contorno"
  | "dessert"
  | "finger"
  | "altro";

export type TipoConsumabile = "apparecchiatura" | "consumabile";

export type TipoRigaPreventivo =
  | "ricetta"
  | "materia_prima"
  | "consumabile"
  | "extra";

export type ChiaveGruppoPreventivo =
  | CategoriaPortata
  | "apparecchiatura"
  | "consumabile"
  | "altri_prodotti"
  | "servizi";

/** Ordine di stampa dei gruppi, vincolante (decisione CL-1 del 20/08/2026). */
export const ORDINE_GRUPPI_PREVENTIVO: readonly ChiaveGruppoPreventivo[] = [
  "antipasto",
  "primo",
  "secondo",
  "contorno",
  "dessert",
  "finger",
  "altro",
  "apparecchiatura",
  "consumabile",
  "altri_prodotti",
  "servizi",
];

export const ETICHETTE_GRUPPO_PREVENTIVO: Record<ChiaveGruppoPreventivo, string> = {
  antipasto: "Antipasti",
  primo: "Primi",
  secondo: "Secondi",
  contorno: "Contorni",
  dessert: "Dessert",
  finger: "Finger food",
  altro: "Altre portate",
  apparecchiatura: "Consumabili apparecchio",
  consumabile: "Consumabili cucina",
  altri_prodotti: "Altri prodotti",
  servizi: "Servizi e altre voci",
};

/** Dati minimi necessari a collocare una riga nel suo gruppo. */
export interface RigaRaggruppabile {
  tipoRiga: TipoRigaPreventivo;
  /** portata della ricetta collegata; null se non disponibile o riga non-ricetta */
  categoriaPortata?: CategoriaPortata | null;
  /** tipo del consumabile collegato; null se non disponibile o riga non-consumabile */
  tipoConsumabile?: TipoConsumabile | null;
}

export interface GruppoRighePreventivo<T> {
  chiave: ChiaveGruppoPreventivo;
  etichetta: string;
  righe: T[];
}

export function gruppoDiRigaPreventivo(
  riga: RigaRaggruppabile,
): ChiaveGruppoPreventivo {
  switch (riga.tipoRiga) {
    case "extra":
      return "servizi";
    case "materia_prima":
      return "altri_prodotti";
    case "consumabile":
      // default dell'anagrafica: consumabile (migrazione 0008)
      return riga.tipoConsumabile === "apparecchiatura"
        ? "apparecchiatura"
        : "consumabile";
    case "ricetta":
      // riga senza portata disponibile (ricetta mancante): finisce in "Altre portate"
      return riga.categoriaPortata ?? "altro";
    default:
      throw new Error(`Tipo riga non gestito: ${String(riga.tipoRiga)}`);
  }
}

/**
 * Raggruppa le righe nell'ordine di ORDINE_GRUPPI_PREVENTIVO. I gruppi senza
 * righe non vengono restituiti (non devono essere stampati).
 */
export function raggruppaRighePreventivo<T extends RigaRaggruppabile>(
  righe: readonly T[],
): GruppoRighePreventivo<T>[] {
  const perChiave = new Map<ChiaveGruppoPreventivo, T[]>();
  for (const riga of righe) {
    const chiave = gruppoDiRigaPreventivo(riga);
    const gruppo = perChiave.get(chiave);
    if (gruppo) gruppo.push(riga);
    else perChiave.set(chiave, [riga]);
  }
  return ORDINE_GRUPPI_PREVENTIVO.flatMap((chiave) => {
    const righeGruppo = perChiave.get(chiave);
    if (!righeGruppo || righeGruppo.length === 0) return [];
    return [
      {
        chiave,
        etichetta: ETICHETTE_GRUPPO_PREVENTIVO[chiave],
        righe: righeGruppo,
      },
    ];
  });
}

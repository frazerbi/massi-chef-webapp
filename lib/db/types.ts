/**
 * Tipi riga del database (snake_case, allineati alle migrazioni SQL).
 * Gli importi sono in centesimi interi, le quantità a 3 decimali.
 */

export type UnitaAcquisto = "kg" | "l" | "pz" | "conf";
export type UnitaUso = "g" | "ml" | "pz";
export type UnitaBevanda = "ml" | "pz";
export type TipoEvento = "catering" | "privato";
export type TipoCliente = "privato" | "azienda";
export type StatoPreventivo =
  | "bozza"
  | "inviato"
  | "confermato"
  | "rifiutato"
  | "scaduto";
export type CategoriaPortata =
  | "antipasto"
  | "primo"
  | "secondo"
  | "contorno"
  | "dessert"
  | "finger"
  | "altro";
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
export type TipoRigaPreventivo = "ricetta" | "extra";
export type CategoriaRigaExtra =
  | "personale"
  | "trasferta"
  | "noleggio"
  | "consumabile"
  | "sconto"
  | "altro";
export type CorrettivoPubblico = "normale" | "beve_poco" | "beve_molto";
export type EsposizioneBeveraggio = "a_corpo" | "a_testa" | "dettaglio";

export const ETICHETTE_CATEGORIA_BEVANDA: Record<CategoriaBevanda, string> = {
  acqua_naturale: "Acqua naturale",
  acqua_frizzante: "Acqua frizzante",
  vino_bianco: "Vino bianco",
  vino_rosso: "Vino rosso",
  bollicine: "Spumante / bollicine",
  birra: "Birra",
  soft_drink: "Bibite / soft drink",
  succhi: "Succhi",
  caffe: "Caffè",
  amari_distillati: "Amari e distillati",
};

export const ETICHETTE_PORTATA: Record<CategoriaPortata, string> = {
  antipasto: "Antipasto",
  primo: "Primo",
  secondo: "Secondo",
  contorno: "Contorno",
  dessert: "Dessert",
  finger: "Finger",
  altro: "Altro",
};

export const ALLERGENI_UE = [
  "glutine",
  "crostacei",
  "uova",
  "pesce",
  "arachidi",
  "soia",
  "latte",
  "frutta a guscio",
  "sedano",
  "senape",
  "sesamo",
  "anidride solforosa e solfiti",
  "lupini",
  "molluschi",
] as const;

interface RigaBase {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Impostazioni {
  user_id: string;
  sfrido_catering_pct: number;
  sfrido_privato_pct: number;
  fattore_distribuzione_pct: number;
  quota_bibite_bambini_pct: number;
  acconto_pct: number;
  soglia_spesatura_cent: number;
  giorni_avviso_scadenze: number;
  validita_preventivo_giorni: number;
}

export interface MateriaPrima extends RigaBase {
  nome: string;
  categoria: string;
  unita_acquisto: UnitaAcquisto;
  prezzo_acquisto_cent: number;
  unita_uso: UnitaUso;
  fattore_conversione: number;
  resa_percentuale: number;
  fornitore_preferito: string | null;
  allergeni: string[];
  note: string | null;
  deleted_at: string | null;
}

export interface Consumabile extends RigaBase {
  nome: string;
  categoria: string;
  unita_acquisto: UnitaAcquisto;
  prezzo_acquisto_cent: number;
  unita_uso: UnitaUso;
  fattore_conversione: number;
  fornitore_preferito: string | null;
  note: string | null;
  deleted_at: string | null;
}

export interface Cliente extends RigaBase {
  nome: string;
  tipo: TipoCliente;
  telefono: string | null;
  email: string | null;
  indirizzi: string | null;
  note: string | null;
  deleted_at: string | null;
}

export interface Ricetta extends RigaBase {
  nome: string;
  descrizione: string | null;
  categoria_portata: CategoriaPortata;
  porzioni_base: number;
  tempo_preparazione_min: number | null;
  costo_manuale_extra_cent: number;
  istruzioni: string | null;
  attiva: boolean;
  deleted_at: string | null;
}

export interface RicettaIngrediente extends RigaBase {
  ricetta_id: string;
  materia_prima_id: string | null;
  sotto_ricetta_id: string | null;
  quantita: number | null;
  quantita_porzioni: number | null;
  opzionale: boolean;
}

export interface Menu extends RigaBase {
  nome: string;
  descrizione: string | null;
  deleted_at: string | null;
}

export interface MenuRiga extends RigaBase {
  menu_id: string;
  ricetta_id: string;
  ordine: number;
}

export interface Bevanda extends RigaBase {
  nome: string;
  categoria: CategoriaBevanda;
  formato_confezione: string | null;
  capacita_unitaria: number;
  unita: UnitaBevanda;
  unita_per_collo: number;
  prezzo_unitario_cent: number;
  alcolica: boolean;
  note: string | null;
  deleted_at: string | null;
}

export interface ProfiloBeveraggio extends RigaBase {
  nome: string;
  note: string | null;
  deleted_at: string | null;
}

export interface ProfiloBeveraggioRiga extends RigaBase {
  profilo_id: string;
  categoria: CategoriaBevanda;
  quantita_a_testa: number;
  unita: UnitaBevanda;
  quantita_a_testa_ora: number;
}

export interface Preventivo extends RigaBase {
  cliente_id: string;
  tipo: TipoEvento;
  data_evento: string;
  numero_ospiti_adulti: number;
  numero_ospiti_bambini: number;
  stato: StatoPreventivo;
  sfrido_pct: number;
  margine_target_pct: number;
  prezzo_totale_cent: number | null;
  validita_giorni: number;
  note_cliente: string | null;
  condizioni: string | null;
  food_cost_snapshot: FoodCostSnapshot | null;
  revisione_di_id: string | null;
  inviato_at: string | null;
}

export interface PreventivoRiga extends RigaBase {
  preventivo_id: string;
  tipo_riga: TipoRigaPreventivo;
  ricetta_id: string | null;
  categoria_extra: CategoriaRigaExtra | null;
  descrizione: string;
  quantita: number;
  costo_unitario_cent: number | null;
  prezzo_unitario_cent: number | null;
  escludi_opzionali: boolean;
  ordine: number;
}

export interface PreventivoBeveraggio extends RigaBase {
  preventivo_id: string;
  attivo: boolean;
  profilo_origine_id: string | null;
  ore_servizio: number;
  fattore_distribuzione_pct: number;
  quota_bibite_bambini_pct: number;
  correttivo_stagione_calda: boolean;
  correttivo_evento_lungo: boolean;
  correttivo_pubblico: CorrettivoPubblico;
  esposizione: EsposizioneBeveraggio;
}

export interface PreventivoBeveraggioRiga extends RigaBase {
  preventivo_beveraggio_id: string;
  categoria: CategoriaBevanda;
  quantita_a_testa: number;
  unita: UnitaBevanda;
  quantita_a_testa_ora: number;
  /** @deprecated sostituito da PreventivoBeveraggioProdotto (più prodotti per categoria) */
  bevanda_id: string | null;
}

/** Prodotto (bevanda) assegnato a una riga di beveraggio, con la quota della
 * quantità di categoria che copre. Più righe possono condividere la stessa
 * riga di beveraggio (quindi la stessa categoria) con quote diverse. */
export interface PreventivoBeveraggioProdotto extends RigaBase {
  preventivo_beveraggio_riga_id: string;
  bevanda_id: string;
  quota_pct: number;
  ordine: number;
}

/** Snapshot congelato al passaggio bozza -> inviato (invariante di immutabilità). */
export interface FoodCostSnapshot {
  congelato_at: string;
  righe: Array<{ riga_id: string; costo_unitario_cent: number }>;
  beveraggio: {
    costo_totale_cent: number;
    /** una riga per prodotto assegnato (più righe possono condividere la categoria) */
    righe: Array<{
      categoria: CategoriaBevanda;
      bevanda_id: string | null;
      /** assente nei preventivi congelati prima dell'introduzione dei prodotti multipli: trattare come 100 */
      quota_pct: number | null;
      prezzo_unitario_cent: number | null;
      capacita_unitaria: number | null;
      unita_per_collo: number | null;
      colli: number | null;
      costo_cent: number | null;
    }>;
  } | null;
}

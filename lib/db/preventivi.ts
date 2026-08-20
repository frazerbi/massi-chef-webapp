import {
  calcolaBeveraggio,
  type RigaBeveraggioInput,
  type RisultatoBeveraggio,
} from "@/lib/calc/beveraggio";
import { costoUnitaUsoCent } from "@/lib/calc/materiaPrima";
import { costoPorzioneCent } from "@/lib/calc/ricetta";
import { arrotondaCentesimi } from "@/lib/calc/money";
import {
  calcolaTotaliPreventivo,
  quantitaEventoConsumabile,
  quantitaEventoMateriaPrima,
  type TotaliPreventivo,
} from "@/lib/calc/preventivo";
import { ottieniImpostazioni } from "./impostazioni";
import { righeDiMenu } from "./menu";
import { righeDiProfilo } from "./profiliBeveraggio";
import { caricaGrafoCalc } from "./ricette";
import { creaClientServer } from "./server";
import type {
  Bevanda,
  CategoriaRigaExtra,
  Cliente,
  Consumabile,
  FoodCostSnapshot,
  MateriaPrima,
  Preventivo,
  PreventivoBeveraggio,
  PreventivoBeveraggioProdotto,
  PreventivoBeveraggioRiga,
  PreventivoRiga,
  Ricetta,
  StatoPreventivo,
  TipoEvento,
} from "./types";
import {
  validaDataFutura,
  validaIntero,
  validaMargine,
  validaQuantita,
  validaTesto,
} from "./validazioni";

// ---------------------------------------------------------------
// Letture
// ---------------------------------------------------------------

export async function elencoPreventivi(tipo?: TipoEvento): Promise<
  Array<Preventivo & { cliente: Pick<Cliente, "nome"> | null }>
> {
  const supabase = await creaClientServer();
  let query = supabase
    .from("preventivo")
    .select("*, cliente(nome)")
    .order("created_at", { ascending: false });
  if (tipo) query = query.eq("tipo", tipo);
  const { data, error } = await query;
  if (error) throw new Error(`Lettura preventivi fallita: ${error.message}`);
  return (data ?? []) as Array<Preventivo & { cliente: Pick<Cliente, "nome"> | null }>;
}

export interface PreventivoCompleto {
  preventivo: Preventivo;
  cliente: Cliente;
  righe: PreventivoRiga[];
  beveraggio: PreventivoBeveraggio | null;
  righeBeveraggio: PreventivoBeveraggioRiga[];
  /** prodotti (bevande) assegnati alle righe di beveraggio (BUG-001: più per categoria) */
  prodottiBeveraggio: PreventivoBeveraggioProdotto[];
}

export async function preventivoCompleto(id: string): Promise<PreventivoCompleto> {
  const supabase = await creaClientServer();
  const { data: preventivo, error } = await supabase
    .from("preventivo")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Preventivo non trovato: ${error.message}`);

  const [clienteRes, righeRes, bevRes] = await Promise.all([
    supabase.from("cliente").select("*").eq("id", preventivo.cliente_id).single(),
    supabase
      .from("preventivo_riga")
      .select("*")
      .eq("preventivo_id", id)
      .order("ordine")
      .order("created_at"),
    supabase
      .from("preventivo_beveraggio")
      .select("*")
      .eq("preventivo_id", id)
      .maybeSingle(),
  ]);
  if (clienteRes.error) throw new Error(clienteRes.error.message);
  if (righeRes.error) throw new Error(righeRes.error.message);
  if (bevRes.error) throw new Error(bevRes.error.message);

  let righeBeveraggio: PreventivoBeveraggioRiga[] = [];
  let prodottiBeveraggio: PreventivoBeveraggioProdotto[] = [];
  if (bevRes.data) {
    const { data, error: erroreRighe } = await supabase
      .from("preventivo_beveraggio_riga")
      .select("*")
      .eq("preventivo_beveraggio_id", bevRes.data.id)
      .order("categoria");
    if (erroreRighe) throw new Error(erroreRighe.message);
    righeBeveraggio = (data ?? []) as PreventivoBeveraggioRiga[];

    if (righeBeveraggio.length > 0) {
      const { data: prodottiData, error: erroreProdotti } = await supabase
        .from("preventivo_beveraggio_prodotto")
        .select("*")
        .in(
          "preventivo_beveraggio_riga_id",
          righeBeveraggio.map((r) => r.id),
        )
        .order("ordine");
      if (erroreProdotti) throw new Error(erroreProdotti.message);
      prodottiBeveraggio = (prodottiData ?? []) as PreventivoBeveraggioProdotto[];
    }
  }

  return {
    preventivo: preventivo as Preventivo,
    cliente: clienteRes.data as Cliente,
    righe: (righeRes.data ?? []) as PreventivoRiga[],
    beveraggio: (bevRes.data ?? null) as PreventivoBeveraggio | null,
    righeBeveraggio,
    prodottiBeveraggio,
  };
}

// ---------------------------------------------------------------
// Creazione (wizard §6.5)
// ---------------------------------------------------------------

export interface InputNuovoPreventivo {
  cliente_id: string;
  tipo: TipoEvento;
  data_evento: string;
  numero_ospiti_adulti: number;
  numero_ospiti_bambini: number;
  margine_target_pct: number;
  menu_id?: string | null;
  profilo_beveraggio_id?: string | null;
}

export async function creaPreventivo(input: InputNuovoPreventivo): Promise<string> {
  validaTesto(input.cliente_id, "cliente");
  validaDataFutura(input.data_evento, "data evento");
  const adulti = validaIntero(input.numero_ospiti_adulti, "ospiti adulti", 0);
  const bambini = validaIntero(input.numero_ospiti_bambini, "ospiti bambini", 0);
  if (adulti + bambini <= 0) throw new Error("Serve almeno un ospite");
  const margine = validaMargine(input.margine_target_pct);

  const impostazioni = await ottieniImpostazioni();
  const sfrido =
    input.tipo === "catering"
      ? impostazioni.sfrido_catering_pct
      : impostazioni.sfrido_privato_pct;

  const supabase = await creaClientServer();
  const { data: preventivo, error } = await supabase
    .from("preventivo")
    .insert({
      cliente_id: input.cliente_id,
      tipo: input.tipo,
      data_evento: input.data_evento,
      numero_ospiti_adulti: adulti,
      numero_ospiti_bambini: bambini,
      margine_target_pct: margine,
      sfrido_pct: sfrido,
      validita_giorni: impostazioni.validita_preventivo_giorni,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Creazione preventivo fallita: ${error.message}`);
  const preventivoId = preventivo.id as string;

  await registraStato(preventivoId, "bozza");

  // righe dal menu template (il preventivo ne fa una copia)
  if (input.menu_id) {
    const righeMenu = await righeDiMenu(input.menu_id);
    if (righeMenu.length > 0) {
      const idRicette = righeMenu.filter((r) => r.ricetta_id).map((r) => r.ricetta_id as string);
      const idMateriePrime = righeMenu
        .filter((r) => r.materia_prima_id)
        .map((r) => r.materia_prima_id as string);
      const idConsumabili = righeMenu
        .filter((r) => r.consumabile_id)
        .map((r) => r.consumabile_id as string);
      const [ricetteRes, materiePrimeRes, consumabiliRes] = await Promise.all([
        idRicette.length > 0
          ? supabase.from("ricetta").select("id, nome").in("id", idRicette)
          : Promise.resolve({ data: [], error: null }),
        idMateriePrime.length > 0
          ? supabase.from("materia_prima").select("id, nome").in("id", idMateriePrime)
          : Promise.resolve({ data: [], error: null }),
        idConsumabili.length > 0
          ? supabase.from("consumabile").select("id, nome").in("id", idConsumabili)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (ricetteRes.error) throw new Error(ricetteRes.error.message);
      if (materiePrimeRes.error) throw new Error(materiePrimeRes.error.message);
      if (consumabiliRes.error) throw new Error(consumabiliRes.error.message);
      const nomiRicette = new Map((ricetteRes.data ?? []).map((r) => [r.id, r.nome]));
      const nomiMateriePrime = new Map((materiePrimeRes.data ?? []).map((r) => [r.id, r.nome]));
      const nomiConsumabili = new Map((consumabiliRes.data ?? []).map((r) => [r.id, r.nome]));
      const { error: erroreRighe } = await supabase.from("preventivo_riga").insert(
        righeMenu.map((r, i) => {
          if (r.ricetta_id) {
            return {
              preventivo_id: preventivoId,
              tipo_riga: "ricetta",
              ricetta_id: r.ricetta_id,
              descrizione: nomiRicette.get(r.ricetta_id) ?? "Ricetta",
              quantita: adulti + bambini,
              ordine: i,
            };
          }
          if (r.consumabile_id) {
            return {
              preventivo_id: preventivoId,
              tipo_riga: "consumabile",
              consumabile_id: r.consumabile_id,
              descrizione: nomiConsumabili.get(r.consumabile_id) ?? "Consumabile",
              // quantita_persona del template: la quantità evento si calcola live
              quantita: r.quantita_persona,
              ordine: i,
            };
          }
          return {
            preventivo_id: preventivoId,
            tipo_riga: "materia_prima",
            materia_prima_id: r.materia_prima_id,
            descrizione: nomiMateriePrime.get(r.materia_prima_id as string) ?? "Materia prima",
            // quantita_persona del template: la quantità evento si calcola live
            quantita: r.quantita_persona,
            ordine: i,
          };
        }),
      );
      if (erroreRighe) throw new Error(erroreRighe.message);
    }
  }

  // configurazione beveraggio, copiata dal profilo scelto
  const { data: bev, error: erroreBev } = await supabase
    .from("preventivo_beveraggio")
    .insert({
      preventivo_id: preventivoId,
      attivo: input.profilo_beveraggio_id != null,
      profilo_origine_id: input.profilo_beveraggio_id ?? null,
      fattore_distribuzione_pct: impostazioni.fattore_distribuzione_pct,
      quota_bibite_bambini_pct: impostazioni.quota_bibite_bambini_pct,
    })
    .select("id")
    .single();
  if (erroreBev) throw new Error(erroreBev.message);

  if (input.profilo_beveraggio_id) {
    const righeProfilo = await righeDiProfilo(input.profilo_beveraggio_id);
    if (righeProfilo.length > 0) {
      const { error: erroreRigheBev } = await supabase
        .from("preventivo_beveraggio_riga")
        .insert(
          righeProfilo.map((r) => ({
            preventivo_beveraggio_id: bev.id,
            categoria: r.categoria,
            quantita_a_testa: r.quantita_a_testa,
            unita: r.unita,
            quantita_a_testa_ora: r.quantita_a_testa_ora,
          })),
        );
      if (erroreRigheBev) throw new Error(erroreRigheBev.message);
    }
  }

  return preventivoId;
}

// ---------------------------------------------------------------
// Modifiche (solo su bozze: invariante di immutabilità)
// ---------------------------------------------------------------

async function verificaBozza(preventivoId: string): Promise<Preventivo> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("preventivo")
    .select("*")
    .eq("id", preventivoId)
    .single();
  if (error) throw new Error(`Preventivo non trovato: ${error.message}`);
  if ((data as Preventivo).stato !== "bozza") {
    throw new Error(
      "Preventivo non modificabile: è stato inviato. Crea una revisione.",
    );
  }
  return data as Preventivo;
}

export interface CampiPreventivoModificabili {
  data_evento?: string;
  numero_ospiti_adulti?: number;
  numero_ospiti_bambini?: number;
  margine_target_pct?: number;
  sfrido_pct?: number;
  prezzo_totale_cent?: number | null;
  validita_giorni?: number;
  note_cliente?: string | null;
  condizioni?: string | null;
}

export async function aggiornaPreventivo(
  id: string,
  campi: CampiPreventivoModificabili,
): Promise<void> {
  await verificaBozza(id);
  if (campi.margine_target_pct != null) validaMargine(campi.margine_target_pct);
  if (campi.data_evento != null) validaDataFutura(campi.data_evento, "data evento");
  const supabase = await creaClientServer();
  const { error } = await supabase.from("preventivo").update(campi).eq("id", id);
  if (error) throw new Error(`Aggiornamento preventivo fallito: ${error.message}`);
}

/** Elimina un preventivo ancora in bozza (mai inviato: nessuno snapshot,
 * nessuno storico da preservare — non è tra le entità a soft delete
 * dell'invariante 3). Le righe/beveraggio collegati si eliminano a cascata. */
export async function eliminaPreventivo(id: string): Promise<void> {
  await verificaBozza(id);
  const supabase = await creaClientServer();
  const { error } = await supabase.from("preventivo").delete().eq("id", id);
  if (error) throw new Error(`Eliminazione preventivo fallita: ${error.message}`);
}

export async function aggiungiRigaRicetta(
  preventivoId: string,
  ricettaId: string,
  descrizione: string,
  porzioni: number,
): Promise<void> {
  await verificaBozza(preventivoId);
  validaQuantita(porzioni, "porzioni");
  const supabase = await creaClientServer();
  const { error } = await supabase.from("preventivo_riga").insert({
    preventivo_id: preventivoId,
    tipo_riga: "ricetta",
    ricetta_id: ricettaId,
    descrizione: validaTesto(descrizione, "descrizione"),
    quantita: porzioni,
  });
  if (error) throw new Error(`Aggiunta riga fallita: ${error.message}`);
}

/** FEATURE-017: materia prima inserita direttamente, senza ricetta (frutta,
 * olive, patatine). quantitaPersona è a persona, nell'unità d'uso della
 * materia prima: la quantità evento si calcola live in calcolaPreventivo. */
export async function aggiungiRigaMateriaPrima(
  preventivoId: string,
  materiaPrimaId: string,
  descrizione: string,
  quantitaPersona: number,
): Promise<void> {
  await verificaBozza(preventivoId);
  validaQuantita(quantitaPersona, "quantità a persona");
  const supabase = await creaClientServer();
  const { error } = await supabase.from("preventivo_riga").insert({
    preventivo_id: preventivoId,
    tipo_riga: "materia_prima",
    materia_prima_id: materiaPrimaId,
    descrizione: validaTesto(descrizione, "descrizione"),
    quantita: quantitaPersona,
  });
  if (error) throw new Error(`Aggiunta riga materia prima fallita: ${error.message}`);
}

/** FEATURE-018: consumabile inserito direttamente, senza ricetta (piatti,
 * bicchieri, posate). quantitaPersona è a persona, nell'unità d'uso del
 * consumabile: la quantità evento si calcola live in calcolaPreventivo, SENZA
 * sfrido (a differenza della riga materia prima). */
export async function aggiungiRigaConsumabile(
  preventivoId: string,
  consumabileId: string,
  descrizione: string,
  quantitaPersona: number,
): Promise<void> {
  await verificaBozza(preventivoId);
  validaQuantita(quantitaPersona, "quantità a persona");
  const supabase = await creaClientServer();
  const { error } = await supabase.from("preventivo_riga").insert({
    preventivo_id: preventivoId,
    tipo_riga: "consumabile",
    consumabile_id: consumabileId,
    descrizione: validaTesto(descrizione, "descrizione"),
    quantita: quantitaPersona,
  });
  if (error) throw new Error(`Aggiunta riga consumabile fallita: ${error.message}`);
}

export async function aggiungiRigaExtra(
  preventivoId: string,
  categoria: CategoriaRigaExtra,
  descrizione: string,
  quantita: number,
  costoUnitarioCent: number,
  prezzoUnitarioCent: number | null,
): Promise<void> {
  await verificaBozza(preventivoId);
  validaQuantita(quantita, "quantità");
  const supabase = await creaClientServer();
  const { error } = await supabase.from("preventivo_riga").insert({
    preventivo_id: preventivoId,
    tipo_riga: "extra",
    categoria_extra: categoria,
    descrizione: validaTesto(descrizione, "descrizione"),
    quantita,
    costo_unitario_cent: costoUnitarioCent,
    prezzo_unitario_cent: prezzoUnitarioCent,
  });
  if (error) throw new Error(`Aggiunta riga extra fallita: ${error.message}`);
}

export async function aggiornaRiga(
  rigaId: string,
  campi: Partial<
    Pick<
      PreventivoRiga,
      | "quantita"
      | "prezzo_unitario_cent"
      | "costo_unitario_cent"
      | "descrizione"
      | "escludi_opzionali"
      | "ordine"
    >
  >,
): Promise<void> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("preventivo_riga")
    .select("preventivo_id")
    .eq("id", rigaId)
    .single();
  if (error) throw new Error(`Riga non trovata: ${error.message}`);
  await verificaBozza(data.preventivo_id as string);
  if (campi.quantita != null) validaQuantita(campi.quantita, "quantità");
  const { error: erroreUpdate } = await supabase
    .from("preventivo_riga")
    .update(campi)
    .eq("id", rigaId);
  if (erroreUpdate) throw new Error(`Aggiornamento riga fallito: ${erroreUpdate.message}`);
}

export async function rimuoviRiga(rigaId: string): Promise<void> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("preventivo_riga")
    .select("preventivo_id")
    .eq("id", rigaId)
    .single();
  if (error) throw new Error(`Riga non trovata: ${error.message}`);
  await verificaBozza(data.preventivo_id as string);
  const { error: erroreDelete } = await supabase
    .from("preventivo_riga")
    .delete()
    .eq("id", rigaId);
  if (erroreDelete) throw new Error(`Rimozione riga fallita: ${erroreDelete.message}`);
}

export async function aggiornaBeveraggio(
  preventivoId: string,
  campi: Partial<
    Pick<
      PreventivoBeveraggio,
      | "attivo"
      | "ore_servizio"
      | "fattore_distribuzione_pct"
      | "quota_bibite_bambini_pct"
      | "correttivo_stagione_calda"
      | "correttivo_evento_lungo"
      | "correttivo_pubblico"
      | "esposizione"
    >
  >,
): Promise<void> {
  await verificaBozza(preventivoId);
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("preventivo_beveraggio")
    .update(campi)
    .eq("preventivo_id", preventivoId);
  if (error) throw new Error(`Aggiornamento beveraggio fallito: ${error.message}`);
}

/** Imposta la quantità teorica a testa di una categoria (il "quanto ce ne
 * vuole"); l'assegnazione dei prodotti che la coprono è gestita a parte da
 * aggiungiProdottoBeveraggio/rimuoviProdottoBeveraggio (BUG-001). */
export async function impostaRigaBeveraggio(
  preventivoId: string,
  categoria: PreventivoBeveraggioRiga["categoria"],
  campi: {
    quantita_a_testa: number;
    unita: PreventivoBeveraggioRiga["unita"];
    quantita_a_testa_ora?: number;
  },
): Promise<void> {
  await verificaBozza(preventivoId);
  if (!Number.isFinite(campi.quantita_a_testa) || campi.quantita_a_testa < 0) {
    throw new Error(`Quantità a testa non valida: ${campi.quantita_a_testa}`);
  }
  const supabase = await creaClientServer();
  const { data: bev, error } = await supabase
    .from("preventivo_beveraggio")
    .select("id")
    .eq("preventivo_id", preventivoId)
    .single();
  if (error) throw new Error(`Beveraggio non trovato: ${error.message}`);

  // se la riga esiste già e ha prodotti assegnati, l'unità non può cambiare
  // sotto di loro (mai conversioni implicite, invariante 5): senza questo
  // controllo il salvataggio della riga può disallineare silenziosamente
  // unita dalla bevanda già coperta da aggiungiProdottoBeveraggio, che
  // valida solo al momento dell'assegnazione.
  const { data: rigaEsistente, error: erroreRiga } = await supabase
    .from("preventivo_beveraggio_riga")
    .select("id")
    .eq("preventivo_beveraggio_id", bev.id)
    .eq("categoria", categoria)
    .maybeSingle();
  if (erroreRiga) throw new Error(erroreRiga.message);
  if (rigaEsistente) {
    const { data: prodotti, error: erroreProdotti } = await supabase
      .from("preventivo_beveraggio_prodotto")
      .select("bevanda_id")
      .eq("preventivo_beveraggio_riga_id", rigaEsistente.id);
    if (erroreProdotti) throw new Error(erroreProdotti.message);
    const bevandaIds = (prodotti ?? []).map((p) => p.bevanda_id);
    if (bevandaIds.length > 0) {
      const { data: bevandeAssegnate, error: erroreBevande } = await supabase
        .from("bevanda")
        .select("nome, unita")
        .in("id", bevandaIds);
      if (erroreBevande) throw new Error(erroreBevande.message);
      const incoerente = (bevandeAssegnate ?? []).find((b) => b.unita !== campi.unita);
      if (incoerente) {
        throw new Error(
          `Impossibile cambiare unità per ${categoria}: il prodotto "${incoerente.nome}" già assegnato è in ${incoerente.unita}, non ${campi.unita}`,
        );
      }
    }
  }

  const { error: erroreUpsert } = await supabase
    .from("preventivo_beveraggio_riga")
    .upsert(
      {
        preventivo_beveraggio_id: bev.id,
        categoria,
        quantita_a_testa: campi.quantita_a_testa,
        unita: campi.unita,
        quantita_a_testa_ora: campi.quantita_a_testa_ora ?? 0,
      },
      { onConflict: "preventivo_beveraggio_id,categoria" },
    );
  if (erroreUpsert) throw new Error(`Salvataggio riga beveraggio fallito: ${erroreUpsert.message}`);
}

/** FEATURE-016: sostituisce (o azzera, con valore null) il calcolo automatico
 * del "corretto" per una singola riga già esistente. Il teorico resta sempre
 * quello calcolato: qui si tocca solo il valore finale usato per prezzare. */
export async function impostaCorrezioneBeveraggio(
  preventivoId: string,
  rigaId: string,
  valore: number | null,
): Promise<void> {
  await verificaBozza(preventivoId);
  if (valore != null && (!Number.isFinite(valore) || valore < 0)) {
    throw new Error(`Valore corretto non valido: ${valore}`);
  }
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("preventivo_beveraggio_riga")
    .update({ volume_corretto_override: valore })
    .eq("id", rigaId);
  if (error) throw new Error(`Salvataggio correzione beveraggio fallito: ${error.message}`);
}

export async function rimuoviRigaBeveraggio(
  preventivoId: string,
  rigaId: string,
): Promise<void> {
  await verificaBozza(preventivoId);
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("preventivo_beveraggio_riga")
    .delete()
    .eq("id", rigaId);
  if (error) throw new Error(`Rimozione riga beveraggio fallita: ${error.message}`);
}

const TOLLERANZA_QUOTA_PCT = 1e-6;

/** BUG-001/BUG-002: assegna un prodotto a una riga di beveraggio con la
 * quota di quantità che copre. Valida che la somma delle quote non superi
 * 100 e che l'unità del prodotto coincida con quella della riga (mai
 * conversioni implicite, invariante 5) prima di scrivere su DB. */
export async function aggiungiProdottoBeveraggio(
  preventivoId: string,
  rigaId: string,
  bevandaId: string,
  quotaPct: number,
): Promise<void> {
  await verificaBozza(preventivoId);
  if (!Number.isFinite(quotaPct) || quotaPct <= 0 || quotaPct > 100) {
    throw new Error(`Quota non valida: ${quotaPct}`);
  }
  const supabase = await creaClientServer();
  const [rigaRes, bevandaRes, esistentiRes] = await Promise.all([
    supabase
      .from("preventivo_beveraggio_riga")
      .select("id, categoria, unita")
      .eq("id", rigaId)
      .single(),
    supabase.from("bevanda").select("id, nome, unita").eq("id", bevandaId).single(),
    supabase
      .from("preventivo_beveraggio_prodotto")
      .select("quota_pct")
      .eq("preventivo_beveraggio_riga_id", rigaId),
  ]);
  if (rigaRes.error) throw new Error(`Riga beveraggio non trovata: ${rigaRes.error.message}`);
  if (bevandaRes.error) throw new Error(`Bevanda non trovata: ${bevandaRes.error.message}`);
  if (esistentiRes.error) throw new Error(esistentiRes.error.message);

  if (bevandaRes.data.unita !== rigaRes.data.unita) {
    throw new Error(
      `Impossibile assegnare "${bevandaRes.data.nome}" (unità ${bevandaRes.data.unita}) a una riga di ${rigaRes.data.categoria} in ${rigaRes.data.unita}`,
    );
  }
  const quotaEsistente = (esistentiRes.data ?? []).reduce(
    (somma, p) => somma + Number(p.quota_pct),
    0,
  );
  if (quotaEsistente + quotaPct > 100 + TOLLERANZA_QUOTA_PCT) {
    throw new Error(
      `Quota totale oltre il 100% per ${rigaRes.data.categoria}: già assegnato ${quotaEsistente}%, richiesto altro ${quotaPct}%`,
    );
  }

  const { error } = await supabase.from("preventivo_beveraggio_prodotto").insert({
    preventivo_beveraggio_riga_id: rigaId,
    bevanda_id: bevandaId,
    quota_pct: quotaPct,
  });
  if (error) throw new Error(`Assegnazione prodotto fallita: ${error.message}`);
}

/** Modifica la quota di un prodotto già assegnato (fix UX del 20/08/2026:
 * prima l'unico modo di correggerla era rimuovere e reinserire il prodotto,
 * e con la quota esaurita il modulo di aggiunta spariva del tutto). Stessa
 * validazione dell'inserimento: la somma delle quote della categoria non può
 * superare 100, escludendo dal conteggio il prodotto che si sta modificando. */
export async function aggiornaQuotaProdottoBeveraggio(
  preventivoId: string,
  prodottoId: string,
  quotaPct: number,
): Promise<void> {
  await verificaBozza(preventivoId);
  if (!Number.isFinite(quotaPct) || quotaPct <= 0 || quotaPct > 100) {
    throw new Error(`Quota non valida: ${quotaPct}`);
  }
  const supabase = await creaClientServer();
  const { data: prodotto, error: erroreProdotto } = await supabase
    .from("preventivo_beveraggio_prodotto")
    .select("id, preventivo_beveraggio_riga_id")
    .eq("id", prodottoId)
    .single();
  if (erroreProdotto) {
    throw new Error(`Prodotto beveraggio non trovato: ${erroreProdotto.message}`);
  }
  const { data: fratelli, error: erroreFratelli } = await supabase
    .from("preventivo_beveraggio_prodotto")
    .select("id, quota_pct")
    .eq("preventivo_beveraggio_riga_id", prodotto.preventivo_beveraggio_riga_id)
    .neq("id", prodottoId);
  if (erroreFratelli) throw new Error(erroreFratelli.message);
  const quotaAltri = (fratelli ?? []).reduce((somma, p) => somma + Number(p.quota_pct), 0);
  if (quotaAltri + quotaPct > 100 + TOLLERANZA_QUOTA_PCT) {
    throw new Error(
      `Quota totale oltre il 100%: gli altri prodotti coprono già ${quotaAltri}%, resta disponibile ${Math.round((100 - quotaAltri) * 100) / 100}%`,
    );
  }
  const { error } = await supabase
    .from("preventivo_beveraggio_prodotto")
    .update({ quota_pct: quotaPct })
    .eq("id", prodottoId);
  if (error) throw new Error(`Aggiornamento quota fallito: ${error.message}`);
}

export async function rimuoviProdottoBeveraggio(
  preventivoId: string,
  prodottoId: string,
): Promise<void> {
  await verificaBozza(preventivoId);
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("preventivo_beveraggio_prodotto")
    .delete()
    .eq("id", prodottoId);
  if (error) throw new Error(`Rimozione prodotto fallita: ${error.message}`);
}

// ---------------------------------------------------------------
// Calcolo (bozza: live; inviato: da snapshot)
// ---------------------------------------------------------------

export interface CalcoloPreventivo {
  dati: PreventivoCompleto;
  /** costo unitario per riga (live per bozze, da snapshot per inviati) */
  costiRigheCent: Map<string, number | null>;
  /** quantità effettivamente usata nel calcolo: per righe ricetta/extra è
   * riga.quantita; per righe materia_prima (FEATURE-017) è la quantità
   * evento già scalata (a persona × ospiti × (1+sfrido%), §5) */
  quantitaEffettivaRighe: Map<string, number>;
  beveraggio: RisultatoBeveraggio | null;
  /** BUG-002: messaggio se il calcolo del beveraggio è fallito (dato incoerente
   * già salvato); la pagina resta apribile e mostra le righe grezze per
   * permettere all'utente di correggerle senza intervento diretto sul DB. */
  erroreBeveraggio: string | null;
  totali: TotaliPreventivo;
  /** bevande disponibili per categoria (per la UI) */
  bevande: Bevanda[];
  /** materie prime (incluse soft-deleted, referenziate da righe storiche) per la UI */
  materiePrime: MateriaPrima[];
  /** consumabili (incluse soft-deleted, referenziate da righe storiche) per la UI */
  consumabili: Consumabile[];
  /** CL-1: ricette (incluse soft-deleted, referenziate da righe storiche) —
   * servono la `categoria_portata` su cui la pagina e il PDF raggruppano le
   * righe; non entrano in nessun calcolo di costo */
  ricette: Ricetta[];
}

export async function calcolaPreventivo(id: string): Promise<CalcoloPreventivo> {
  const dati = await preventivoCompleto(id);
  const { preventivo, righe, beveraggio, righeBeveraggio, prodottiBeveraggio } = dati;
  const supabase = await creaClientServer();
  const [bevandeRes, materiePrimeRes, consumabiliRes, ricetteRes] = await Promise.all([
    supabase.from("bevanda").select("*"),
    supabase.from("materia_prima").select("*"),
    supabase.from("consumabile").select("*"),
    supabase.from("ricetta").select("*"),
  ]);
  if (bevandeRes.error) throw new Error(bevandeRes.error.message);
  if (materiePrimeRes.error) throw new Error(materiePrimeRes.error.message);
  if (consumabiliRes.error) throw new Error(consumabiliRes.error.message);
  if (ricetteRes.error) throw new Error(ricetteRes.error.message);
  const bevande = (bevandeRes.data ?? []) as Bevanda[];
  const bevandePerId = new Map(bevande.map((b) => [b.id, b]));
  const materiePrime = (materiePrimeRes.data ?? []) as MateriaPrima[];
  const consumabili = (consumabiliRes.data ?? []) as Consumabile[];
  const ricette = (ricetteRes.data ?? []) as Ricetta[];

  const eBozza = preventivo.stato === "bozza";
  const snapshot = preventivo.food_cost_snapshot;

  // costi delle righe
  const costiRigheCent = new Map<string, number | null>();
  const quantitaEffettivaRighe = new Map<string, number>();
  const ospitiTotali = preventivo.numero_ospiti_adulti + preventivo.numero_ospiti_bambini;
  const materiePrimePerId = new Map(materiePrime.map((mp) => [mp.id, mp]));
  const consumabiliPerId = new Map(consumabili.map((c) => [c.id, c]));
  let grafo: Awaited<ReturnType<typeof caricaGrafoCalc>> | null = null;
  for (const riga of righe) {
    if (riga.tipo_riga === "extra") {
      costiRigheCent.set(riga.id, riga.costo_unitario_cent);
      quantitaEffettivaRighe.set(riga.id, Number(riga.quantita));
      continue;
    }
    if (riga.tipo_riga === "materia_prima") {
      const quantitaEvento = quantitaEventoMateriaPrima(
        Number(riga.quantita),
        ospitiTotali,
        Number(preventivo.sfrido_pct),
      );
      quantitaEffettivaRighe.set(riga.id, quantitaEvento);
      if (eBozza) {
        const mp = materiePrimePerId.get(riga.materia_prima_id!);
        if (!mp) {
          throw new Error(`Materia prima non trovata per la riga "${riga.descrizione}"`);
        }
        costiRigheCent.set(
          riga.id,
          costoUnitaUsoCent({
            prezzoAcquistoCent: Number(mp.prezzo_acquisto_cent),
            fattoreConversione: Number(mp.fattore_conversione),
            resaPercentuale: Number(mp.resa_percentuale),
          }),
        );
      } else {
        const congelato = snapshot?.righe.find((r) => r.riga_id === riga.id);
        costiRigheCent.set(riga.id, congelato?.costo_unitario_cent ?? riga.costo_unitario_cent);
      }
      continue;
    }
    if (riga.tipo_riga === "consumabile") {
      // FEATURE-018: nessuno sfrido, a differenza della riga materia prima
      const quantitaEvento = quantitaEventoConsumabile(Number(riga.quantita), ospitiTotali);
      quantitaEffettivaRighe.set(riga.id, quantitaEvento);
      if (eBozza) {
        const c = consumabiliPerId.get(riga.consumabile_id!);
        if (!c) {
          throw new Error(`Consumabile non trovato per la riga "${riga.descrizione}"`);
        }
        costiRigheCent.set(
          riga.id,
          costoUnitaUsoCent({
            prezzoAcquistoCent: Number(c.prezzo_acquisto_cent),
            fattoreConversione: Number(c.fattore_conversione),
            resaPercentuale: 100,
          }),
        );
      } else {
        const congelato = snapshot?.righe.find((r) => r.riga_id === riga.id);
        costiRigheCent.set(riga.id, congelato?.costo_unitario_cent ?? riga.costo_unitario_cent);
      }
      continue;
    }
    // tipo_riga === "ricetta"
    quantitaEffettivaRighe.set(riga.id, Number(riga.quantita));
    if (eBozza) {
      grafo ??= await caricaGrafoCalc();
      costiRigheCent.set(
        riga.id,
        costoPorzioneCent(riga.ricetta_id!, grafo.ricette, grafo.materiePrime, {
          includiOpzionali: !riga.escludi_opzionali,
        }),
      );
    } else {
      const congelato = snapshot?.righe.find((r) => r.riga_id === riga.id);
      costiRigheCent.set(riga.id, congelato?.costo_unitario_cent ?? riga.costo_unitario_cent);
    }
  }

  // beveraggio (BUG-001: più prodotti possono coprire la stessa categoria)
  const prodottiPerRiga = new Map<string, typeof prodottiBeveraggio>();
  for (const p of prodottiBeveraggio) {
    if (!prodottiPerRiga.has(p.preventivo_beveraggio_riga_id)) {
      prodottiPerRiga.set(p.preventivo_beveraggio_riga_id, []);
    }
    prodottiPerRiga.get(p.preventivo_beveraggio_riga_id)!.push(p);
  }

  let risultatoBeveraggio: RisultatoBeveraggio | null = null;
  let erroreBeveraggio: string | null = null;
  if (beveraggio?.attivo && righeBeveraggio.length > 0) {
    try {
      const righeInput: RigaBeveraggioInput[] = righeBeveraggio.map((r) => {
        const assegnati = prodottiPerRiga.get(r.id) ?? [];
        const prodottiInput = assegnati.flatMap((assegnato) => {
          const bevanda = bevandePerId.get(assegnato.bevanda_id);
          if (!bevanda) return [];
          let bevandaCalc = bevanda;
          // per i preventivi inviati i prezzi vengono dallo snapshot, non dal listino corrente
          if (!eBozza && snapshot?.beveraggio) {
            const congelata = snapshot.beveraggio.righe.find(
              (s) => s.categoria === r.categoria && s.bevanda_id === assegnato.bevanda_id,
            );
            if (congelata?.prezzo_unitario_cent != null) {
              bevandaCalc = {
                ...bevanda,
                prezzo_unitario_cent: congelata.prezzo_unitario_cent,
                capacita_unitaria: congelata.capacita_unitaria ?? bevanda.capacita_unitaria,
                unita_per_collo: congelata.unita_per_collo ?? bevanda.unita_per_collo,
              };
            }
          }
          return [
            {
              bevanda: {
                id: bevandaCalc.id,
                nome: bevandaCalc.nome,
                capacitaUnitaria: Number(bevandaCalc.capacita_unitaria),
                unita: bevandaCalc.unita,
                unitaPerCollo: Number(bevandaCalc.unita_per_collo),
                prezzoUnitarioCent: Number(bevandaCalc.prezzo_unitario_cent),
              },
              quotaPct: Number(assegnato.quota_pct),
            },
          ];
        });
        return {
          categoria: r.categoria,
          quantitaATesta: Number(r.quantita_a_testa),
          unita: r.unita,
          quantitaATestaOra: Number(r.quantita_a_testa_ora),
          prodotti: prodottiInput,
          volumeCorrettoOverride:
            r.volume_corretto_override != null ? Number(r.volume_corretto_override) : null,
        };
      });
      risultatoBeveraggio = calcolaBeveraggio(righeInput, {
        ospitiAdulti: preventivo.numero_ospiti_adulti,
        ospitiBambini: preventivo.numero_ospiti_bambini,
        oreServizio: Number(beveraggio.ore_servizio),
        fattoreDistribuzionePct: Number(beveraggio.fattore_distribuzione_pct),
        quotaBibiteBambiniPct: Number(beveraggio.quota_bibite_bambini_pct),
        correttivoStagioneCalda: beveraggio.correttivo_stagione_calda,
        correttivoEventoLungo: beveraggio.correttivo_evento_lungo,
        correttivoPubblico: beveraggio.correttivo_pubblico,
      });
    } catch (e) {
      erroreBeveraggio = (e as Error).message;
    }
  }

  const costoBeveraggioCent =
    !eBozza && snapshot?.beveraggio
      ? snapshot.beveraggio.costo_totale_cent
      : risultatoBeveraggio?.costoTotaleCent ?? 0;

  const totali = calcolaTotaliPreventivo({
    righe: righe.map((r) => ({
      tipoRiga: r.tipo_riga,
      quantita: quantitaEffettivaRighe.get(r.id) ?? Number(r.quantita),
      costoUnitarioCent: costiRigheCent.get(r.id) ?? null,
      prezzoUnitarioCent:
        r.prezzo_unitario_cent != null ? Number(r.prezzo_unitario_cent) : null,
    })),
    costoBeveraggioCent,
    prezzoBeveraggioCent: 0,
    margineTargetPct: Number(preventivo.margine_target_pct),
  });

  return {
    dati,
    costiRigheCent,
    quantitaEffettivaRighe,
    beveraggio: risultatoBeveraggio,
    erroreBeveraggio,
    totali,
    bevande,
    materiePrime,
    consumabili,
    ricette,
  };
}

// ---------------------------------------------------------------
// Stati e snapshot (invarianti 1 e 2)
// ---------------------------------------------------------------

async function registraStato(preventivoId: string, stato: StatoPreventivo) {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("preventivo_stato_storico")
    .insert({ preventivo_id: preventivoId, stato });
  if (error) throw new Error(`Registrazione stato fallita: ${error.message}`);
}

/**
 * Passaggio bozza -> inviato: congela il food_cost_snapshot (costi unitari di
 * ogni riga, beveraggio incluso). Da qui il preventivo è immutabile.
 */
export async function inviaPreventivo(id: string): Promise<void> {
  const preventivo = await verificaBozza(id);
  const calcolo = await calcolaPreventivo(id);
  if (calcolo.erroreBeveraggio) {
    throw new Error(
      `Impossibile inviare: risolvi prima il beveraggio (${calcolo.erroreBeveraggio})`,
    );
  }

  const snapshot: FoodCostSnapshot = {
    congelato_at: new Date().toISOString(),
    righe: calcolo.dati.righe.map((r) => ({
      riga_id: r.id,
      costo_unitario_cent: arrotondaCentesimi(calcolo.costiRigheCent.get(r.id) ?? 0),
    })),
    beveraggio: calcolo.beveraggio
      ? {
          costo_totale_cent: calcolo.beveraggio.costoTotaleCent,
          // una riga per prodotto assegnato (BUG-001: più prodotti per categoria)
          righe: calcolo.beveraggio.righe.flatMap((r) =>
            r.prodotti.map((p) => ({
              categoria: r.categoria,
              bevanda_id: p.bevanda.id,
              quota_pct: p.quotaPct,
              prezzo_unitario_cent: p.bevanda.prezzoUnitarioCent,
              capacita_unitaria: p.bevanda.capacitaUnitaria,
              unita_per_collo: p.bevanda.unitaPerCollo,
              colli: p.colli,
              costo_cent: p.costoCent,
            })),
          ),
        }
      : null,
  };

  const supabase = await creaClientServer();
  // congela i costi unitari anche sulle righe
  for (const riga of snapshot.righe) {
    const { error } = await supabase
      .from("preventivo_riga")
      .update({ costo_unitario_cent: riga.costo_unitario_cent })
      .eq("id", riga.riga_id);
    if (error) throw new Error(`Congelamento riga fallito: ${error.message}`);
  }
  const { error } = await supabase
    .from("preventivo")
    .update({
      stato: "inviato",
      food_cost_snapshot: snapshot,
      inviato_at: new Date().toISOString(),
      prezzo_totale_cent:
        preventivo.prezzo_totale_cent ?? calcolo.totali.prezzoTotaleCent,
    })
    .eq("id", id);
  if (error) throw new Error(`Invio preventivo fallito: ${error.message}`);
  await registraStato(id, "inviato");
}

/**
 * Riapre un preventivo non più in bozza riportandolo a bozza modificabile.
 * È una deroga esplicita all'invariante 1 (immutabilità dei preventivi inviati),
 * decisa con l'utente il 20/08/2026: lo snapshot dei costi viene azzerato, quindi
 * da qui il preventivo torna a ricalcolare tutto live sui prezzi correnti, come
 * una bozza qualunque. La traccia del passaggio resta in `preventivo_stato_storico`.
 * L'alternativa non distruttiva resta `duplicaPreventivo(id, true)` (revisione).
 */
export async function riapriPreventivo(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("preventivo")
    .select("stato")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Preventivo non trovato: ${error.message}`);
  if ((data.stato as StatoPreventivo) === "bozza") {
    throw new Error("Il preventivo è già in bozza: si modifica direttamente");
  }

  // i costi congelati sulle righe tornano nulli; le righe extra conservano il
  // proprio costo unitario, che è un dato inserito a mano e non un congelamento
  // (stessa distinzione fatta in duplicaPreventivo)
  const { error: erroreRighe } = await supabase
    .from("preventivo_riga")
    .update({ costo_unitario_cent: null })
    .eq("preventivo_id", id)
    .neq("tipo_riga", "extra");
  if (erroreRighe) throw new Error(`Riapertura righe fallita: ${erroreRighe.message}`);

  const { error: erroreUpdate } = await supabase
    .from("preventivo")
    .update({ stato: "bozza", food_cost_snapshot: null, inviato_at: null })
    .eq("id", id);
  if (erroreUpdate) throw new Error(`Riapertura fallita: ${erroreUpdate.message}`);
  await registraStato(id, "bozza");
}

const TRANSIZIONI_AMMESSE: Record<StatoPreventivo, StatoPreventivo[]> = {
  bozza: ["inviato"],
  inviato: ["confermato", "rifiutato", "scaduto"],
  confermato: [],
  rifiutato: [],
  scaduto: [],
};

export async function cambiaStatoPreventivo(
  id: string,
  nuovoStato: StatoPreventivo,
): Promise<void> {
  if (nuovoStato === "inviato") {
    await inviaPreventivo(id);
    return;
  }
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("preventivo")
    .select("stato")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Preventivo non trovato: ${error.message}`);
  const corrente = data.stato as StatoPreventivo;
  if (!TRANSIZIONI_AMMESSE[corrente].includes(nuovoStato)) {
    throw new Error(`Transizione di stato non ammessa: ${corrente} -> ${nuovoStato}`);
  }
  const { error: erroreUpdate } = await supabase
    .from("preventivo")
    .update({ stato: nuovoStato })
    .eq("id", id);
  if (erroreUpdate) throw new Error(`Cambio stato fallito: ${erroreUpdate.message}`);
  await registraStato(id, nuovoStato);
}

/**
 * Copia un preventivo come nuova bozza. Con `comeRevisione` la copia mantiene
 * il legame `revisione_di_id` (aggiornamento di un preventivo inviato).
 */
export async function duplicaPreventivo(
  id: string,
  comeRevisione = false,
): Promise<string> {
  const { preventivo, righe, beveraggio, righeBeveraggio, prodottiBeveraggio } =
    await preventivoCompleto(id);
  if (comeRevisione && preventivo.stato === "bozza") {
    throw new Error("Le bozze si modificano direttamente: nessuna revisione necessaria");
  }
  const supabase = await creaClientServer();
  const { data: nuovo, error } = await supabase
    .from("preventivo")
    .insert({
      cliente_id: preventivo.cliente_id,
      tipo: preventivo.tipo,
      data_evento: preventivo.data_evento,
      numero_ospiti_adulti: preventivo.numero_ospiti_adulti,
      numero_ospiti_bambini: preventivo.numero_ospiti_bambini,
      margine_target_pct: preventivo.margine_target_pct,
      sfrido_pct: preventivo.sfrido_pct,
      prezzo_totale_cent: preventivo.prezzo_totale_cent,
      validita_giorni: preventivo.validita_giorni,
      note_cliente: preventivo.note_cliente,
      condizioni: preventivo.condizioni,
      revisione_di_id: comeRevisione ? preventivo.id : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Duplicazione fallita: ${error.message}`);
  const nuovoId = nuovo.id as string;
  await registraStato(nuovoId, "bozza");

  if (righe.length > 0) {
    const { error: erroreRighe } = await supabase.from("preventivo_riga").insert(
      righe.map((r) => ({
        preventivo_id: nuovoId,
        tipo_riga: r.tipo_riga,
        ricetta_id: r.ricetta_id,
        materia_prima_id: r.materia_prima_id,
        consumabile_id: r.consumabile_id,
        categoria_extra: r.categoria_extra,
        descrizione: r.descrizione,
        quantita: r.quantita,
        // le bozze ricalcolano live: il costo congelato non si copia sulle righe ricetta/materia prima
        costo_unitario_cent: r.tipo_riga === "extra" ? r.costo_unitario_cent : null,
        prezzo_unitario_cent: r.prezzo_unitario_cent,
        escludi_opzionali: r.escludi_opzionali,
        ordine: r.ordine,
      })),
    );
    if (erroreRighe) throw new Error(erroreRighe.message);
  }

  if (beveraggio) {
    const { data: nuovoBev, error: erroreBev } = await supabase
      .from("preventivo_beveraggio")
      .insert({
        preventivo_id: nuovoId,
        attivo: beveraggio.attivo,
        profilo_origine_id: beveraggio.profilo_origine_id,
        ore_servizio: beveraggio.ore_servizio,
        fattore_distribuzione_pct: beveraggio.fattore_distribuzione_pct,
        quota_bibite_bambini_pct: beveraggio.quota_bibite_bambini_pct,
        correttivo_stagione_calda: beveraggio.correttivo_stagione_calda,
        correttivo_evento_lungo: beveraggio.correttivo_evento_lungo,
        correttivo_pubblico: beveraggio.correttivo_pubblico,
        esposizione: beveraggio.esposizione,
      })
      .select("id")
      .single();
    if (erroreBev) throw new Error(erroreBev.message);
    if (righeBeveraggio.length > 0) {
      const { data: nuoveRighe, error: erroreRigheBev } = await supabase
        .from("preventivo_beveraggio_riga")
        .insert(
          righeBeveraggio.map((r) => ({
            preventivo_beveraggio_id: nuovoBev.id,
            categoria: r.categoria,
            quantita_a_testa: r.quantita_a_testa,
            unita: r.unita,
            quantita_a_testa_ora: r.quantita_a_testa_ora,
            volume_corretto_override: r.volume_corretto_override,
          })),
        )
        .select("id, categoria");
      if (erroreRigheBev) throw new Error(erroreRigheBev.message);

      // BUG-001: copia anche i prodotti assegnati a ogni riga, rilegandoli
      // alla nuova riga con la stessa categoria (categoria è unica per riga)
      const nuovaRigaIdPerCategoria = new Map(
        (nuoveRighe ?? []).map((r) => [r.categoria, r.id as string]),
      );
      const prodottiDaCopiare = prodottiBeveraggio.flatMap((p) => {
        const rigaOrigine = righeBeveraggio.find(
          (r) => r.id === p.preventivo_beveraggio_riga_id,
        );
        const nuovaRigaId = rigaOrigine
          ? nuovaRigaIdPerCategoria.get(rigaOrigine.categoria)
          : undefined;
        if (!nuovaRigaId) return [];
        return [
          {
            preventivo_beveraggio_riga_id: nuovaRigaId,
            bevanda_id: p.bevanda_id,
            quota_pct: p.quota_pct,
            ordine: p.ordine,
          },
        ];
      });
      if (prodottiDaCopiare.length > 0) {
        const { error: erroreProdotti } = await supabase
          .from("preventivo_beveraggio_prodotto")
          .insert(prodottiDaCopiare);
        if (erroreProdotti) throw new Error(erroreProdotti.message);
      }
    }
  }

  return nuovoId;
}

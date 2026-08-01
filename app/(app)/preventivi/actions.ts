"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { creaCliente } from "@/lib/db/clienti";
import {
  aggiornaBeveraggio,
  aggiornaPreventivo,
  aggiornaRiga,
  aggiungiProdottoBeveraggio,
  aggiungiRigaExtra,
  aggiungiRigaRicetta,
  cambiaStatoPreventivo,
  creaPreventivo,
  duplicaPreventivo,
  eliminaPreventivo,
  impostaCorrezioneBeveraggio,
  impostaRigaBeveraggio,
  rimuoviProdottoBeveraggio,
  rimuoviRiga,
  rimuoviRigaBeveraggio,
} from "@/lib/db/preventivi";
import { ricettaPerId } from "@/lib/db/ricette";
import type {
  CategoriaBevanda,
  CategoriaRigaExtra,
  CorrettivoPubblico,
  EsposizioneBeveraggio,
  StatoPreventivo,
  TipoEvento,
  UnitaBevanda,
} from "@/lib/db/types";
import {
  parseEuroCent,
  parseNumero,
  parseNumeroOpzionale,
  parseTesto,
  parseTestoOpzionale,
} from "@/lib/form";

export async function azioneCreaPreventivo(formData: FormData): Promise<void> {
  let clienteId = parseTestoOpzionale(formData.get("cliente_id"));
  const nuovoCliente = parseTestoOpzionale(formData.get("nuovo_cliente"));
  if (!clienteId && nuovoCliente) {
    clienteId = await creaCliente({ nome: nuovoCliente, tipo: "privato" });
  }
  if (!clienteId) throw new Error("Seleziona un cliente o inserisci il nome di uno nuovo");

  const id = await creaPreventivo({
    cliente_id: clienteId,
    tipo: parseTesto(formData.get("tipo"), "tipo") as TipoEvento,
    data_evento: parseTesto(formData.get("data_evento"), "data evento"),
    numero_ospiti_adulti: parseNumero(formData.get("adulti"), "ospiti adulti"),
    numero_ospiti_bambini: parseNumero(formData.get("bambini") || "0", "ospiti bambini"),
    margine_target_pct: parseNumero(formData.get("margine"), "margine target"),
    menu_id: parseTestoOpzionale(formData.get("menu_id")),
    profilo_beveraggio_id: parseTestoOpzionale(formData.get("profilo_id")),
  });
  revalidatePath("/preventivi");
  redirect(`/preventivi/${id}`);
}

export async function azioneAggiornaPreventivo(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  const prezzoTotale = parseTestoOpzionale(formData.get("prezzo_totale"));
  await aggiornaPreventivo(id, {
    data_evento: parseTesto(formData.get("data_evento"), "data evento"),
    numero_ospiti_adulti: parseNumero(formData.get("adulti"), "ospiti adulti"),
    numero_ospiti_bambini: parseNumero(formData.get("bambini") || "0", "ospiti bambini"),
    margine_target_pct: parseNumero(formData.get("margine"), "margine target"),
    sfrido_pct: parseNumero(formData.get("sfrido"), "sfrido"),
    prezzo_totale_cent: prezzoTotale
      ? parseEuroCent(prezzoTotale, "prezzo totale")
      : null,
    validita_giorni: parseNumero(formData.get("validita"), "validità"),
    note_cliente: parseTestoOpzionale(formData.get("note_cliente")),
    condizioni: parseTestoOpzionale(formData.get("condizioni")),
  });
  revalidatePath(`/preventivi/${id}`);
}

export async function azioneAggiungiRigaRicetta(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  const ricettaId = parseTesto(formData.get("ricetta_id"), "ricetta");
  const ricetta = await ricettaPerId(ricettaId);
  await aggiungiRigaRicetta(
    preventivoId,
    ricettaId,
    ricetta.nome,
    parseNumero(formData.get("porzioni"), "porzioni"),
  );
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneAggiungiRigaExtra(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  const prezzo = parseTestoOpzionale(formData.get("prezzo"));
  await aggiungiRigaExtra(
    preventivoId,
    parseTesto(formData.get("categoria"), "categoria") as CategoriaRigaExtra,
    parseTesto(formData.get("descrizione"), "descrizione"),
    parseNumero(formData.get("quantita") || "1", "quantità"),
    parseEuroCent(formData.get("costo"), "costo unitario"),
    prezzo ? parseEuroCent(prezzo, "prezzo unitario") : null,
  );
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneAggiornaRigaPrezzo(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  const rigaId = parseTesto(formData.get("riga_id"), "riga");
  const prezzo = parseTestoOpzionale(formData.get("prezzo"));
  await aggiornaRiga(rigaId, {
    quantita: parseNumero(formData.get("quantita"), "quantità"),
    prezzo_unitario_cent: prezzo ? parseEuroCent(prezzo, "prezzo unitario") : null,
  });
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneRimuoviRiga(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  await rimuoviRiga(parseTesto(formData.get("riga_id"), "riga"));
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneAggiornaBeveraggio(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  await aggiornaBeveraggio(preventivoId, {
    attivo: formData.get("attivo") === "on",
    ore_servizio: parseNumero(formData.get("ore_servizio") || "0", "ore servizio"),
    fattore_distribuzione_pct: parseNumero(
      formData.get("fattore_distribuzione"),
      "fattore di distribuzione",
    ),
    quota_bibite_bambini_pct: parseNumero(
      formData.get("quota_bibite"),
      "quota bibite bambini",
    ),
    correttivo_stagione_calda: formData.get("stagione_calda") === "on",
    correttivo_evento_lungo: formData.get("evento_lungo") === "on",
    correttivo_pubblico: parseTesto(
      formData.get("pubblico"),
      "correttivo pubblico",
    ) as CorrettivoPubblico,
    esposizione: parseTesto(formData.get("esposizione"), "esposizione") as EsposizioneBeveraggio,
  });
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneImpostaRigaBeveraggio(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  await impostaRigaBeveraggio(
    preventivoId,
    parseTesto(formData.get("categoria"), "categoria") as CategoriaBevanda,
    {
      quantita_a_testa: parseNumero(formData.get("quantita"), "quantità a testa"),
      unita: parseTesto(formData.get("unita"), "unità") as UnitaBevanda,
      quantita_a_testa_ora: parseNumero(formData.get("quantita_ora") || "0", "quantità/ora"),
    },
  );
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneRimuoviRigaBeveraggio(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  await rimuoviRigaBeveraggio(preventivoId, parseTesto(formData.get("riga_id"), "riga"));
  revalidatePath(`/preventivi/${preventivoId}`);
}

// FEATURE-016: campo vuoto = torna al calcolo automatico (rimuove l'override).
export async function azioneImpostaCorrezioneBeveraggio(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  await impostaCorrezioneBeveraggio(
    preventivoId,
    parseTesto(formData.get("riga_id"), "riga"),
    parseNumeroOpzionale(formData.get("valore")),
  );
  revalidatePath(`/preventivi/${preventivoId}`);
}

// BUG-001: un prodotto in più sotto la stessa categoria non sovrascrive più
// quello già assegnato, ma si aggiunge con la propria quota.
export async function azioneAggiungiProdottoBeveraggio(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  await aggiungiProdottoBeveraggio(
    preventivoId,
    parseTesto(formData.get("riga_id"), "riga"),
    parseTesto(formData.get("bevanda_id"), "bevanda"),
    parseNumero(formData.get("quota"), "quota"),
  );
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneRimuoviProdottoBeveraggio(formData: FormData): Promise<void> {
  const preventivoId = parseTesto(formData.get("preventivo_id"), "preventivo");
  await rimuoviProdottoBeveraggio(
    preventivoId,
    parseTesto(formData.get("prodotto_id"), "prodotto"),
  );
  revalidatePath(`/preventivi/${preventivoId}`);
}

export async function azioneCambiaStato(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  const stato = parseTesto(formData.get("stato"), "stato") as StatoPreventivo;
  await cambiaStatoPreventivo(id, stato);
  revalidatePath(`/preventivi/${id}`);
  revalidatePath("/preventivi");
}

export async function azioneDuplica(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  const comeRevisione = formData.get("revisione") === "1";
  const nuovoId = await duplicaPreventivo(id, comeRevisione);
  revalidatePath("/preventivi");
  redirect(`/preventivi/${nuovoId}`);
}

export async function azioneEliminaPreventivo(formData: FormData): Promise<void> {
  const id = parseTesto(formData.get("id"), "id");
  await eliminaPreventivo(id);
  revalidatePath("/preventivi");
  redirect("/preventivi");
}

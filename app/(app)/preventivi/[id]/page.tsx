import Link from "next/link";
import {
  classiBottone,
  classiBottoneSecondario,
  classiInput,
  classiTd,
  classiTh,
  Etichetta,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { formattaEuro } from "@/lib/calc/money";
import { elencoConsumabili } from "@/lib/db/consumabili";
import { elencoMateriePrime } from "@/lib/db/materiePrime";
import { calcolaPreventivo } from "@/lib/db/preventivi";
import { elencoRicette } from "@/lib/db/ricette";
import {
  ETICHETTE_CATEGORIA_BEVANDA,
  type CategoriaBevanda,
} from "@/lib/db/types";
import {
  azioneAggiornaBeveraggio,
  azioneAggiornaPreventivo,
  azioneAggiornaRigaPrezzo,
  azioneAggiungiProdottoBeveraggio,
  azioneAggiungiRigaConsumabile,
  azioneAggiungiRigaExtra,
  azioneAggiungiRigaMateriaPrima,
  azioneAggiungiRigaRicetta,
  azioneCambiaStato,
  azioneDuplica,
  azioneEliminaPreventivo,
  azioneImpostaCorrezioneBeveraggio,
  azioneImpostaRigaBeveraggio,
  azioneRimuoviProdottoBeveraggio,
  azioneRimuoviRiga,
  azioneRimuoviRigaBeveraggio,
} from "../actions";

function euroInput(cent: number | null): string {
  return cent != null ? (cent / 100).toFixed(2).replace(".", ",") : "";
}

export default async function PaginaPreventivo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [calcolo, ricette, materiePrimeAttive, consumabiliAttivi] = await Promise.all([
    calcolaPreventivo(id),
    elencoRicette(true),
    elencoMateriePrime(),
    elencoConsumabili(),
  ]);
  const {
    dati,
    costiRigheCent,
    quantitaEffettivaRighe,
    beveraggio,
    erroreBeveraggio,
    totali,
    bevande,
    materiePrime,
    consumabili,
  } = calcolo;
  const materiePrimePerId = new Map(materiePrime.map((mp) => [mp.id, mp]));
  const consumabiliPerId = new Map(consumabili.map((c) => [c.id, c]));
  const {
    preventivo,
    cliente,
    righe,
    beveraggio: configBev,
    righeBeveraggio,
    prodottiBeveraggio,
  } = dati;
  const eBozza = preventivo.stato === "bozza";
  const ospitiTotali =
    preventivo.numero_ospiti_adulti + preventivo.numero_ospiti_bambini;

  const bevandePerCategoria = new Map<CategoriaBevanda, typeof bevande>();
  for (const b of bevande.filter((b) => !b.deleted_at)) {
    if (!bevandePerCategoria.has(b.categoria)) bevandePerCategoria.set(b.categoria, []);
    bevandePerCategoria.get(b.categoria)!.push(b);
  }
  const bevandePerId = new Map(bevande.map((b) => [b.id, b]));

  // BUG-001: una riga di beveraggio può avere più prodotti assegnati
  const prodottiPerRiga = new Map<string, typeof prodottiBeveraggio>();
  for (const p of prodottiBeveraggio) {
    if (!prodottiPerRiga.has(p.preventivo_beveraggio_riga_id)) {
      prodottiPerRiga.set(p.preventivo_beveraggio_riga_id, []);
    }
    prodottiPerRiga.get(p.preventivo_beveraggio_riga_id)!.push(p);
  }

  return (
    <>
      <TitoloPagina
        titolo={`Preventivo — ${cliente.nome}`}
        sottotitolo={`${preventivo.tipo} · ${preventivo.data_evento} · ${ospitiTotali} ospiti (${preventivo.numero_ospiti_bambini} bambini) · stato: ${preventivo.stato}${preventivo.revisione_di_id ? " · revisione" : ""}`}
      >
        <a
          href={`/api/preventivi/${preventivo.id}/pdf`}
          className={classiBottoneSecondario}
          target="_blank"
        >
          Anteprima PDF
        </a>
        {eBozza && (
          <form action={azioneCambiaStato}>
            <input type="hidden" name="id" value={preventivo.id} />
            <input type="hidden" name="stato" value="inviato" />
            <button type="submit" className={classiBottone}>
              Segna come inviato (congela i costi)
            </button>
          </form>
        )}
        {preventivo.stato === "inviato" && (
          <>
            {(["confermato", "rifiutato", "scaduto"] as const).map((stato) => (
              <form key={stato} action={azioneCambiaStato}>
                <input type="hidden" name="id" value={preventivo.id} />
                <input type="hidden" name="stato" value={stato} />
                <button type="submit" className={classiBottoneSecondario}>
                  {stato}
                </button>
              </form>
            ))}
            <form action={azioneDuplica}>
              <input type="hidden" name="id" value={preventivo.id} />
              <input type="hidden" name="revisione" value="1" />
              <button type="submit" className={classiBottoneSecondario}>
                Crea revisione
              </button>
            </form>
          </>
        )}
        <form action={azioneDuplica}>
          <input type="hidden" name="id" value={preventivo.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Duplica
          </button>
        </form>
        {eBozza && (
          <form action={azioneEliminaPreventivo}>
            <input type="hidden" name="id" value={preventivo.id} />
            <button type="submit" className={classiBottoneSecondario}>
              Elimina bozza
            </button>
          </form>
        )}
      </TitoloPagina>

      {!eBozza && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Preventivo inviato: i costi sono congelati nello snapshot (
          {preventivo.food_cost_snapshot?.congelato_at?.slice(0, 10)}). Le modifiche
          richiedono una revisione.
        </p>
      )}

      {/* Totali sempre visibili (§5.4: food cost %, utile stimato, margine effettivo) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Riquadro titolo="Costo totale">
          <p className="text-2xl font-semibold">{formattaEuro(totali.costoTotaleCent)}</p>
          <p className="text-sm text-stone-500">
            food {formattaEuro(totali.foodCostCent)} + extra{" "}
            {formattaEuro(totali.costoExtraCent)}
          </p>
        </Riquadro>
        <Riquadro titolo="Prezzo suggerito">
          <p className="text-2xl font-semibold">{formattaEuro(totali.prezzoSuggeritoCent)}</p>
          <p className="text-sm text-stone-500">
            margine target {Number(preventivo.margine_target_pct)}%
          </p>
        </Riquadro>
        <Riquadro titolo="Prezzo proposto">
          <p className="text-2xl font-semibold">
            {preventivo.prezzo_totale_cent != null
              ? formattaEuro(preventivo.prezzo_totale_cent)
              : formattaEuro(totali.prezzoTotaleCent)}
          </p>
          <p className="text-sm text-stone-500">
            {preventivo.prezzo_totale_cent != null
              ? "impostato a mano"
              : "somma dei prezzi riga"}
          </p>
        </Riquadro>
        <Riquadro titolo="Utile e margine">
          <p className="text-2xl font-semibold">{formattaEuro(totali.utileCent)}</p>
          <p className="text-sm text-stone-500">
            {totali.margineEffettivoPct != null
              ? `margine effettivo ${totali.margineEffettivoPct.toFixed(1)}% · food cost ${totali.foodCostPct?.toFixed(1)}%`
              : "imposta i prezzi riga per il margine"}
          </p>
        </Riquadro>
      </div>

      {/* Righe */}
      <div className="mb-6">
        <Riquadro titolo="Righe del preventivo">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-stone-200">
                <tr>
                  <th className={classiTh}>Descrizione</th>
                  <th className={classiTh}>Quantità</th>
                  <th className={classiTh}>Costo unitario</th>
                  <th className={classiTh}>Costo riga</th>
                  <th className={classiTh}>Prezzo unitario</th>
                  <th className={classiTh}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {righe.map((riga) => {
                  const costoUnitario = costiRigheCent.get(riga.id) ?? null;
                  const quantitaEffettiva =
                    quantitaEffettivaRighe.get(riga.id) ?? Number(riga.quantita);
                  const materiaPrima = riga.materia_prima_id
                    ? materiePrimePerId.get(riga.materia_prima_id)
                    : undefined;
                  const consumabile = riga.consumabile_id
                    ? consumabiliPerId.get(riga.consumabile_id)
                    : undefined;
                  return (
                    <tr key={riga.id}>
                      <td className={`${classiTd} font-medium`}>
                        {riga.descrizione}
                        {riga.tipo_riga === "extra" && (
                          <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                            {riga.categoria_extra}
                          </span>
                        )}
                        {riga.tipo_riga === "materia_prima" && (
                          <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                            materia prima
                          </span>
                        )}
                        {riga.tipo_riga === "consumabile" && (
                          <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                            consumabile
                          </span>
                        )}
                      </td>
                      <td className={classiTd}>
                        {riga.tipo_riga === "materia_prima" ? (
                          <>
                            {Number(riga.quantita)} {materiaPrima?.unita_uso ?? ""} a persona
                            <p className="text-xs text-stone-400">
                              tot. evento: {Math.round(quantitaEffettiva * 1000) / 1000}{" "}
                              {materiaPrima?.unita_uso ?? ""} ({ospitiTotali} ospiti, sfrido{" "}
                              {Number(preventivo.sfrido_pct)}%)
                            </p>
                          </>
                        ) : riga.tipo_riga === "consumabile" ? (
                          <>
                            {Number(riga.quantita)} {consumabile?.unita_uso ?? ""} a persona
                            <p className="text-xs text-stone-400">
                              tot. evento: {Math.round(quantitaEffettiva * 1000) / 1000}{" "}
                              {consumabile?.unita_uso ?? ""} ({ospitiTotali} ospiti, senza sfrido)
                            </p>
                          </>
                        ) : (
                          Number(riga.quantita)
                        )}
                      </td>
                      <td className={classiTd}>
                        {costoUnitario != null
                          ? formattaEuro(Math.round(costoUnitario))
                          : "—"}
                      </td>
                      <td className={classiTd}>
                        {costoUnitario != null
                          ? formattaEuro(Math.round(costoUnitario * quantitaEffettiva))
                          : "—"}
                      </td>
                      <td className={classiTd}>
                        {eBozza ? (
                          <form
                            action={azioneAggiornaRigaPrezzo}
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="preventivo_id" value={preventivo.id} />
                            <input type="hidden" name="riga_id" value={riga.id} />
                            {riga.tipo_riga === "materia_prima" ||
                            riga.tipo_riga === "consumabile" ? (
                              <input
                                name="quantita"
                                inputMode="decimal"
                                defaultValue={String(riga.quantita)}
                                title="Quantità a persona"
                                className="w-20 rounded-md border border-stone-300 px-2 py-1 text-sm"
                              />
                            ) : (
                              <input
                                type="hidden"
                                name="quantita"
                                value={String(riga.quantita)}
                              />
                            )}
                            <input
                              name="prezzo"
                              inputMode="decimal"
                              defaultValue={euroInput(riga.prezzo_unitario_cent)}
                              placeholder={
                                costoUnitario != null
                                  ? `sugg. ${(Math.round(costoUnitario / (1 - Number(preventivo.margine_target_pct) / 100)) / 100).toFixed(2).replace(".", ",")}`
                                  : ""
                              }
                              className="w-28 rounded-md border border-stone-300 px-2 py-1 text-sm"
                            />
                            <button type="submit" className={classiBottoneSecondario}>
                              OK
                            </button>
                          </form>
                        ) : riga.prezzo_unitario_cent != null ? (
                          formattaEuro(riga.prezzo_unitario_cent)
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={classiTd}>
                        {eBozza && (
                          <form action={azioneRimuoviRiga}>
                            <input type="hidden" name="preventivo_id" value={preventivo.id} />
                            <input type="hidden" name="riga_id" value={riga.id} />
                            <button type="submit" className={classiBottoneSecondario}>
                              Rimuovi
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {righe.length === 0 && (
                  <tr>
                    <td className={`${classiTd} text-stone-500`} colSpan={6}>
                      Nessuna riga: aggiungi ricette, materie prime, consumabili o voci extra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {eBozza && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
              <form action={azioneAggiungiRigaRicetta} className="space-y-3">
                <h3 className="font-medium">Aggiungi ricetta</h3>
                <input type="hidden" name="preventivo_id" value={preventivo.id} />
                <Etichetta testo="Ricetta">
                  <select name="ricetta_id" required className={classiInput}>
                    {ricette.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </select>
                </Etichetta>
                <Etichetta testo="Porzioni">
                  <input
                    name="porzioni"
                    required
                    inputMode="numeric"
                    defaultValue={String(ospitiTotali)}
                    className={classiInput}
                  />
                </Etichetta>
                <button type="submit" className={classiBottone}>
                  Aggiungi riga
                </button>
              </form>

              <form action={azioneAggiungiRigaMateriaPrima} className="space-y-3">
                <h3 className="font-medium">Aggiungi materia prima (senza ricetta)</h3>
                <input type="hidden" name="preventivo_id" value={preventivo.id} />
                <Etichetta testo="Materia prima">
                  <select name="materia_prima_id" required className={classiInput}>
                    {materiePrimeAttive.map((mp) => (
                      <option key={mp.id} value={mp.id}>
                        {mp.nome} ({mp.unita_uso})
                      </option>
                    ))}
                  </select>
                </Etichetta>
                <Etichetta testo="Quantità a persona">
                  <input
                    name="quantita_persona"
                    required
                    inputMode="decimal"
                    className={classiInput}
                  />
                </Etichetta>
                <p className="text-xs text-stone-500">
                  Scala automaticamente per {ospitiTotali} ospiti + sfrido{" "}
                  {Number(preventivo.sfrido_pct)}%.
                </p>
                <button type="submit" className={classiBottone}>
                  Aggiungi riga
                </button>
              </form>

              <form action={azioneAggiungiRigaConsumabile} className="space-y-3">
                <h3 className="font-medium">Aggiungi consumabile (senza ricetta)</h3>
                <input type="hidden" name="preventivo_id" value={preventivo.id} />
                <Etichetta testo="Consumabile">
                  <select name="consumabile_id" required className={classiInput}>
                    {consumabiliAttivi.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.unita_uso})
                      </option>
                    ))}
                  </select>
                </Etichetta>
                <Etichetta testo="Quantità a persona">
                  <input
                    name="quantita_persona"
                    required
                    inputMode="decimal"
                    className={classiInput}
                  />
                </Etichetta>
                <p className="text-xs text-stone-500">
                  Scala automaticamente per {ospitiTotali} ospiti (senza sfrido).
                </p>
                <button type="submit" className={classiBottone}>
                  Aggiungi riga
                </button>
              </form>

              <form action={azioneAggiungiRigaExtra} className="space-y-3">
                <h3 className="font-medium">Aggiungi voce extra</h3>
                <input type="hidden" name="preventivo_id" value={preventivo.id} />
                <Etichetta testo="Categoria">
                  <select name="categoria" className={classiInput}>
                    <option value="personale">Personale</option>
                    <option value="trasferta">Trasferta</option>
                    <option value="noleggio">Noleggio</option>
                    <option value="consumabile">Consumabili</option>
                    <option value="sconto">Sconto</option>
                    <option value="altro">Altro</option>
                  </select>
                </Etichetta>
                <Etichetta testo="Descrizione">
                  <input name="descrizione" required className={classiInput} />
                </Etichetta>
                <div className="grid grid-cols-3 gap-3">
                  <Etichetta testo="Quantità">
                    <input name="quantita" inputMode="decimal" defaultValue="1" className={classiInput} />
                  </Etichetta>
                  <Etichetta testo="Costo unit. (€)">
                    <input name="costo" required inputMode="decimal" className={classiInput} />
                  </Etichetta>
                  <Etichetta testo="Prezzo unit. (€)">
                    <input name="prezzo" inputMode="decimal" className={classiInput} />
                  </Etichetta>
                </div>
                <button type="submit" className={classiBottone}>
                  Aggiungi voce
                </button>
              </form>
            </div>
          )}
        </Riquadro>
      </div>

      {/* Beveraggio */}
      <div className="mb-6">
        <Riquadro titolo="Beveraggio (§5.11)">
          {configBev && (
            <>
              {eBozza && (
                <form
                  action={azioneAggiornaBeveraggio}
                  className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <input type="hidden" name="preventivo_id" value={preventivo.id} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="attivo" defaultChecked={configBev.attivo} />
                    Beveraggio incluso (spegni per &quot;solo servizio&quot;)
                  </label>
                  <Etichetta testo="Ore di servizio (voci a durata)">
                    <input
                      name="ore_servizio"
                      inputMode="decimal"
                      defaultValue={String(configBev.ore_servizio)}
                      className={classiInput}
                    />
                  </Etichetta>
                  <Etichetta testo="Fattore distribuzione vino+birra (%)">
                    <input
                      name="fattore_distribuzione"
                      inputMode="decimal"
                      defaultValue={String(configBev.fattore_distribuzione_pct)}
                      className={classiInput}
                    />
                  </Etichetta>
                  <Etichetta testo="Quota bibite bambini (%)">
                    <input
                      name="quota_bibite"
                      inputMode="decimal"
                      defaultValue={String(configBev.quota_bibite_bambini_pct)}
                      className={classiInput}
                    />
                  </Etichetta>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="stagione_calda"
                      defaultChecked={configBev.correttivo_stagione_calda}
                    />
                    Stagione calda (+30% acqua e birra)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="evento_lungo"
                      defaultChecked={configBev.correttivo_evento_lungo}
                    />
                    Evento lungo &gt;4h (+20% su tutto)
                  </label>
                  <Etichetta testo="Pubblico">
                    <select
                      name="pubblico"
                      defaultValue={configBev.correttivo_pubblico}
                      className={classiInput}
                    >
                      <option value="normale">normale</option>
                      <option value="beve_poco">beve poco (−20% alcolici)</option>
                      <option value="beve_molto">beve molto (+20% alcolici)</option>
                    </select>
                  </Etichetta>
                  <Etichetta testo="Esposizione sul PDF">
                    <select
                      name="esposizione"
                      defaultValue={configBev.esposizione}
                      className={classiInput}
                    >
                      <option value="a_corpo">a corpo</option>
                      <option value="a_testa">a testa</option>
                      <option value="dettaglio">in dettaglio</option>
                    </select>
                  </Etichetta>
                  <div className="flex items-end">
                    <button type="submit" className={classiBottone}>
                      Salva impostazioni beveraggio
                    </button>
                  </div>
                </form>
              )}

              {erroreBeveraggio && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-900">
                  <p className="font-medium">
                    ⚠ Impossibile calcolare il beveraggio: {erroreBeveraggio}
                  </p>
                  <p className="mt-1">
                    Il resto del preventivo resta consultabile. Rimuovi qui sotto il
                    prodotto o la categoria che causa l&apos;errore per sbloccare il calcolo.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {righeBeveraggio.map((rDb) => (
                      <li key={rDb.id}>
                        <span className="font-medium">
                          {ETICHETTE_CATEGORIA_BEVANDA[rDb.categoria]}
                        </span>{" "}
                        ({rDb.unita})
                        {(prodottiPerRiga.get(rDb.id) ?? []).map((p) => (
                          <span key={p.id} className="ml-2 inline-flex items-center gap-1">
                            · {bevandePerId.get(p.bevanda_id)?.nome ?? p.bevanda_id} (
                            {bevandePerId.get(p.bevanda_id)?.unita ?? "?"}, {Number(p.quota_pct)}%)
                            {eBozza && (
                              <form action={azioneRimuoviProdottoBeveraggio} className="inline">
                                <input type="hidden" name="preventivo_id" value={preventivo.id} />
                                <input type="hidden" name="prodotto_id" value={p.id} />
                                <button type="submit" className="text-red-700 underline">
                                  rimuovi
                                </button>
                              </form>
                            )}
                          </span>
                        ))}
                        {eBozza && (
                          <form action={azioneRimuoviRigaBeveraggio} className="ml-2 inline">
                            <input type="hidden" name="preventivo_id" value={preventivo.id} />
                            <input type="hidden" name="riga_id" value={rDb.id} />
                            <button type="submit" className="text-red-700 underline">
                              rimuovi categoria
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!erroreBeveraggio && beveraggio ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="border-b border-stone-200">
                      <tr>
                        <th className={classiTh}>Categoria</th>
                        <th className={classiTh}>Teorico</th>
                        <th className={classiTh}>Corretto</th>
                        <th className={classiTh}>Prodotti</th>
                        <th className={classiTh}>Scorta residua</th>
                        <th className={classiTh}>Costo</th>
                        <th className={classiTh}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {beveraggio.righe.map((r) => {
                        const rigaDb = righeBeveraggio.find(
                          (x) => x.categoria === r.categoria,
                        );
                        const prodottiDb = rigaDb ? prodottiPerRiga.get(rigaDb.id) ?? [] : [];
                        // BUG-002: solo prodotti con unità compatibile sono selezionabili
                        const bevandeCompatibili = rigaDb
                          ? (bevandePerCategoria.get(r.categoria) ?? []).filter(
                              (b) =>
                                b.unita === rigaDb.unita &&
                                !r.prodotti.some((p) => p.bevanda.id === b.id),
                            )
                          : [];
                        const quotaResidua = Math.max(
                          0,
                          Math.round((100 - r.quotaCopertaPct) * 100) / 100,
                        );
                        return (
                          <tr key={r.categoria} className="align-top">
                            <td className={`${classiTd} font-medium`}>
                              {ETICHETTE_CATEGORIA_BEVANDA[r.categoria]}
                            </td>
                            <td className={classiTd}>
                              {Math.round(r.volumeTeorico).toLocaleString("it-IT")} {r.unita}
                              <p className="text-xs text-stone-400">suggerimento</p>
                            </td>
                            <td className={classiTd}>
                              {eBozza && rigaDb ? (
                                <div className="space-y-1">
                                  <form
                                    action={azioneImpostaCorrezioneBeveraggio}
                                    className="flex items-center gap-1"
                                  >
                                    <input type="hidden" name="preventivo_id" value={preventivo.id} />
                                    <input type="hidden" name="riga_id" value={rigaDb.id} />
                                    <input
                                      name="valore"
                                      inputMode="decimal"
                                      defaultValue={String(Math.round(r.volumeCorretto * 1000) / 1000)}
                                      className="w-24 rounded-md border border-stone-300 px-2 py-1 text-sm"
                                    />
                                    <span className="text-xs text-stone-500">{r.unita}</span>
                                    <button type="submit" className={classiBottoneSecondario}>
                                      Salva
                                    </button>
                                  </form>
                                  {r.volumeCorrettoOverride != null ? (
                                    <form action={azioneImpostaCorrezioneBeveraggio}>
                                      <input type="hidden" name="preventivo_id" value={preventivo.id} />
                                      <input type="hidden" name="riga_id" value={rigaDb.id} />
                                      <input type="hidden" name="valore" value="" />
                                      <button type="submit" className="text-xs text-amber-700 underline">
                                        ✏️ manuale — torna al calcolo automatico
                                      </button>
                                    </form>
                                  ) : (
                                    <p className="text-xs text-stone-400">calcolato automaticamente</p>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {Math.round(r.volumeCorretto).toLocaleString("it-IT")} {r.unita}
                                  {r.volumeCorrettoOverride != null && (
                                    <p className="text-xs text-amber-700">✏️ manuale</p>
                                  )}
                                </>
                              )}
                            </td>
                            <td className={classiTd}>
                              <ul className="space-y-1.5">
                                {r.prodotti.map((p) => {
                                  const prodottoDb = prodottiDb.find(
                                    (pp) => pp.bevanda_id === p.bevanda.id,
                                  );
                                  return (
                                    <li
                                      key={p.bevanda.id}
                                      className="flex flex-wrap items-center gap-2 text-sm"
                                    >
                                      <span className="font-medium">{p.bevanda.nome}</span>
                                      <span className="text-stone-500">
                                        {p.quotaPct}% · {p.colli} colli · {formattaEuro(p.costoCent)}
                                      </span>
                                      {eBozza && prodottoDb && (
                                        <form action={azioneRimuoviProdottoBeveraggio}>
                                          <input
                                            type="hidden"
                                            name="preventivo_id"
                                            value={preventivo.id}
                                          />
                                          <input
                                            type="hidden"
                                            name="prodotto_id"
                                            value={prodottoDb.id}
                                          />
                                          <button type="submit" className={classiBottoneSecondario}>
                                            ×
                                          </button>
                                        </form>
                                      )}
                                    </li>
                                  );
                                })}
                                {r.prodotti.length === 0 && (
                                  <li className="text-stone-500">Nessun prodotto assegnato</li>
                                )}
                              </ul>
                              {r.volumeCorretto > 0 && r.quotaCopertaPct < 100 - 1e-6 && (
                                <p className="mt-1 text-xs text-amber-700">
                                  ⚠ copertura {r.quotaCopertaPct}% — costo parziale
                                </p>
                              )}
                              {eBozza && rigaDb && quotaResidua > 0 && bevandeCompatibili.length > 0 && (
                                <form
                                  action={azioneAggiungiProdottoBeveraggio}
                                  className="mt-2 flex flex-wrap items-center gap-2"
                                >
                                  <input type="hidden" name="preventivo_id" value={preventivo.id} />
                                  <input type="hidden" name="riga_id" value={rigaDb.id} />
                                  <select
                                    name="bevanda_id"
                                    required
                                    className="rounded-md border border-stone-300 px-2 py-1 text-sm"
                                  >
                                    <option value="">— aggiungi prodotto —</option>
                                    {bevandeCompatibili.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.nome}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    name="quota"
                                    inputMode="decimal"
                                    defaultValue={String(quotaResidua)}
                                    className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm"
                                  />
                                  <span className="text-xs text-stone-500">%</span>
                                  <button type="submit" className={classiBottoneSecondario}>
                                    Aggiungi
                                  </button>
                                </form>
                              )}
                            </td>
                            <td className={classiTd}>
                              {r.scortaResidua != null
                                ? `${Math.round(r.scortaResidua).toLocaleString("it-IT")} ${r.unita}`
                                : "—"}
                            </td>
                            <td className={classiTd}>
                              {r.costoCent != null ? formattaEuro(r.costoCent) : "—"}
                            </td>
                            <td className={classiTd}>
                              {eBozza && rigaDb && (
                                <form action={azioneRimuoviRigaBeveraggio}>
                                  <input type="hidden" name="preventivo_id" value={preventivo.id} />
                                  <input type="hidden" name="riga_id" value={rigaDb.id} />
                                  <button type="submit" className={classiBottoneSecondario}>
                                    Rimuovi
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-3 text-sm">
                    {beveraggio.fattoreDistribuzioneApplicato && (
                      <span className="mr-3 rounded bg-stone-100 px-2 py-0.5">
                        fattore di distribuzione applicato (−
                        {Number(configBev.fattore_distribuzione_pct)}% su vino+birra)
                      </span>
                    )}
                    <span className="font-medium">
                      Costo beveraggio: {formattaEuro(beveraggio.costoTotaleCent)}
                    </span>
                    {beveraggio.righeSenzaPrezzo && (
                      <span className="ml-3 text-amber-700">
                        ⚠ alcune categorie non hanno (o non hanno del tutto) un prodotto
                        associato: costo incompleto
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                !erroreBeveraggio && (
                  <p className="text-sm text-stone-500">
                    {configBev.attivo
                      ? "Nessuna riga beveraggio: aggiungi categorie qui sotto."
                      : "Beveraggio disattivato (solo servizio). Riattivalo sopra oppure aggiungi una riga di diritto di tappo tra le voci extra."}
                  </p>
                )
              )}

              {eBozza && configBev.attivo && (
                <form
                  action={azioneImpostaRigaBeveraggio}
                  className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                >
                  <input type="hidden" name="preventivo_id" value={preventivo.id} />
                  <Etichetta testo="Categoria">
                    <select name="categoria" className={classiInput}>
                      {Object.entries(ETICHETTE_CATEGORIA_BEVANDA).map(([v, e]) => (
                        <option key={v} value={v}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </Etichetta>
                  <Etichetta testo="Quantità a testa">
                    <input name="quantita" required inputMode="decimal" className={classiInput} />
                  </Etichetta>
                  <Etichetta testo="Unità">
                    <select name="unita" className={classiInput}>
                      <option value="ml">ml</option>
                      <option value="pz">pz</option>
                    </select>
                  </Etichetta>
                  <Etichetta testo="A testa/ora">
                    <input name="quantita_ora" inputMode="decimal" defaultValue="0" className={classiInput} />
                  </Etichetta>
                  <div className="flex items-end">
                    <button type="submit" className={classiBottone}>
                      Salva riga beveraggio
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </Riquadro>
      </div>

      {/* Dati preventivo */}
      {eBozza && (
        <Riquadro titolo="Dati preventivo">
          <form action={azioneAggiornaPreventivo} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="id" value={preventivo.id} />
            <Etichetta testo="Data evento">
              <input
                type="date"
                name="data_evento"
                defaultValue={preventivo.data_evento}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Ospiti adulti">
              <input
                name="adulti"
                inputMode="numeric"
                defaultValue={String(preventivo.numero_ospiti_adulti)}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Ospiti bambini">
              <input
                name="bambini"
                inputMode="numeric"
                defaultValue={String(preventivo.numero_ospiti_bambini)}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Margine target (%)">
              <input
                name="margine"
                inputMode="decimal"
                defaultValue={String(preventivo.margine_target_pct)}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Sfrido (%)">
              <input
                name="sfrido"
                inputMode="decimal"
                defaultValue={String(preventivo.sfrido_pct)}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Validità (giorni)">
              <input
                name="validita"
                inputMode="numeric"
                defaultValue={String(preventivo.validita_giorni)}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Prezzo totale proposto (€, vuoto = somma righe)">
              <input
                name="prezzo_totale"
                inputMode="decimal"
                defaultValue={euroInput(preventivo.prezzo_totale_cent)}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Note per il cliente (sul PDF)">
              <textarea
                name="note_cliente"
                rows={2}
                defaultValue={preventivo.note_cliente ?? ""}
                className={classiInput}
              />
            </Etichetta>
            <Etichetta testo="Condizioni (sul PDF)">
              <textarea
                name="condizioni"
                rows={2}
                defaultValue={preventivo.condizioni ?? ""}
                className={classiInput}
              />
            </Etichetta>
            <div className="flex items-end">
              <button type="submit" className={classiBottone}>
                Salva dati
              </button>
            </div>
          </form>
        </Riquadro>
      )}

      <p className="mt-6 text-sm text-stone-500">
        <Link href="/preventivi" className="underline">
          ← Torna all&apos;elenco preventivi
        </Link>
      </p>
    </>
  );
}

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
  azioneAggiungiRigaExtra,
  azioneAggiungiRigaRicetta,
  azioneCambiaStato,
  azioneDuplica,
  azioneImpostaRigaBeveraggio,
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
  const [calcolo, ricette] = await Promise.all([
    calcolaPreventivo(id),
    elencoRicette(true),
  ]);
  const { dati, costiRigheCent, beveraggio, totali, bevande } = calcolo;
  const { preventivo, cliente, righe, beveraggio: configBev, righeBeveraggio } = dati;
  const eBozza = preventivo.stato === "bozza";
  const ospitiTotali =
    preventivo.numero_ospiti_adulti + preventivo.numero_ospiti_bambini;

  const bevandePerCategoria = new Map<CategoriaBevanda, typeof bevande>();
  for (const b of bevande.filter((b) => !b.deleted_at)) {
    if (!bevandePerCategoria.has(b.categoria)) bevandePerCategoria.set(b.categoria, []);
    bevandePerCategoria.get(b.categoria)!.push(b);
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
                  return (
                    <tr key={riga.id}>
                      <td className={`${classiTd} font-medium`}>
                        {riga.descrizione}
                        {riga.tipo_riga === "extra" && (
                          <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                            {riga.categoria_extra}
                          </span>
                        )}
                      </td>
                      <td className={classiTd}>{Number(riga.quantita)}</td>
                      <td className={classiTd}>
                        {costoUnitario != null
                          ? formattaEuro(Math.round(costoUnitario))
                          : "—"}
                      </td>
                      <td className={classiTd}>
                        {costoUnitario != null
                          ? formattaEuro(Math.round(costoUnitario * Number(riga.quantita)))
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
                            <input
                              type="hidden"
                              name="quantita"
                              value={String(riga.quantita)}
                            />
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
                      Nessuna riga: aggiungi ricette o voci extra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {eBozza && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

              {beveraggio ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead className="border-b border-stone-200">
                      <tr>
                        <th className={classiTh}>Categoria</th>
                        <th className={classiTh}>Teorico</th>
                        <th className={classiTh}>Corretto</th>
                        <th className={classiTh}>Bevanda</th>
                        <th className={classiTh}>Unità</th>
                        <th className={classiTh}>Colli</th>
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
                        return (
                          <tr key={r.categoria}>
                            <td className={`${classiTd} font-medium`}>
                              {ETICHETTE_CATEGORIA_BEVANDA[r.categoria]}
                            </td>
                            <td className={classiTd}>
                              {Math.round(r.volumeTeorico).toLocaleString("it-IT")} {r.unita}
                            </td>
                            <td className={classiTd}>
                              {Math.round(r.volumeCorretto).toLocaleString("it-IT")} {r.unita}
                            </td>
                            <td className={classiTd}>
                              {eBozza && rigaDb ? (
                                <form
                                  action={azioneImpostaRigaBeveraggio}
                                  className="flex items-center gap-2"
                                >
                                  <input type="hidden" name="preventivo_id" value={preventivo.id} />
                                  <input type="hidden" name="categoria" value={r.categoria} />
                                  <input
                                    type="hidden"
                                    name="quantita"
                                    value={String(rigaDb.quantita_a_testa)}
                                  />
                                  <input type="hidden" name="unita" value={rigaDb.unita} />
                                  <input
                                    type="hidden"
                                    name="quantita_ora"
                                    value={String(rigaDb.quantita_a_testa_ora)}
                                  />
                                  <select
                                    name="bevanda_id"
                                    defaultValue={rigaDb.bevanda_id ?? ""}
                                    className="rounded-md border border-stone-300 px-2 py-1 text-sm"
                                  >
                                    <option value="">— scegli —</option>
                                    {(bevandePerCategoria.get(r.categoria) ?? []).map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.nome}
                                      </option>
                                    ))}
                                  </select>
                                  <button type="submit" className={classiBottoneSecondario}>
                                    OK
                                  </button>
                                </form>
                              ) : (
                                r.bevanda?.nome ?? "—"
                              )}
                            </td>
                            <td className={classiTd}>{r.unitaNecessarie ?? "—"}</td>
                            <td className={classiTd}>{r.colli ?? "—"}</td>
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
                                    ×
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
                        ⚠ alcune righe non hanno una bevanda associata: costo incompleto
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  {configBev.attivo
                    ? "Nessuna riga beveraggio: aggiungi categorie qui sotto."
                    : "Beveraggio disattivato (solo servizio). Riattivalo sopra oppure aggiungi una riga di diritto di tappo tra le voci extra."}
                </p>
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

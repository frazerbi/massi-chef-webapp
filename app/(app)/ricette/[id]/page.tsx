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
import { allergeniRicetta, costoPorzioneCent } from "@/lib/calc/ricetta";
import { caricaGrafoCalc, ingredientiDiRicetta, ricettaPerId } from "@/lib/db/ricette";
import { ETICHETTE_PORTATA } from "@/lib/db/types";
import {
  azioneAggiornaRicetta,
  azioneAggiungiIngrediente,
  azioneAggiungiSottoRicetta,
  azioneEliminaRicetta,
  azioneRimuoviIngrediente,
} from "../actions";

export default async function PaginaRicetta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ricetta, ingredienti, grafo] = await Promise.all([
    ricettaPerId(id),
    ingredientiDiRicetta(id),
    caricaGrafoCalc(),
  ]);

  const materiePrimeAttive = grafo.materiePrimeRighe.filter((mp) => !mp.deleted_at);
  const altreRicette = grafo.ricetteRighe.filter((r) => r.id !== id && !r.deleted_at);
  const nomiMaterie = new Map(grafo.materiePrimeRighe.map((mp) => [mp.id, mp]));
  const nomiRicette = new Map(grafo.ricetteRighe.map((r) => [r.id, r.nome]));

  let costoPorzione: string | null = null;
  let erroreCosto: string | null = null;
  try {
    costoPorzione = formattaEuro(
      Math.round(costoPorzioneCent(id, grafo.ricette, grafo.materiePrime)),
    );
  } catch (errore) {
    erroreCosto = (errore as Error).message;
  }
  let allergeni: string[] = [];
  try {
    allergeni = allergeniRicetta(id, grafo.ricette, grafo.materiePrime);
  } catch {
    // già segnalato dal costo
  }

  return (
    <>
      <TitoloPagina
        titolo={ricetta.nome}
        sottotitolo={`${ETICHETTE_PORTATA[ricetta.categoria_portata]} · ${ricetta.porzioni_base} porzioni base`}
      >
        <form action={azioneEliminaRicetta}>
          <input type="hidden" name="id" value={ricetta.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Elimina (soft delete)
          </button>
        </form>
      </TitoloPagina>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Riquadro titolo="Costo porzione (live)">
          {costoPorzione ? (
            <p className="text-3xl font-semibold">{costoPorzione}</p>
          ) : (
            <p className="text-sm text-red-700">⚠ {erroreCosto}</p>
          )}
          <p className="mt-1 text-sm text-stone-500">
            Ricalcolato dai prezzi correnti delle materie prime a ogni modifica.
          </p>
        </Riquadro>
        <Riquadro titolo="Allergeni ereditati">
          {allergeni.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allergeni.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900"
                >
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">Nessun allergene dichiarato.</p>
          )}
        </Riquadro>
      </div>

      <div className="mb-6">
        <Riquadro titolo="Distinta base">
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={classiTh}>Ingrediente</th>
                <th className={classiTh}>Quantità</th>
                <th className={classiTh}>Opzionale</th>
                <th className={classiTh}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ingredienti.map((ing) => {
                const mp = ing.materia_prima_id ? nomiMaterie.get(ing.materia_prima_id) : null;
                return (
                  <tr key={ing.id}>
                    <td className={classiTd}>
                      {mp
                        ? mp.nome
                        : `↳ ${nomiRicette.get(ing.sotto_ricetta_id!) ?? "sotto-ricetta"} (sotto-ricetta)`}
                    </td>
                    <td className={classiTd}>
                      {mp
                        ? `${Number(ing.quantita)} ${mp.unita_uso}`
                        : `${Number(ing.quantita_porzioni)} porzioni`}
                    </td>
                    <td className={classiTd}>{ing.opzionale ? "sì" : "no"}</td>
                    <td className={classiTd}>
                      <form action={azioneRimuoviIngrediente}>
                        <input type="hidden" name="id" value={ing.id} />
                        <input type="hidden" name="ricetta_id" value={ricetta.id} />
                        <button type="submit" className={classiBottoneSecondario}>
                          Rimuovi
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {ingredienti.length === 0 && (
                <tr>
                  <td className={`${classiTd} text-stone-500`} colSpan={4}>
                    Nessun ingrediente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <form action={azioneAggiungiIngrediente} className="space-y-3">
              <h3 className="font-medium">Aggiungi materia prima</h3>
              <input type="hidden" name="ricetta_id" value={ricetta.id} />
              <Etichetta testo="Materia prima">
                <select name="materia_prima_id" required className={classiInput}>
                  {materiePrimeAttive.map((mp) => (
                    <option key={mp.id} value={mp.id}>
                      {mp.nome} ({mp.unita_uso})
                    </option>
                  ))}
                </select>
              </Etichetta>
              <Etichetta testo={`Quantità (unità d'uso, per ${ricetta.porzioni_base} porzioni)`}>
                <input name="quantita" required inputMode="decimal" className={classiInput} />
              </Etichetta>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="opzionale" />
                Opzionale (guarnizione, variante)
              </label>
              <button type="submit" className={classiBottone}>
                Aggiungi
              </button>
            </form>

            <form action={azioneAggiungiSottoRicetta} className="space-y-3">
              <h3 className="font-medium">Aggiungi sotto-ricetta</h3>
              <input type="hidden" name="ricetta_id" value={ricetta.id} />
              <Etichetta testo="Sotto-ricetta (fondo, salsa base…)">
                <select name="sotto_ricetta_id" required className={classiInput}>
                  {altreRicette.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </Etichetta>
              <Etichetta testo={`Porzioni di sotto-ricetta (per ${ricetta.porzioni_base} porzioni)`}>
                <input
                  name="quantita_porzioni"
                  required
                  inputMode="decimal"
                  className={classiInput}
                />
              </Etichetta>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="opzionale" />
                Opzionale
              </label>
              <button type="submit" className={classiBottone}>
                Aggiungi
              </button>
              <p className="text-xs text-stone-500">
                Anti-ciclo e profondità massima 5 sono verificati lato server.
              </p>
            </form>
          </div>
        </Riquadro>
      </div>

      <Riquadro titolo="Dati ricetta">
        <form action={azioneAggiornaRicetta} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={ricetta.id} />
          <Etichetta testo="Nome">
            <input name="nome" required defaultValue={ricetta.nome} className={classiInput} />
          </Etichetta>
          <Etichetta testo="Portata">
            <select name="portata" defaultValue={ricetta.categoria_portata} className={classiInput}>
              {Object.entries(ETICHETTE_PORTATA).map(([valore, etichetta]) => (
                <option key={valore} value={valore}>
                  {etichetta}
                </option>
              ))}
            </select>
          </Etichetta>
          <Etichetta testo="Porzioni base">
            <input
              name="porzioni_base"
              required
              inputMode="numeric"
              defaultValue={String(ricetta.porzioni_base)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Tempo di preparazione (minuti)">
            <input
              name="tempo"
              inputMode="numeric"
              defaultValue={ricetta.tempo_preparazione_min != null ? String(ricetta.tempo_preparazione_min) : ""}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Costo manuale extra per porzione (€)">
            <input
              name="costo_extra"
              inputMode="decimal"
              defaultValue={(ricetta.costo_manuale_extra_cent / 100).toFixed(2).replace(".", ",")}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Descrizione">
            <input name="descrizione" defaultValue={ricetta.descrizione ?? ""} className={classiInput} />
          </Etichetta>
          <Etichetta testo="Istruzioni">
            <textarea
              name="istruzioni"
              rows={4}
              defaultValue={ricetta.istruzioni ?? ""}
              className={classiInput}
            />
          </Etichetta>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="attiva" defaultChecked={ricetta.attiva} />
            Attiva
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={classiBottone}>
              Salva modifiche
            </button>
          </div>
        </form>
      </Riquadro>
    </>
  );
}

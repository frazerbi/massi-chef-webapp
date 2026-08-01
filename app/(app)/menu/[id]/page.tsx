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
import { costoUnitaUsoCent } from "@/lib/calc/materiaPrima";
import { costoPorzioneCent } from "@/lib/calc/ricetta";
import { elencoMateriePrime } from "@/lib/db/materiePrime";
import { menuPerId, righeDiMenu } from "@/lib/db/menu";
import { caricaGrafoCalc } from "@/lib/db/ricette";
import { ETICHETTE_PORTATA } from "@/lib/db/types";
import {
  azioneAggiungiMateriaPrimaAMenu,
  azioneAggiungiRicettaAMenu,
  azioneEliminaMenu,
  azioneRimuoviRigaMenu,
} from "../actions";

export default async function PaginaDettaglioMenu({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [menu, righe, grafo, materiePrime] = await Promise.all([
    menuPerId(id),
    righeDiMenu(id),
    caricaGrafoCalc(),
    elencoMateriePrime(),
  ]);
  const ricettePerId = new Map(grafo.ricetteRighe.map((r) => [r.id, r]));
  const ricetteAttive = grafo.ricetteRighe.filter((r) => r.attiva && !r.deleted_at);
  const materiePrimePerId = new Map(grafo.materiePrimeRighe.map((mp) => [mp.id, mp]));

  const righeConCosto = righe.map((riga) => {
    let costo: number | null = null;
    let errore: string | null = null;
    if (riga.ricetta_id) {
      const ricetta = ricettePerId.get(riga.ricetta_id);
      try {
        costo = costoPorzioneCent(riga.ricetta_id, grafo.ricette, grafo.materiePrime);
      } catch (e) {
        errore = (e as Error).message;
      }
      return { riga, ricetta, materiaPrima: undefined, costo, errore };
    }
    // FEATURE-017: portata "nuda" senza ricetta
    const materiaPrima = materiePrimePerId.get(riga.materia_prima_id!);
    if (materiaPrima) {
      try {
        costo =
          costoUnitaUsoCent({
            prezzoAcquistoCent: Number(materiaPrima.prezzo_acquisto_cent),
            fattoreConversione: Number(materiaPrima.fattore_conversione),
            resaPercentuale: Number(materiaPrima.resa_percentuale),
          }) * Number(riga.quantita_persona);
      } catch (e) {
        errore = (e as Error).message;
      }
    } else {
      errore = "Materia prima non trovata";
    }
    return { riga, ricetta: undefined, materiaPrima, costo, errore };
  });
  const erroreCosto = righeConCosto.find((r) => r.errore)?.errore ?? null;
  const costoTotalePorzioneCent = righeConCosto.reduce(
    (somma, r) => somma + (r.costo ?? 0),
    0,
  );

  return (
    <>
      <TitoloPagina titolo={menu.nome} sottotitolo={menu.descrizione ?? undefined}>
        <form action={azioneEliminaMenu}>
          <input type="hidden" name="id" value={menu.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Elimina (soft delete)
          </button>
        </form>
      </TitoloPagina>

      <div className="mb-6">
        <Riquadro titolo="Portate">
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={classiTh}>Ordine</th>
                <th className={classiTh}>Ricetta / materia prima</th>
                <th className={classiTh}>Portata / quantità a persona</th>
                <th className={classiTh}>Costo porzione</th>
                <th className={classiTh}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {righeConCosto.map(({ riga, ricetta, materiaPrima, costo }) => (
                <tr key={riga.id}>
                  <td className={classiTd}>{riga.ordine}</td>
                  <td className={`${classiTd} font-medium`}>
                    {ricetta?.nome ?? materiaPrima?.nome ?? "—"}
                    {materiaPrima && (
                      <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-normal">
                        materia prima
                      </span>
                    )}
                  </td>
                  <td className={classiTd}>
                    {ricetta
                      ? ETICHETTE_PORTATA[ricetta.categoria_portata]
                      : materiaPrima
                        ? `${Number(riga.quantita_persona)} ${materiaPrima.unita_uso} a persona`
                        : "—"}
                  </td>
                  <td className={classiTd}>
                    {costo != null ? formattaEuro(Math.round(costo)) : "⚠"}
                  </td>
                  <td className={classiTd}>
                    <form action={azioneRimuoviRigaMenu}>
                      <input type="hidden" name="id" value={riga.id} />
                      <input type="hidden" name="menu_id" value={menu.id} />
                      <button type="submit" className={classiBottoneSecondario}>
                        Rimuovi
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {righe.length === 0 && (
                <tr>
                  <td className={`${classiTd} text-stone-500`} colSpan={5}>
                    Nessuna portata nel menu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {righe.length > 0 && (
            <p className="mt-3 text-sm font-medium">
              Food cost menu per coperto:{" "}
              {erroreCosto
                ? `⚠ ${erroreCosto}`
                : formattaEuro(Math.round(costoTotalePorzioneCent))}
            </p>
          )}
        </Riquadro>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Riquadro titolo="Aggiungi ricetta">
          <form action={azioneAggiungiRicettaAMenu} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="menu_id" value={menu.id} />
            <Etichetta testo="Ricetta">
              <select name="ricetta_id" required className={classiInput}>
                {ricetteAttive.map((r) => (
                  <option key={r.id} value={r.id}>
                    {ETICHETTE_PORTATA[r.categoria_portata]} — {r.nome}
                  </option>
                ))}
              </select>
            </Etichetta>
            <Etichetta testo="Ordine">
              <input
                name="ordine"
                inputMode="numeric"
                defaultValue={String(righe.length + 1)}
                className={classiInput}
              />
            </Etichetta>
            <div className="flex items-end">
              <button type="submit" className={classiBottone}>
                Aggiungi
              </button>
            </div>
          </form>
        </Riquadro>

        <Riquadro titolo="Aggiungi materia prima (senza ricetta)">
          <form
            action={azioneAggiungiMateriaPrimaAMenu}
            className="grid gap-4 sm:grid-cols-3"
          >
            <input type="hidden" name="menu_id" value={menu.id} />
            <Etichetta testo="Materia prima">
              <select name="materia_prima_id" required className={classiInput}>
                {materiePrime.map((mp) => (
                  <option key={mp.id} value={mp.id}>
                    {mp.nome} ({mp.unita_uso})
                  </option>
                ))}
              </select>
            </Etichetta>
            <Etichetta testo="Quantità a persona">
              <input name="quantita_persona" required inputMode="decimal" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Ordine">
              <input
                name="ordine"
                inputMode="numeric"
                defaultValue={String(righe.length + 1)}
                className={classiInput}
              />
            </Etichetta>
            <div className="flex items-end sm:col-span-3">
              <button type="submit" className={classiBottone}>
                Aggiungi
              </button>
            </div>
          </form>
        </Riquadro>
      </div>
    </>
  );
}

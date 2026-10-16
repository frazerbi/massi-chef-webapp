import Link from "next/link";
import { classiBottoneSecondario, Riquadro, TitoloPagina } from "@/components/ui";
import {
  ETICHETTA_FORNITORE_MANCANTE,
  formattaQuantita,
} from "@/lib/calc/listaSpesa";
import { formattaEuro } from "@/lib/calc/money";
import { listaSpesaPreventivo } from "@/lib/db/listaSpesa";
import { ETICHETTE_CATEGORIA_BEVANDA } from "@/lib/db/types";

/**
 * CL-4 — lista della spesa del preventivo. Pagina interna: mostra quantità e
 * costi, non va mai al cliente. Mobile-first (sezione da campo, §7): elenco a
 * righe invece di tabelle larghe.
 */
export default async function PaginaListaSpesa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lista = await listaSpesaPreventivo(id);
  const {
    preventivo,
    cliente,
    ospitiTotali,
    gruppi,
    beveraggio: prodottiBeveraggio,
    costoBeveraggioCent,
  } = lista;

  return (
    <>
      <TitoloPagina
        titolo={`Lista della spesa — ${cliente.nome}`}
        sottotitolo={`${preventivo.data_evento} · ${ospitiTotali} ospiti · sfrido ${Number(preventivo.sfrido_pct)}% · stato preventivo: ${preventivo.stato}`}
      >
        <a
          href={`/api/preventivi/${preventivo.id}/spesa/pdf`}
          className={classiBottoneSecondario}
          target="_blank"
        >
          Stampa / PDF
        </a>
        <Link href={`/preventivi/${preventivo.id}`} className={classiBottoneSecondario}>
          Torna al preventivo
        </Link>
      </TitoloPagina>

      <div className="mb-4 rounded-md bg-stone-100 p-3 text-sm text-stone-700">
        Documento interno, non per il cliente. Le quantità includono lo sfrido e,
        per le materie prime con resa sotto il 100%, lo scarto di pulizia; si
        compra arrotondando per eccesso all&apos;unità d&apos;acquisto. Ricette e
        prezzi sono quelli <strong>attuali</strong>, anche se il preventivo è già
        stato inviato. Il magazzino non è ancora sottratto.
      </div>

      <div className="space-y-6">
        <Riquadro titolo="Ricette considerate">
          {lista.ricette.length === 0 ? (
            <p className="text-sm text-stone-500">Nessuna ricetta nel preventivo.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {lista.ricette.map((r, i) => (
                <li key={i} className="flex justify-between gap-3 py-1.5">
                  <span>
                    {r.nome}
                    {r.escludiOpzionali && (
                      <span className="text-stone-500"> · senza opzionali</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {formattaQuantita(r.porzioni, "porzioni")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Riquadro>

        {gruppi.length === 0 && (
          <Riquadro>
            <p className="text-sm text-stone-500">
              Niente da comprare: il preventivo non ha ricette, materie prime o
              consumabili.
            </p>
          </Riquadro>
        )}

        {gruppi.map((g) => (
          <Riquadro key={g.fornitore ?? ""} titolo={g.fornitore ?? ETICHETTA_FORNITORE_MANCANTE}>
            <ul className="divide-y divide-stone-100">
              {g.articoli.map((a) => (
                <li key={`${a.tipo}-${a.id}`} className="flex justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.nome}</p>
                    <p className="text-xs text-stone-500">
                      serve {formattaQuantita(a.quantitaAcquistoEsatta, a.unitaAcquisto)}
                      {a.resaPercentuale < 100 &&
                        ` · pulito ${formattaQuantita(a.quantitaNettaUso, a.unitaUso)} (resa ${a.resaPercentuale}%)`}
                      {a.tipo === "consumabile" && " · consumabile"}
                    </p>
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formattaQuantita(a.unitaDaAcquistare, a.unitaAcquisto)}
                    </p>
                    <p className="text-xs text-stone-500 tabular-nums">
                      {formattaEuro(a.costoAcquistoCent)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-sm text-stone-600">
              Totale fornitore: <strong>{formattaEuro(g.costoAcquistoCent)}</strong>
            </p>
          </Riquadro>
        ))}

        {(prodottiBeveraggio.length > 0 || lista.erroreBeveraggio) && (
          <Riquadro titolo="Beveraggio">
            {lista.erroreBeveraggio ? (
              <p className="text-sm text-red-700">
                Calcolo del beveraggio non riuscito: {lista.erroreBeveraggio}
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {prodottiBeveraggio.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.bevanda.nome}</p>
                      <p className="text-xs text-stone-500">
                        {ETICHETTE_CATEGORIA_BEVANDA[p.categoria]}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {p.colli} colli ({p.unitaAcquistate}{" "}
                        {p.bevanda.unita === "pz" ? "pz" : "unità"})
                      </p>
                      <p className="text-xs text-stone-500 tabular-nums">
                        {formattaEuro(p.costoCent)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {lista.beveraggioIncompleto && (
              <p className="mt-2 text-xs text-amber-800">
                Alcune categorie non hanno un prodotto assegnato nel preventivo e
                qui non compaiono.
              </p>
            )}
          </Riquadro>
        )}

        <Riquadro titolo="Totale spesa stimata">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Cibo e consumabili (unità intere)</dt>
              <dd className="tabular-nums">{formattaEuro(lista.costoAcquistoCent)}</dd>
            </div>
            {prodottiBeveraggio.length > 0 && (
              <div className="flex justify-between">
                <dt>Beveraggio</dt>
                <dd className="tabular-nums">{formattaEuro(costoBeveraggioCent)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200 pt-1 font-semibold">
              <dt>Totale</dt>
              <dd className="tabular-nums">
                {formattaEuro(lista.costoAcquistoCent + costoBeveraggioCent)}
              </dd>
            </div>
            <div className="flex justify-between text-xs text-stone-500">
              <dt>di cui effettivamente usato (cibo e consumabili, senza arrotondamenti)</dt>
              <dd className="tabular-nums">{formattaEuro(lista.costoNecessarioCent)}</dd>
            </div>
          </dl>
        </Riquadro>
      </div>
    </>
  );
}

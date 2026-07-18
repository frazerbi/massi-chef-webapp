import Link from "next/link";
import { elencoMateriePrime } from "@/lib/db/materiePrime";
import { elencoPreventivi } from "@/lib/db/preventivi";
import { elencoRicette } from "@/lib/db/ricette";
import { Riquadro, TitoloPagina } from "@/components/ui";
import { formattaEuro } from "@/lib/calc/money";

export default async function Dashboard() {
  const [materiePrime, ricette, preventivi] = await Promise.all([
    elencoMateriePrime(),
    elencoRicette(),
    elencoPreventivi(),
  ]);

  const bozze = preventivi.filter((p) => p.stato === "bozza");
  const inviati = preventivi.filter((p) => p.stato === "inviato");

  return (
    <>
      <TitoloPagina
        titolo="Dashboard"
        sottotitolo="Fase 1 — core: ricette, beveraggio e preventivi. Eventi, pagamenti e agenda arrivano con la fase 2."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/materie-prime">
          <Riquadro>
            <p className="text-3xl font-semibold">{materiePrime.length}</p>
            <p className="text-sm text-stone-500">Materie prime</p>
          </Riquadro>
        </Link>
        <Link href="/ricette">
          <Riquadro>
            <p className="text-3xl font-semibold">{ricette.length}</p>
            <p className="text-sm text-stone-500">Ricette</p>
          </Riquadro>
        </Link>
        <Link href="/preventivi">
          <Riquadro>
            <p className="text-3xl font-semibold">
              {bozze.length + inviati.length}
            </p>
            <p className="text-sm text-stone-500">
              Preventivi aperti ({bozze.length} bozze, {inviati.length} inviati)
            </p>
          </Riquadro>
        </Link>
      </div>

      <div className="mt-6">
        <Riquadro titolo="Ultimi preventivi">
          {preventivi.length === 0 ? (
            <p className="text-sm text-stone-500">
              Nessun preventivo.{" "}
              <Link href="/preventivi/nuovo" className="underline">
                Crea il primo
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {preventivi.slice(0, 8).map((p) => (
                <li key={p.id} className="py-2">
                  <Link
                    href={`/preventivi/${p.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm hover:underline"
                  >
                    <span>
                      {p.cliente?.nome ?? "—"} · {p.data_evento} ·{" "}
                      {p.numero_ospiti_adulti + p.numero_ospiti_bambini} ospiti ·{" "}
                      {p.tipo}
                    </span>
                    <span className="text-stone-500">
                      {p.stato}
                      {p.prezzo_totale_cent != null &&
                        ` · ${formattaEuro(p.prezzo_totale_cent)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Riquadro>
      </div>
    </>
  );
}

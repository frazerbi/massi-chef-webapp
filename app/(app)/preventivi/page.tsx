import Link from "next/link";
import {
  classiBottone,
  classiTd,
  classiTh,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { formattaEuro } from "@/lib/calc/money";
import { elencoPreventivi } from "@/lib/db/preventivi";
import type { TipoEvento } from "@/lib/db/types";

const FILTRI: Array<{ valore: TipoEvento | ""; etichetta: string }> = [
  { valore: "", etichetta: "Tutti" },
  { valore: "catering", etichetta: "Catering" },
  { valore: "privato", etichetta: "Chef privato" },
];

export default async function PaginaPreventivi({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const filtro = tipo === "catering" || tipo === "privato" ? tipo : undefined;
  const preventivi = await elencoPreventivi(filtro);

  return (
    <>
      <TitoloPagina
        titolo="Preventivi"
        sottotitolo="Il selettore di modalità è solo un filtro di visualizzazione: la base dati è unica."
      >
        <Link href="/preventivi/nuovo" className={classiBottone}>
          Nuovo preventivo
        </Link>
      </TitoloPagina>

      <div className="mb-4 flex gap-2">
        {FILTRI.map((f) => (
          <Link
            key={f.valore}
            href={f.valore ? `/preventivi?tipo=${f.valore}` : "/preventivi"}
            className={`rounded-full px-3 py-1 text-sm ${
              (filtro ?? "") === f.valore
                ? "bg-stone-900 text-white"
                : "border border-stone-300 bg-white hover:bg-stone-100"
            }`}
          >
            {f.etichetta}
          </Link>
        ))}
      </div>

      <Riquadro>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={classiTh}>Cliente</th>
                <th className={classiTh}>Tipo</th>
                <th className={classiTh}>Data evento</th>
                <th className={classiTh}>Ospiti</th>
                <th className={classiTh}>Stato</th>
                <th className={classiTh}>Prezzo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {preventivi.map((p) => (
                <tr key={p.id}>
                  <td className={classiTd}>
                    <Link href={`/preventivi/${p.id}`} className="font-medium hover:underline">
                      {p.cliente?.nome ?? "—"}
                    </Link>
                    {p.revisione_di_id && (
                      <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs">
                        revisione
                      </span>
                    )}
                  </td>
                  <td className={classiTd}>{p.tipo}</td>
                  <td className={classiTd}>{p.data_evento}</td>
                  <td className={classiTd}>
                    {p.numero_ospiti_adulti + p.numero_ospiti_bambini}
                    {p.numero_ospiti_bambini > 0 && (
                      <span className="text-stone-500">
                        {" "}
                        ({p.numero_ospiti_bambini} bambini)
                      </span>
                    )}
                  </td>
                  <td className={classiTd}>{p.stato}</td>
                  <td className={classiTd}>
                    {p.prezzo_totale_cent != null ? formattaEuro(p.prezzo_totale_cent) : "—"}
                  </td>
                </tr>
              ))}
              {preventivi.length === 0 && (
                <tr>
                  <td className={`${classiTd} text-stone-500`} colSpan={6}>
                    Nessun preventivo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Riquadro>
    </>
  );
}

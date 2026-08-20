import Link from "next/link";
import FormBevanda from "@/components/FormBevanda";
import {
  classiBottoneSecondario,
  classiTd,
  classiTh,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { formattaEuro } from "@/lib/calc/money";
import { elencoBevande } from "@/lib/db/bevande";
import { ETICHETTE_CATEGORIA_BEVANDA } from "@/lib/db/types";
import { azioneCreaBevanda, azioneEliminaBevanda } from "./actions";

export default async function PaginaBevande() {
  const bevande = await elencoBevande();

  return (
    <>
      <TitoloPagina
        titolo="Bevande"
        sottotitolo="Catalogo con formati, colli e prezzi: la base del calcolo beveraggio."
      >
        <Link href="/bevande/guida" className="text-sm text-stone-500 hover:underline">
          Come si calcola il beveraggio?
        </Link>
      </TitoloPagina>
      <Riquadro>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={classiTh}>Nome</th>
                <th className={classiTh}>Categoria</th>
                <th className={classiTh}>Formato</th>
                <th className={classiTh}>Capacità</th>
                <th className={classiTh}>Collo</th>
                <th className={classiTh}>Prezzo unità</th>
                <th className={classiTh}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bevande.map((b) => (
                <tr key={b.id}>
                  <td className={classiTd}>
                    <Link href={`/bevande/${b.id}`} className="font-medium hover:underline">
                      {b.nome}
                    </Link>
                  </td>
                  <td className={classiTd}>{ETICHETTE_CATEGORIA_BEVANDA[b.categoria]}</td>
                  <td className={classiTd}>{b.formato_confezione ?? "—"}</td>
                  <td className={classiTd}>
                    {Number(b.capacita_unitaria)} {b.unita}
                  </td>
                  <td className={classiTd}>{b.unita_per_collo} unità</td>
                  <td className={classiTd}>{formattaEuro(b.prezzo_unitario_cent)}</td>
                  <td className={classiTd}>
                    <form action={azioneEliminaBevanda}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" className={classiBottoneSecondario}>
                        Elimina
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {bevande.length === 0 && (
                <tr>
                  <td className={`${classiTd} text-stone-500`} colSpan={7}>
                    Nessuna bevanda: aggiungi acqua, vini, birra… qui sotto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Riquadro>

      <div className="mt-6">
        <Riquadro titolo="Nuova bevanda">
          <FormBevanda azione={azioneCreaBevanda} />
        </Riquadro>
      </div>
    </>
  );
}

import Link from "next/link";
import FormMateriaPrima from "@/components/FormMateriaPrima";
import {
  classiBottoneSecondario,
  classiTd,
  classiTh,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { costoUnitaUsoCent } from "@/lib/calc/materiaPrima";
import { formattaEuro } from "@/lib/calc/money";
import { conteggioUsoInRicette, elencoMateriePrime } from "@/lib/db/materiePrime";
import { azioneAggiornaPrezzo, azioneCreaMateriaPrima } from "./actions";

export default async function PaginaMateriePrime() {
  const [materiePrime, usoInRicette] = await Promise.all([
    elencoMateriePrime(),
    conteggioUsoInRicette(),
  ]);

  return (
    <>
      <TitoloPagina
        titolo="Materie prime"
        sottotitolo="Il costo per unità d'uso tiene conto di conversione e resa: è la base di ogni food cost."
      >
        <Link href="/materie-prime/guida" className="text-sm text-stone-500 hover:underline">
          Come si calcola il costo?
        </Link>
      </TitoloPagina>
      <Riquadro>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={classiTh}>Nome</th>
                <th className={classiTh}>Categoria</th>
                <th className={classiTh}>Prezzo acquisto</th>
                <th className={classiTh}>Resa</th>
                <th className={classiTh}>Costo unità d&apos;uso</th>
                <th className={classiTh}>Ricette</th>
                <th className={classiTh}>Modifica rapida prezzo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {materiePrime.map((mp) => (
                <tr key={mp.id}>
                  <td className={classiTd}>
                    <Link href={`/materie-prime/${mp.id}`} className="font-medium hover:underline">
                      {mp.nome}
                    </Link>
                  </td>
                  <td className={classiTd}>{mp.categoria}</td>
                  <td className={classiTd}>
                    {formattaEuro(mp.prezzo_acquisto_cent)}/{mp.unita_acquisto}
                  </td>
                  <td className={classiTd}>{Number(mp.resa_percentuale)}%</td>
                  <td className={classiTd}>
                    {(
                      costoUnitaUsoCent({
                        prezzoAcquistoCent: Number(mp.prezzo_acquisto_cent),
                        fattoreConversione: Number(mp.fattore_conversione),
                        resaPercentuale: Number(mp.resa_percentuale),
                      }) / 100
                    ).toLocaleString("it-IT", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}{" "}
                    €/{mp.unita_uso}
                  </td>
                  <td className={classiTd}>{usoInRicette.get(mp.id) ?? 0}</td>
                  <td className={classiTd}>
                    <form action={azioneAggiornaPrezzo} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={mp.id} />
                      <input
                        name="prezzo"
                        inputMode="decimal"
                        defaultValue={(mp.prezzo_acquisto_cent / 100)
                          .toFixed(2)
                          .replace(".", ",")}
                        className="w-24 rounded-md border border-stone-300 px-2 py-1 text-sm"
                      />
                      <button type="submit" className={classiBottoneSecondario}>
                        Aggiorna
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {materiePrime.length === 0 && (
                <tr>
                  <td className={`${classiTd} text-stone-500`} colSpan={7}>
                    Nessuna materia prima: aggiungi la prima qui sotto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Riquadro>

      <div className="mt-6">
        <Riquadro titolo="Nuova materia prima">
          <FormMateriaPrima azione={azioneCreaMateriaPrima} />
        </Riquadro>
      </div>
    </>
  );
}

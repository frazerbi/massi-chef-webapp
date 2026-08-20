import Link from "next/link";
import FormConsumabile from "@/components/FormConsumabile";
import {
  classiBottoneSecondario,
  classiTd,
  classiTh,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { formattaEuro } from "@/lib/calc/money";
import { elencoConsumabili } from "@/lib/db/consumabili";
import { azioneCreaConsumabile, azioneEliminaConsumabile } from "./actions";

export default async function PaginaConsumabili() {
  const consumabili = await elencoConsumabili();

  return (
    <>
      <TitoloPagina
        titolo="Consumabili"
        sottotitolo="Materiale non alimentare a consumo: tovaglioli, contenitori, gas…"
      />
      <Riquadro>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={classiTh}>Nome</th>
                <th className={classiTh}>Tipo</th>
                <th className={classiTh}>Categoria</th>
                <th className={classiTh}>Prezzo</th>
                <th className={classiTh}>Fornitore</th>
                <th className={classiTh}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {consumabili.map((c) => (
                <tr key={c.id}>
                  <td className={classiTd}>
                    <Link href={`/consumabili/${c.id}`} className="font-medium hover:underline">
                      {c.nome}
                    </Link>
                  </td>
                  <td className={classiTd}>
                    {c.tipo_consumabile === "apparecchiatura"
                      ? "Apparecchio"
                      : "Cucina"}
                  </td>
                  <td className={classiTd}>{c.categoria}</td>
                  <td className={classiTd}>
                    {formattaEuro(c.prezzo_acquisto_cent)}/{c.unita_acquisto}
                  </td>
                  <td className={classiTd}>{c.fornitore_preferito ?? "—"}</td>
                  <td className={classiTd}>
                    <form action={azioneEliminaConsumabile}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className={classiBottoneSecondario}>
                        Elimina
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {consumabili.length === 0 && (
                <tr>
                  <td className={`${classiTd} text-stone-500`} colSpan={6}>
                    Nessun consumabile registrato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Riquadro>

      <div className="mt-6">
        <Riquadro titolo="Nuovo consumabile">
          <FormConsumabile azione={azioneCreaConsumabile} />
        </Riquadro>
      </div>
    </>
  );
}

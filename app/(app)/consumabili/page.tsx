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
                  <td className={`${classiTd} font-medium`}>{c.nome}</td>
                  <td className={classiTd}>
                    {c.tipo_consumabile === "apparecchiatura"
                      ? "Apparecchiatura"
                      : "Consumabile"}
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
          <form action={azioneCreaConsumabile} className="grid gap-4 sm:grid-cols-2">
            <Etichetta testo="Nome">
              <input name="nome" required className={classiInput} />
            </Etichetta>
            <Etichetta testo="Tipo (gruppo nel preventivo)">
              <select
                name="tipo_consumabile"
                defaultValue="consumabile"
                className={classiInput}
              >
                <option value="consumabile">Consumabile</option>
                <option value="apparecchiatura">Apparecchiatura</option>
              </select>
            </Etichetta>
            <Etichetta testo="Categoria">
              <input name="categoria" required defaultValue="generico" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Unità (acquisto → uso)">
              <select name="unita" defaultValue="conf" className={classiInput}>
                <option value="kg">kg → g</option>
                <option value="l">l → ml</option>
                <option value="pz">pz → pz</option>
                <option value="conf">conf → pz</option>
              </select>
            </Etichetta>
            <Etichetta testo="Prezzo di acquisto (€)">
              <input name="prezzo" required inputMode="decimal" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Fattore di conversione">
              <input name="fattore" required inputMode="decimal" defaultValue="1" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Fornitore (opzionale)">
              <input name="fornitore" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Note">
              <input name="note" className={classiInput} />
            </Etichetta>
            <div className="sm:col-span-2">
              <button type="submit" className={classiBottone}>
                Aggiungi consumabile
              </button>
            </div>
          </form>
        </Riquadro>
      </div>
    </>
  );
}

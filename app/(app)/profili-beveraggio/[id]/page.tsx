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
import { elencoProfili, righeDiProfilo } from "@/lib/db/profiliBeveraggio";
import { ETICHETTE_CATEGORIA_BEVANDA } from "@/lib/db/types";
import {
  azioneEliminaProfilo,
  azioneImpostaRigaProfilo,
  azioneRimuoviRigaProfilo,
} from "../actions";

export default async function PaginaProfiloBeveraggio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profili, righe] = await Promise.all([elencoProfili(), righeDiProfilo(id)]);
  const profilo = profili.find((p) => p.id === id);
  if (!profilo) throw new Error("Profilo beveraggio non trovato");

  return (
    <>
      <TitoloPagina titolo={profilo.nome} sottotitolo={profilo.note ?? undefined}>
        <form action={azioneEliminaProfilo}>
          <input type="hidden" name="id" value={profilo.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Elimina (soft delete)
          </button>
        </form>
      </TitoloPagina>

      <div className="mb-6">
        <Riquadro titolo="Consumi a testa">
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className={classiTh}>Categoria</th>
                <th className={classiTh}>A testa</th>
                <th className={classiTh}>A testa/ora (voci a durata)</th>
                <th className={classiTh}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {righe.map((r) => (
                <tr key={r.id}>
                  <td className={`${classiTd} font-medium`}>
                    {ETICHETTE_CATEGORIA_BEVANDA[r.categoria]}
                  </td>
                  <td className={classiTd}>
                    {Number(r.quantita_a_testa)} {r.unita}
                  </td>
                  <td className={classiTd}>
                    {Number(r.quantita_a_testa_ora) > 0
                      ? `${Number(r.quantita_a_testa_ora)} ${r.unita}/h`
                      : "—"}
                  </td>
                  <td className={classiTd}>
                    <form action={azioneRimuoviRigaProfilo}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="profilo_id" value={profilo.id} />
                      <button type="submit" className={classiBottoneSecondario}>
                        Rimuovi
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {righe.length === 0 && (
                <tr>
                  <td className={`${classiTd} text-stone-500`} colSpan={4}>
                    Nessuna riga nel profilo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Riquadro>
      </div>

      <Riquadro titolo="Aggiungi o modifica riga">
        <form action={azioneImpostaRigaProfilo} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="profilo_id" value={profilo.id} />
          <Etichetta testo="Categoria">
            <select name="categoria" className={classiInput}>
              {Object.entries(ETICHETTE_CATEGORIA_BEVANDA).map(([valore, etichetta]) => (
                <option key={valore} value={valore}>
                  {etichetta}
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
          <Etichetta testo="A testa/ora (opzionale)">
            <input name="quantita_ora" inputMode="decimal" defaultValue="0" className={classiInput} />
          </Etichetta>
          <div className="flex items-end">
            <button type="submit" className={classiBottone}>
              Salva riga
            </button>
          </div>
        </form>
      </Riquadro>
    </>
  );
}

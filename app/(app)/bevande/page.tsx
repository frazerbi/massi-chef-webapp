import Link from "next/link";
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
                  <td className={`${classiTd} font-medium`}>{b.nome}</td>
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
          <form action={azioneCreaBevanda} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Etichetta testo="Nome (es. Vermentino, Acqua naturale 1 l)">
              <input name="nome" required className={classiInput} />
            </Etichetta>
            <Etichetta testo="Categoria">
              <select name="categoria" className={classiInput}>
                {Object.entries(ETICHETTE_CATEGORIA_BEVANDA).map(([valore, etichetta]) => (
                  <option key={valore} value={valore}>
                    {etichetta}
                  </option>
                ))}
              </select>
            </Etichetta>
            <Etichetta testo="Formato confezione (es. bottiglia 0,75 l)">
              <input name="formato" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Capacità della singola unità">
              <input name="capacita" required inputMode="decimal" defaultValue="750" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Unità di misura (ml per liquidi, pz per caffè)">
              <select name="unita" className={classiInput}>
                <option value="ml">ml</option>
                <option value="pz">pz</option>
              </select>
            </Etichetta>
            <Etichetta testo="Unità per collo (es. cartone da 6)">
              <input name="unita_per_collo" required inputMode="numeric" defaultValue="6" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Prezzo per unità (€)">
              <input name="prezzo" required inputMode="decimal" className={classiInput} />
            </Etichetta>
            <Etichetta testo="Note">
              <input name="note" className={classiInput} />
            </Etichetta>
            <div className="flex items-end">
              <button type="submit" className={classiBottone}>
                Aggiungi bevanda
              </button>
            </div>
          </form>
        </Riquadro>
      </div>
    </>
  );
}

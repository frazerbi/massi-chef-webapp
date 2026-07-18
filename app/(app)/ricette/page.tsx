import Link from "next/link";
import {
  classiBottone,
  classiInput,
  classiTd,
  classiTh,
  Etichetta,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { costoPorzioneCent } from "@/lib/calc/ricetta";
import { caricaGrafoCalc } from "@/lib/db/ricette";
import { ETICHETTE_PORTATA, type CategoriaPortata } from "@/lib/db/types";
import { azioneCreaRicetta } from "./actions";

export default async function PaginaRicette() {
  const grafo = await caricaGrafoCalc();
  const ricetteVisibili = grafo.ricetteRighe.filter((r) => r.deleted_at === null);

  const perPortata = new Map<CategoriaPortata, typeof ricetteVisibili>();
  for (const r of ricetteVisibili) {
    if (!perPortata.has(r.categoria_portata)) perPortata.set(r.categoria_portata, []);
    perPortata.get(r.categoria_portata)!.push(r);
  }

  return (
    <>
      <TitoloPagina
        titolo="Ricette"
        sottotitolo="Il costo porzione è sempre calcolato live dai prezzi correnti delle materie prime."
      />

      {[...perPortata.entries()].map(([portata, ricette]) => (
        <div key={portata} className="mb-6">
          <Riquadro titolo={ETICHETTE_PORTATA[portata]}>
            <table className="w-full">
              <thead className="border-b border-stone-200">
                <tr>
                  <th className={classiTh}>Nome</th>
                  <th className={classiTh}>Porzioni base</th>
                  <th className={classiTh}>Costo porzione</th>
                  <th className={classiTh}>Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ricette.map((r) => {
                  let costo: string;
                  try {
                    costo =
                      (
                        costoPorzioneCent(r.id, grafo.ricette, grafo.materiePrime) / 100
                      ).toLocaleString("it-IT", {
                        style: "currency",
                        currency: "EUR",
                      }) + "/porzione";
                  } catch (errore) {
                    costo = `⚠ ${(errore as Error).message}`;
                  }
                  return (
                    <tr key={r.id}>
                      <td className={classiTd}>
                        <Link href={`/ricette/${r.id}`} className="font-medium hover:underline">
                          {r.nome}
                        </Link>
                      </td>
                      <td className={classiTd}>{r.porzioni_base}</td>
                      <td className={classiTd}>{costo}</td>
                      <td className={classiTd}>{r.attiva ? "attiva" : "ritirata"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Riquadro>
        </div>
      ))}
      {ricetteVisibili.length === 0 && (
        <p className="mb-6 text-sm text-stone-500">Nessuna ricetta: crea la prima qui sotto.</p>
      )}

      <Riquadro titolo="Nuova ricetta">
        <form action={azioneCreaRicetta} className="grid gap-4 sm:grid-cols-2">
          <Etichetta testo="Nome">
            <input name="nome" required className={classiInput} />
          </Etichetta>
          <Etichetta testo="Portata">
            <select name="portata" className={classiInput} defaultValue="primo">
              {Object.entries(ETICHETTE_PORTATA).map(([valore, etichetta]) => (
                <option key={valore} value={valore}>
                  {etichetta}
                </option>
              ))}
            </select>
          </Etichetta>
          <Etichetta testo="Porzioni base (per quante porzioni è scritta)">
            <input
              name="porzioni_base"
              required
              inputMode="numeric"
              defaultValue="4"
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Tempo di preparazione (minuti, opzionale)">
            <input name="tempo" inputMode="numeric" className={classiInput} />
          </Etichetta>
          <Etichetta testo="Costo manuale extra per porzione (€, opzionale)">
            <input name="costo_extra" inputMode="decimal" defaultValue="0" className={classiInput} />
          </Etichetta>
          <Etichetta testo="Descrizione">
            <input name="descrizione" className={classiInput} />
          </Etichetta>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="attiva" defaultChecked />
            Attiva (compare nei nuovi menu)
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={classiBottone}>
              Crea ricetta
            </button>
          </div>
        </form>
      </Riquadro>
    </>
  );
}

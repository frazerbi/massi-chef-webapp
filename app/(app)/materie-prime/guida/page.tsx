import Link from "next/link";
import { Riquadro, TitoloPagina, classiTd, classiTh } from "@/components/ui";

const ESEMPI = [
  { acquisto: "kg", uso: "g", fattore: "1000", note: "es. farina, carne" },
  { acquisto: "l", uso: "ml", fattore: "1000", note: "es. olio, latte" },
  { acquisto: "pz", uso: "pz", fattore: "1", note: "es. uova, se usate a pezzo" },
  { acquisto: "conf da 500 g", uso: "g", fattore: "500", note: "il contenuto della confezione" },
  { acquisto: "conf da 6 pz", uso: "pz", fattore: "6", note: "es. cassa di bottiglie" },
];

export default function PaginaGuidaMateriePrime() {
  return (
    <>
      <TitoloPagina
        titolo="Come si calcola il costo?"
        sottotitolo="Cosa inserire per unità di acquisto, unità d'uso, fattore di conversione e resa."
      >
        <Link href="/materie-prime" className="text-sm text-stone-500 hover:underline">
          ← Torna a Materie prime
        </Link>
      </TitoloPagina>

      <div className="space-y-6">
        <Riquadro titolo="La formula">
          <p className="text-sm text-stone-700">
            Il costo reale per unità d&apos;uso (quello usato in tutte le ricette) tiene conto sia della
            conversione tra unità di acquisto e unità d&apos;uso, sia dello scarto di lavorazione (resa):
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-stone-100 p-3 text-sm">
            costo_per_unita_uso = prezzo_acquisto / fattore_conversione / (resa_percentuale / 100)
          </pre>
          <p className="mt-3 text-sm text-stone-700">
            Esempio: branzino intero a 18 €/kg, resa 45% dopo pulizia e sfilettatura, usato in ricetta in
            grammi → fattore di conversione 1000 (kg→g). Costo reale ={" "}
            <strong>18 / 1000 / 0,45 = 0,04 €/g</strong>, cioè 40 €/kg effettivi una volta scontato lo
            scarto.
          </p>
        </Riquadro>

        <Riquadro titolo="Fattore di conversione: cosa inserire">
          <p className="text-sm text-stone-700">
            È il moltiplicatore tra l&apos;unità in cui <strong>acquisti</strong> (kg, l, pz, conf) e
            l&apos;unità in cui <strong>usi</strong> l&apos;ingrediente nelle ricette (g, ml, pz): quante
            unità d&apos;uso ci sono in una unità di acquisto.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-stone-200">
                <tr>
                  <th className={classiTh}>Acquisti in</th>
                  <th className={classiTh}>Usi in</th>
                  <th className={classiTh}>Fattore di conversione</th>
                  <th className={classiTh}>Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ESEMPI.map((riga) => (
                  <tr key={`${riga.acquisto}-${riga.uso}`}>
                    <td className={classiTd}>{riga.acquisto}</td>
                    <td className={classiTd}>{riga.uso}</td>
                    <td className={classiTd}>{riga.fattore}</td>
                    <td className={`${classiTd} text-stone-500`}>{riga.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-stone-700">
            Deve essere sempre maggiore di zero. Non converte peso↔volume: unità di acquisto e unità
            d&apos;uso devono restare sulla stessa grandezza (kg↔g, l↔ml) — mai conversioni implicite tra
            le due.
          </p>
        </Riquadro>

        <Riquadro titolo="Da non confondere con la resa">
          <p className="text-sm text-stone-700">
            Il fattore di conversione riguarda solo la <em>scala</em> dell&apos;unità (kg→g, l→ml). Lo
            scarto di lavorazione — quanto di ciò che acquisti resta effettivamente utilizzabile dopo
            pulizia, cottura, sfilettatura — è un campo separato, la <strong>resa percentuale</strong> (1–100,
            default 100 se non c&apos;è scarto), applicata dopo nella stessa formula.
          </p>
        </Riquadro>
      </div>
    </>
  );
}

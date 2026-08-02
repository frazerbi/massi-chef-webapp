import Link from "next/link";
import { Riquadro, TitoloPagina, classiTd, classiTh } from "@/components/ui";

const PROFILO = [
  { categoria: "Acqua naturale", quantita: "600 ml" },
  { categoria: "Acqua frizzante", quantita: "400 ml" },
  { categoria: "Vino bianco", quantita: "200 ml" },
  { categoria: "Vino rosso", quantita: "200 ml" },
  { categoria: "Bollicine (spumante)", quantita: "100 ml" },
  { categoria: "Birra", quantita: "400 ml" },
  { categoria: "Bibite/succhi", quantita: "400 ml" },
  { categoria: "Caffè", quantita: "1 pz" },
];

export default function PaginaGuidaBevande() {
  return (
    <>
      <TitoloPagina
        titolo="Come si calcola il beveraggio?"
        sottotitolo="Profilo standard, correttivi, fattore di distribuzione e arrotondamenti: come nasce la quantità e il costo per categoria."
      >
        <Link href="/bevande" className="text-sm text-stone-500 hover:underline">
          ← Torna a Bevande
        </Link>
      </TitoloPagina>

      <div className="space-y-6">
        <Riquadro titolo="Il profilo standard a testa">
          <p className="text-sm text-stone-700">
            Punto di partenza per ogni preventivo: quantità teorica per persona, per categoria, prima di
            qualunque correttivo.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[360px]">
              <thead className="border-b border-stone-200">
                <tr>
                  <th className={classiTh}>Categoria</th>
                  <th className={classiTh}>Quantità a testa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {PROFILO.map((r) => (
                  <tr key={r.categoria}>
                    <td className={classiTd}>{r.categoria}</td>
                    <td className={classiTd}>{r.quantita}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Riquadro>

        <Riquadro titolo="Ordine delle operazioni">
          <p className="text-sm text-stone-700">
            Dal profilo standard al costo finale, i passaggi avvengono sempre in questo ordine (vincolante,
            §5.11):
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-stone-100 p-3 text-sm">
            correttivi rapidi → fattore di distribuzione → scalatura ospiti → arrotondamento per eccesso a
            unità e poi a collo
          </pre>
          <p className="mt-3 text-sm text-stone-700">
            La quantità <strong>teorica</strong> (profilo standard × ospiti, senza correttivi) resta sempre
            visibile accanto alla quantità <strong>corretta</strong> (dopo tutta la pipeline), così si vede
            sempre quanto ci si sta scostando dal calcolo automatico.
          </p>
        </Riquadro>

        <Riquadro titolo="1. Correttivi rapidi">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-700">
            <li>
              <strong>Stagione calda</strong>: +30% su acqua (naturale e frizzante) e birra.
            </li>
            <li>
              <strong>Evento lungo</strong> (oltre 4 ore): +20% su tutte le categorie.
            </li>
            <li>
              <strong>Pubblico che beve poco/molto</strong>: rispettivamente −20% / +20%, solo sulle
              categorie alcoliche (vino, bollicine, birra, amari/distillati).
            </li>
          </ul>
          <p className="mt-3 text-sm text-stone-700">
            I correttivi si moltiplicano tra loro quando più di uno è attivo sulla stessa categoria (es.
            stagione calda + evento lungo sulla birra).
          </p>
        </Riquadro>

        <Riquadro titolo="2. Fattore di distribuzione (vino + birra)">
          <p className="text-sm text-stone-700">
            Se sia il vino (bianco o rosso) sia la birra hanno una quantità attiva, si applica una riduzione
            — di default <strong>−25%</strong>, configurabile — ripartita proporzionalmente su vino e
            birra: l&apos;idea è che quando entrambe le opzioni sono disponibili, gli ospiti ne bevono un
            po&apos; meno di ciascuna rispetto ad averne una sola. Lo spumante resta{" "}
            <strong>escluso</strong> dal fattore: è legato al brindisi, non si riduce.
          </p>
        </Riquadro>

        <Riquadro titolo="3. Scalatura ospiti (adulti e bambini)">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-700">
            <li>
              <strong>Alcolici e caffè</strong>: calcolati solo sugli ospiti adulti (i bambini non ne
              ricevono).
            </li>
            <li>
              <strong>Acqua</strong>: quota piena per tutti, adulti e bambini.
            </li>
            <li>
              <strong>Bibite e succhi</strong>: piena per gli adulti, ridotta per i bambini a una quota
              configurabile (default 50%).
            </li>
          </ul>
        </Riquadro>

        <Riquadro titolo="4. Arrotondamento per eccesso">
          <p className="text-sm text-stone-700">
            Il volume corretto e scalato per ospiti viene tradotto in unità di acquisto sempre per{" "}
            <strong>eccesso</strong> (mai per difetto, invariante §4): prima il numero di unità (bottiglie,
            lattine…) necessarie, poi il numero di colli (cartoni) da acquistare per contenerle. La scorta
            residua mostrata è la differenza tra quanto acquistato e quanto effettivamente necessario.
          </p>
        </Riquadro>

        <Riquadro titolo="Più prodotti nella stessa categoria">
          <p className="text-sm text-stone-700">
            Ogni categoria (es. bibite, acqua naturale, caffè) può avere <strong>più prodotti assegnati
            contemporaneamente</strong>, ciascuno con una quota % di quanto copre (es. Aranciata 40% + Tè
            30% + Coca Cola 30% sotto &quot;bibite&quot;): non c&apos;è un tetto sul numero di prodotti per
            categoria, il costo e la copertura si ripartiscono tra quelli assegnati.
          </p>
          <p className="mt-3 text-sm text-stone-700">
            Attenzione all&apos;ordine in cui si inseriscono: il primo prodotto propone di default il 100%
            della quota (tutta la categoria). Se lo si conferma così, la categoria risulta già coperta al
            100% e non si può più aggiungerne un altro finché non si <strong>rimuove</strong> il primo
            prodotto e lo si <strong>reinserisce con una quota più bassa</strong> (non è ancora possibile
            modificare la quota di un prodotto già assegnato). Per inserire più prodotti fin da subito,
            scrivere a mano nel campo quota una percentuale più bassa del 100% (es. 40) quando si aggiunge
            il primo.
          </p>
        </Riquadro>

        <Riquadro titolo="Correggere il valore a mano">
          <p className="text-sm text-stone-700">
            Il valore &quot;corretto&quot; calcolato dalla pipeline può essere sovrascritto a mano per
            singola categoria (solo sui preventivi in bozza): l&apos;override sostituisce l&apos;intero
            risultato di correttivi → distribuzione → scalatura, non lo somma. Il teorico resta comunque
            visibile come riferimento.
          </p>
        </Riquadro>
      </div>
    </>
  );
}

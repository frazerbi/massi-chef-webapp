import {
  classiBottone,
  classiBottoneSecondario,
  classiInput,
  Etichetta,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import {
  conteggioMateriePrimePerCategoria,
  elencoCategorieMateriaPrima,
} from "@/lib/db/categorieMateriaPrima";
import { ottieniImpostazioni } from "@/lib/db/impostazioni";
import {
  azioneCreaCategoria,
  azioneEliminaCategoria,
  azioneRinominaCategoria,
  azioneSalvaImpostazioni,
  azioneSpostaCategoria,
} from "./actions";

export default async function PaginaImpostazioni() {
  const [impostazioni, categorie, conteggi] = await Promise.all([
    ottieniImpostazioni(),
    elencoCategorieMateriaPrima(),
    conteggioMateriePrimePerCategoria(),
  ]);

  return (
    <>
      <TitoloPagina
        titolo="Impostazioni"
        sottotitolo="Default configurabili della specifica: valgono per i nuovi preventivi, non per quelli già inviati."
      />
      <Riquadro>
        <form action={azioneSalvaImpostazioni} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Etichetta testo="Sfrido catering (%)">
            <input
              name="sfrido_catering"
              inputMode="decimal"
              defaultValue={String(impostazioni.sfrido_catering_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Sfrido chef privato (%)">
            <input
              name="sfrido_privato"
              inputMode="decimal"
              defaultValue={String(impostazioni.sfrido_privato_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Fattore di distribuzione vino+birra (%)">
            <input
              name="fattore_distribuzione"
              inputMode="decimal"
              defaultValue={String(impostazioni.fattore_distribuzione_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Quota bibite bambini (%)">
            <input
              name="quota_bibite_bambini"
              inputMode="decimal"
              defaultValue={String(impostazioni.quota_bibite_bambini_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Acconto alla conferma (%)">
            <input
              name="acconto"
              inputMode="decimal"
              defaultValue={String(impostazioni.acconto_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Soglia spesatura attrezzature (€)">
            <input
              name="soglia_spesatura"
              inputMode="decimal"
              defaultValue={(impostazioni.soglia_spesatura_cent / 100)
                .toFixed(2)
                .replace(".", ",")}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Avviso scadenze lotti (giorni)">
            <input
              name="giorni_avviso"
              inputMode="numeric"
              defaultValue={String(impostazioni.giorni_avviso_scadenze)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Validità preventivi (giorni)">
            <input
              name="validita_preventivo"
              inputMode="numeric"
              defaultValue={String(impostazioni.validita_preventivo_giorni)}
              className={classiInput}
            />
          </Etichetta>
          <div className="flex items-end">
            <button type="submit" className={classiBottone}>
              Salva impostazioni
            </button>
          </div>
        </form>
      </Riquadro>

      <div id="categorie" className="mt-6 scroll-mt-4">
        <Riquadro titolo="Categorie delle materie prime">
          <p className="mb-4 text-sm text-stone-500">
            Raggruppano le materie prime nella schermata Prodotti, in quest&apos;ordine. Una
            categoria si può eliminare solo quando è vuota: sposta prima le sue materie prime.
          </p>
          <ul className="divide-y divide-stone-100">
            {categorie.map((c, i) => {
              const quante = conteggi.get(c.id) ?? 0;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                  <form action={azioneRinominaCategoria} className="flex min-w-0 flex-1 gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="nome"
                      required
                      defaultValue={c.nome}
                      aria-label={`Nome della categoria ${c.nome}`}
                      className={`${classiInput} mt-0 min-w-0 flex-1`}
                    />
                    <button type="submit" className={classiBottoneSecondario}>
                      Rinomina
                    </button>
                  </form>
                  <span className="w-28 text-xs text-stone-500">
                    {quante === 1 ? "1 materia prima" : `${quante} materie prime`}
                  </span>
                  <div className="flex gap-1">
                    {(["su", "giu"] as const).map((direzione) => (
                      <form key={direzione} action={azioneSpostaCategoria}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="direzione" value={direzione} />
                        <button
                          type="submit"
                          disabled={direzione === "su" ? i === 0 : i === categorie.length - 1}
                          aria-label={direzione === "su" ? "Sposta su" : "Sposta giù"}
                          className={`${classiBottoneSecondario} disabled:opacity-30`}
                        >
                          {direzione === "su" ? "↑" : "↓"}
                        </button>
                      </form>
                    ))}
                    {quante === 0 && (
                      <form action={azioneEliminaCategoria}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className={classiBottoneSecondario}>
                          Elimina
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
            {categorie.length === 0 && (
              <li className="py-2 text-sm text-stone-500">
                Nessuna categoria: aggiungine almeno una per poter inserire materie prime.
              </li>
            )}
          </ul>
          <form action={azioneCreaCategoria} className="mt-4 flex flex-wrap gap-2">
            <input
              name="nome"
              required
              placeholder="Nuova categoria (es. Salumi)"
              aria-label="Nome della nuova categoria"
              className={`${classiInput} mt-0 min-w-0 flex-1`}
            />
            <button type="submit" className={classiBottone}>
              Aggiungi categoria
            </button>
          </form>
        </Riquadro>
      </div>
    </>
  );
}

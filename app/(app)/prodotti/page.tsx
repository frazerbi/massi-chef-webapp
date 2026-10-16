import Link from "next/link";
import { classiBottone, classiBottoneSecondario, classiInput, TitoloPagina } from "@/components/ui";
import {
  GRUPPO_BEVANDE,
  GRUPPO_SENZA_CATEGORIA,
  raggruppaCatalogo,
  type GruppoCatalogo,
  type VoceCatalogo,
} from "@/lib/calc/catalogoProdotti";
import { formattaEuro } from "@/lib/calc/money";
import { elencoBevande } from "@/lib/db/bevande";
import { elencoCategorieMateriaPrima } from "@/lib/db/categorieMateriaPrima";
import { elencoConsumabili } from "@/lib/db/consumabili";
import { elencoMateriePrime } from "@/lib/db/materiePrime";
import { ETICHETTE_CATEGORIA_BEVANDA, type CategoriaBevanda } from "@/lib/db/types";

/**
 * CL-2: vista unica di materie prime, bevande e consumabili a categorie
 * espandibili. Solo lettura: ogni voce rimanda alla propria scheda, e le
 * tre anagrafiche restano separate (campi e calcoli diversi).
 */

interface VoceMostrata extends VoceCatalogo {
  id: string;
  href: string;
  prezzo: string;
  dettaglio: string | null;
}

/** ordine delle categorie bevanda come nell'enum (acque, vini, …, caffè) */
const ORDINE_BEVANDA = Object.keys(ETICHETTE_CATEGORIA_BEVANDA) as CategoriaBevanda[];

function linkAggiungi(gruppo: GruppoCatalogo<VoceMostrata>): { href: string; testo: string } | null {
  if (gruppo.chiave === GRUPPO_SENZA_CATEGORIA) return null;
  if (gruppo.chiave === GRUPPO_BEVANDE) return { href: "/bevande#nuova", testo: "Nuova bevanda" };
  if (gruppo.tipo === "consumabile") return { href: "/consumabili#nuovo", testo: "Nuovo consumabile" };
  return {
    href: `/materie-prime?categoria=${gruppo.chiave}#nuova`,
    testo: `Nuova materia prima in ${gruppo.titolo}`,
  };
}

export default async function PaginaProdotti({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ricerca = (q ?? "").trim();
  const [categorie, materiePrime, bevande, consumabili] = await Promise.all([
    elencoCategorieMateriaPrima(),
    elencoMateriePrime(),
    elencoBevande(),
    elencoConsumabili(),
  ]);

  const voci: VoceMostrata[] = [
    ...materiePrime.map((mp) => ({
      tipo: "materia_prima" as const,
      id: mp.id,
      nome: mp.nome,
      marca: mp.marca,
      categoriaId: mp.categoria_id,
      href: `/materie-prime/${mp.id}`,
      prezzo: `${formattaEuro(mp.prezzo_acquisto_cent)}/${mp.unita_acquisto}`,
      dettaglio: mp.fornitore_preferito,
    })),
    ...bevande.map((b) => ({
      tipo: "bevanda" as const,
      id: b.id,
      nome: b.nome,
      ordineNelGruppo: ORDINE_BEVANDA.indexOf(b.categoria),
      href: `/bevande/${b.id}`,
      prezzo: `${formattaEuro(b.prezzo_unitario_cent)}/unità`,
      dettaglio: `${ETICHETTE_CATEGORIA_BEVANDA[b.categoria]} · ${Number(b.capacita_unitaria)} ${b.unita}`,
    })),
    ...consumabili.map((c) => ({
      tipo: "consumabile" as const,
      id: c.id,
      nome: c.nome,
      tipoConsumabile: c.tipo_consumabile,
      href: `/consumabili/${c.id}`,
      prezzo: `${formattaEuro(c.prezzo_acquisto_cent)}/${c.unita_acquisto}`,
      dettaglio: c.fornitore_preferito,
    })),
  ];
  const gruppi = raggruppaCatalogo(voci, categorie, ricerca);

  return (
    <>
      <TitoloPagina
        titolo="Prodotti"
        sottotitolo="Materie prime, bevande e consumabili in un solo elenco, per categoria."
      >
        <Link href="/materie-prime#nuova" className={classiBottoneSecondario}>
          + Materia prima
        </Link>
        <Link href="/bevande#nuova" className={classiBottoneSecondario}>
          + Bevanda
        </Link>
        <Link href="/consumabili#nuovo" className={classiBottoneSecondario}>
          + Consumabile
        </Link>
      </TitoloPagina>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={ricerca}
          placeholder="Cerca per nome o marca…"
          aria-label="Cerca prodotti"
          className={`${classiInput} mt-0 min-w-0 flex-1`}
        />
        <button type="submit" className={classiBottone}>
          Cerca
        </button>
        {ricerca && (
          <Link href="/prodotti" className="text-sm text-stone-500 hover:underline">
            Azzera
          </Link>
        )}
      </form>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
        <Link href="/materie-prime" className="hover:underline">
          Tabella materie prime e prezzi
        </Link>
        <Link href="/impostazioni#categorie" className="hover:underline">
          Gestisci categorie
        </Link>
      </div>

      {gruppi.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
          Nessun prodotto corrisponde a «{ricerca}».
        </p>
      ) : (
        <div className="space-y-2">
          {gruppi.map((g) => {
            const aggiungi = linkAggiungi(g);
            return (
              <details
                key={g.chiave}
                open={ricerca !== ""}
                className="group rounded-xl border border-stone-200 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className="inline-block text-stone-400 transition-transform group-open:rotate-90"
                    >
                      ▸
                    </span>
                    {g.titolo}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    {g.voci.length}
                  </span>
                </summary>
                <div className="border-t border-stone-100">
                  {g.chiave === GRUPPO_SENZA_CATEGORIA && (
                    <p className="bg-amber-50 px-4 py-2 text-xs text-amber-800">
                      Apri ogni prodotto e scegli una categoria: da qui in poi è obbligatoria.
                    </p>
                  )}
                  {g.voci.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-stone-500">
                      Nessun prodotto in questa categoria.
                    </p>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {g.voci.map((v) => (
                        <li key={v.id}>
                          <Link
                            href={v.href}
                            className="flex items-start justify-between gap-3 px-4 py-2 hover:bg-stone-50"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{v.nome}</span>
                              {(v.marca || v.dettaglio) && (
                                <span className="block text-xs text-stone-400">
                                  {[v.marca, v.dettaglio].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-sm text-stone-600">{v.prezzo}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {aggiungi && (
                    <div className="border-t border-stone-100 px-4 py-2">
                      <Link href={aggiungi.href} className="text-sm text-stone-500 hover:underline">
                        + {aggiungi.testo}
                      </Link>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}

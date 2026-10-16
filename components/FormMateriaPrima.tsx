"use client";

import Link from "next/link";
import { useState } from "react";
import { classiBottone, classiInput, Etichetta } from "@/components/ui";
import { ALLERGENI_UE, type CategoriaMateriaPrima, type MateriaPrima } from "@/lib/db/types";

/**
 * Form condiviso creazione/modifica materia prima. L'unità è scelta come
 * coppia chiusa acquisto->uso (mai conversioni implicite peso<->volume).
 *
 * UX-001/UX-002: "fattore di conversione" e "resa" sono i due campi che
 * generavano più confusione. Il componente è client-side solo per questo:
 * l'etichetta del fattore cambia secondo l'unità scelta e la resa mostra un
 * esempio calcolato live. Nessuna formula qui — è solo la moltiplicazione
 * mostrata a schermo; il costo vero resta in /lib/calc/materiaPrima.
 */

/** domanda esplicita al posto del termine tecnico, per unità di acquisto */
const DOMANDA_FATTORE: Record<string, string> = {
  kg: "Quanti grammi in 1 kg? (di norma 1000)",
  l: "Quanti millilitri in 1 litro? (di norma 1000)",
  pz: "Quanti pezzi in 1 pezzo? (di norma 1)",
  conf: "Quanti pezzi contiene una confezione?",
};

const UNITA_USO: Record<string, string> = { kg: "g", l: "ml", pz: "pz", conf: "pz" };
export default function FormMateriaPrima({
  azione,
  materiaPrima,
  categorie,
  categoriaPredefinita,
}: {
  azione: (formData: FormData) => Promise<void>;
  materiaPrima?: MateriaPrima;
  /** CL-2: categorie attive, nell'ordine scelto dall'utente */
  categorie: CategoriaMateriaPrima[];
  /** preselezione per una nuova materia prima (link "aggiungi in…" da Prodotti) */
  categoriaPredefinita?: string;
}) {
  const mp = materiaPrima;
  // una categoria eliminata non e' piu' in elenco: si sceglie di nuovo
  const categoriaIniziale =
    [mp?.categoria_id, categoriaPredefinita].find((id) => categorie.some((c) => c.id === id)) ??
    "";
  const [unita, setUnita] = useState<string>(mp?.unita_acquisto ?? "kg");
  const [fattore, setFattore] = useState<string>(mp ? String(mp.fattore_conversione) : "1000");
  const [resa, setResa] = useState<string>(mp ? String(mp.resa_percentuale) : "100");

  const fattoreNum = Number(fattore.replace(",", "."));
  const resaNum = Number(resa.replace(",", "."));
  const utilizzabile =
    Number.isFinite(fattoreNum) && Number.isFinite(resaNum) && fattoreNum > 0 && resaNum > 0
      ? Math.round(fattoreNum * (resaNum / 100) * 100) / 100
      : null;

  return (
    <form action={azione} className="grid gap-4 sm:grid-cols-2">
      {mp && <input type="hidden" name="id" value={mp.id} />}
      <Etichetta testo="Nome">
        <input name="nome" required defaultValue={mp?.nome} className={classiInput} />
      </Etichetta>
      <Etichetta testo="Categoria">
        <select
          name="categoria_id"
          required
          defaultValue={categoriaIniziale}
          className={classiInput}
        >
          <option value="" disabled>
            Scegli…
          </option>
          {categorie.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">
          <Link href="/impostazioni#categorie" className="underline">
            Aggiungi o rinomina categorie
          </Link>
        </p>
      </Etichetta>
      <Etichetta testo="Marca (opzionale, es. Mutti)">
        <input name="marca" defaultValue={mp?.marca ?? ""} className={classiInput} />
      </Etichetta>
      <Etichetta testo="Unità (acquisto → uso)">
        <select
          name="unita"
          value={unita}
          onChange={(e) => setUnita(e.target.value)}
          className={classiInput}
        >
          <option value="kg">kg → g</option>
          <option value="l">l → ml</option>
          <option value="pz">pz → pz</option>
          <option value="conf">conf → pz</option>
        </select>
      </Etichetta>
      <Etichetta testo="Prezzo di acquisto (€ per unità di acquisto)">
        <input
          name="prezzo"
          required
          inputMode="decimal"
          defaultValue={mp ? (mp.prezzo_acquisto_cent / 100).toFixed(2).replace(".", ",") : ""}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo={DOMANDA_FATTORE[unita] ?? "Fattore di conversione"}>
        <input
          name="fattore"
          required
          inputMode="decimal"
          value={fattore}
          onChange={(e) => setFattore(e.target.value)}
          className={classiInput}
        />
        <p className="mt-1 text-xs text-stone-500">
          Serve a convertire il prezzo d&apos;acquisto nell&apos;unità con cui usi il
          prodotto in ricetta ({UNITA_USO[unita] ?? "unità d'uso"}).
        </p>
      </Etichetta>
      <Etichetta testo="Resa utilizzabile (%) — quanto resta dopo pulizia e scarto">
        <input
          name="resa"
          required
          inputMode="decimal"
          value={resa}
          onChange={(e) => setResa(e.target.value)}
          className={classiInput}
        />
        <p className="mt-1 text-xs text-stone-500">
          {utilizzabile != null
            ? `Su 1 ${unita === "conf" ? "confezione" : unita} acquistato, utilizzabili: ${utilizzabile.toLocaleString("it-IT")} ${UNITA_USO[unita] ?? ""}.`
            : "100% = nessuno scarto (prodotto già pulito)."}{" "}
          <Link href="/materie-prime/guida" className="underline">
            Come si calcolano?
          </Link>
        </p>
      </Etichetta>
      <Etichetta testo="Fornitore preferito (opzionale)">
        <input name="fornitore" defaultValue={mp?.fornitore_preferito ?? ""} className={classiInput} />
      </Etichetta>
      <Etichetta testo="Note">
        <input name="note" defaultValue={mp?.note ?? ""} className={classiInput} />
      </Etichetta>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Allergeni (14 UE)</legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {ALLERGENI_UE.map((a) => (
            <label key={a} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="allergeni"
                value={a}
                defaultChecked={mp?.allergeni.includes(a)}
              />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <button type="submit" className={classiBottone}>
          {mp ? "Salva modifiche" : "Aggiungi materia prima"}
        </button>
      </div>
    </form>
  );
}

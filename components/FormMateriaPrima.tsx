import { classiBottone, classiInput, Etichetta } from "@/components/ui";
import { ALLERGENI_UE, type MateriaPrima } from "@/lib/db/types";

/**
 * Form condiviso creazione/modifica materia prima. L'unità è scelta come
 * coppia chiusa acquisto->uso (mai conversioni implicite peso<->volume).
 */
export default function FormMateriaPrima({
  azione,
  materiaPrima,
}: {
  azione: (formData: FormData) => Promise<void>;
  materiaPrima?: MateriaPrima;
}) {
  const mp = materiaPrima;
  return (
    <form action={azione} className="grid gap-4 sm:grid-cols-2">
      {mp && <input type="hidden" name="id" value={mp.id} />}
      <Etichetta testo="Nome">
        <input name="nome" required defaultValue={mp?.nome} className={classiInput} />
      </Etichetta>
      <Etichetta testo="Categoria">
        <input
          name="categoria"
          required
          defaultValue={mp?.categoria ?? "dispensa"}
          list="categorie-mp"
          className={classiInput}
        />
        <datalist id="categorie-mp">
          {["ortofrutta", "carne", "pesce", "dispensa", "latticini", "surgelati", "panetteria"].map(
            (c) => (
              <option key={c} value={c} />
            ),
          )}
        </datalist>
      </Etichetta>
      <Etichetta testo="Marca (opzionale, es. Mutti)">
        <input name="marca" defaultValue={mp?.marca ?? ""} className={classiInput} />
      </Etichetta>
      <Etichetta testo="Unità (acquisto → uso)">
        <select
          name="unita"
          defaultValue={mp?.unita_acquisto ?? "kg"}
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
      <Etichetta testo="Fattore di conversione (unità d'uso per unità di acquisto)">
        <input
          name="fattore"
          required
          inputMode="decimal"
          defaultValue={mp ? String(mp.fattore_conversione) : "1000"}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Resa % (1–100, scarto di pulizia)">
        <input
          name="resa"
          required
          inputMode="decimal"
          defaultValue={mp ? String(mp.resa_percentuale) : "100"}
          className={classiInput}
        />
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

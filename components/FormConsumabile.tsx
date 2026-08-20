import { classiBottone, classiInput, Etichetta } from "@/components/ui";
import type { Consumabile } from "@/lib/db/types";

/**
 * Form condiviso creazione/modifica consumabile (FEATURE-011), stesso pattern
 * di FormMateriaPrima: l'unità è una coppia chiusa acquisto→uso, mai
 * conversioni implicite. `tipo_consumabile` decide il gruppo in cui la voce
 * compare nel preventivo (CL-1).
 */
export default function FormConsumabile({
  azione,
  consumabile,
}: {
  azione: (formData: FormData) => Promise<void>;
  consumabile?: Consumabile;
}) {
  const c = consumabile;
  return (
    <form action={azione} className="grid gap-4 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Etichetta testo="Nome">
        <input name="nome" required defaultValue={c?.nome} className={classiInput} />
      </Etichetta>
      <Etichetta testo="Tipo (gruppo nel preventivo)">
        <select
          name="tipo_consumabile"
          defaultValue={c?.tipo_consumabile ?? "consumabile"}
          className={classiInput}
        >
          <option value="consumabile">Consumabili cucina</option>
          <option value="apparecchiatura">Consumabili apparecchio</option>
        </select>
      </Etichetta>
      <Etichetta testo="Categoria">
        <input
          name="categoria"
          required
          defaultValue={c?.categoria ?? "generico"}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Unità (acquisto → uso)">
        <select
          name="unita"
          defaultValue={c?.unita_acquisto ?? "conf"}
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
          defaultValue={c ? (c.prezzo_acquisto_cent / 100).toFixed(2).replace(".", ",") : ""}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Quante unità d'uso in una unità d'acquisto?">
        <input
          name="fattore"
          required
          inputMode="decimal"
          defaultValue={c ? String(c.fattore_conversione) : "1"}
          className={classiInput}
        />
        <p className="mt-1 text-xs text-stone-500">
          Es. una confezione da 50 tovaglioli → 50; un rotolo da 1 kg → 1000 g.
        </p>
      </Etichetta>
      <Etichetta testo="Fornitore (opzionale)">
        <input
          name="fornitore"
          defaultValue={c?.fornitore_preferito ?? ""}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Note">
        <input name="note" defaultValue={c?.note ?? ""} className={classiInput} />
      </Etichetta>
      <div className="sm:col-span-2">
        <button type="submit" className={classiBottone}>
          {c ? "Salva modifiche" : "Aggiungi consumabile"}
        </button>
      </div>
    </form>
  );
}

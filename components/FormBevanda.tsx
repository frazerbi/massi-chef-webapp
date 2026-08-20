import { classiBottone, classiInput, Etichetta } from "@/components/ui";
import { ETICHETTE_CATEGORIA_BEVANDA, type Bevanda } from "@/lib/db/types";

/**
 * Form condiviso creazione/modifica bevanda (FEATURE-011). Il flag `alcolica`
 * non è nel form: è derivato dalla categoria in /lib/db/bevande, così non può
 * diventare incoerente (bambini esclusi dagli alcolici, §5.11).
 */
export default function FormBevanda({
  azione,
  bevanda,
}: {
  azione: (formData: FormData) => Promise<void>;
  bevanda?: Bevanda;
}) {
  const b = bevanda;
  return (
    <form action={azione} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {b && <input type="hidden" name="id" value={b.id} />}
      <Etichetta testo="Nome (es. Vermentino, Acqua naturale 1 l)">
        <input name="nome" required defaultValue={b?.nome} className={classiInput} />
      </Etichetta>
      <Etichetta testo="Categoria">
        <select name="categoria" defaultValue={b?.categoria} className={classiInput}>
          {Object.entries(ETICHETTE_CATEGORIA_BEVANDA).map(([valore, etichetta]) => (
            <option key={valore} value={valore}>
              {etichetta}
            </option>
          ))}
        </select>
      </Etichetta>
      <Etichetta testo="Formato confezione (es. bottiglia 0,75 l)">
        <input
          name="formato"
          defaultValue={b?.formato_confezione ?? ""}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Capacità della singola unità">
        <input
          name="capacita"
          required
          inputMode="decimal"
          defaultValue={b ? String(b.capacita_unitaria) : "750"}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Unità di misura (ml per liquidi, pz per caffè)">
        <select name="unita" defaultValue={b?.unita ?? "ml"} className={classiInput}>
          <option value="ml">ml</option>
          <option value="pz">pz</option>
        </select>
      </Etichetta>
      <Etichetta testo="Unità per collo (es. cartone da 6)">
        <input
          name="unita_per_collo"
          required
          inputMode="numeric"
          defaultValue={b ? String(b.unita_per_collo) : "6"}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Prezzo per unità (€)">
        <input
          name="prezzo"
          required
          inputMode="decimal"
          defaultValue={b ? (b.prezzo_unitario_cent / 100).toFixed(2).replace(".", ",") : ""}
          className={classiInput}
        />
      </Etichetta>
      <Etichetta testo="Note">
        <input name="note" defaultValue={b?.note ?? ""} className={classiInput} />
      </Etichetta>
      <div className="flex items-end">
        <button type="submit" className={classiBottone}>
          {b ? "Salva modifiche" : "Aggiungi bevanda"}
        </button>
      </div>
    </form>
  );
}

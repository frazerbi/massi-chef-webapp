import {
  classiBottone,
  classiInput,
  Etichetta,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { elencoClienti } from "@/lib/db/clienti";
import { elencoMenu } from "@/lib/db/menu";
import { elencoProfili } from "@/lib/db/profiliBeveraggio";
import { azioneCreaPreventivo } from "../actions";

export default async function PaginaNuovoPreventivo() {
  const [clienti, menu, profili] = await Promise.all([
    elencoClienti(),
    elencoMenu(),
    elencoProfili(),
  ]);

  return (
    <>
      <TitoloPagina
        titolo="Nuovo preventivo"
        sottotitolo="Cliente → tipo → data e ospiti → menu → profilo beveraggio. Righe, extra e prezzi si completano nella scheda."
      />
      <Riquadro>
        <form action={azioneCreaPreventivo} className="grid gap-4 sm:grid-cols-2">
          <Etichetta testo="Cliente esistente">
            <select name="cliente_id" defaultValue="" className={classiInput}>
              <option value="">— nessuno: creane uno nuovo →</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Etichetta>
          <Etichetta testo="…oppure nuovo cliente (nome)">
            <input name="nuovo_cliente" className={classiInput} />
          </Etichetta>
          <Etichetta testo="Tipo di servizio">
            <select name="tipo" className={classiInput}>
              <option value="catering">Catering (sfrido default 10%)</option>
              <option value="privato">Chef privato (sfrido default 5%)</option>
            </select>
          </Etichetta>
          <Etichetta testo="Data evento">
            <input type="date" name="data_evento" required className={classiInput} />
          </Etichetta>
          <Etichetta testo="Ospiti adulti">
            <input name="adulti" required inputMode="numeric" className={classiInput} />
          </Etichetta>
          <Etichetta testo="Ospiti bambini (solo analcolico, bibite ridotte)">
            <input name="bambini" inputMode="numeric" defaultValue="0" className={classiInput} />
          </Etichetta>
          <Etichetta testo="Margine target % (per il prezzo suggerito)">
            <input name="margine" required inputMode="decimal" placeholder="es. 30" className={classiInput} />
          </Etichetta>
          <Etichetta testo="Menu di partenza (opzionale, ne viene fatta una copia)">
            <select name="menu_id" defaultValue="" className={classiInput}>
              <option value="">— nessuno</option>
              {menu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Etichetta>
          <Etichetta testo="Profilo beveraggio (opzionale, copiato e modificabile)">
            <select name="profilo_id" defaultValue="" className={classiInput}>
              <option value="">— senza beveraggio (solo servizio)</option>
              {profili.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Etichetta>
          <div className="flex items-end">
            <button type="submit" className={classiBottone}>
              Crea bozza
            </button>
          </div>
        </form>
      </Riquadro>
    </>
  );
}

import Link from "next/link";
import {
  classiBottone,
  classiInput,
  Etichetta,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { elencoMenu } from "@/lib/db/menu";
import { azioneCreaMenu } from "./actions";

export default async function PaginaMenu() {
  const menu = await elencoMenu();

  return (
    <>
      <TitoloPagina
        titolo="Menu"
        sottotitolo="Composizioni riutilizzabili di ricette: il preventivo ne fa una copia."
      />
      <Riquadro>
        {menu.length === 0 ? (
          <p className="text-sm text-stone-500">Nessun menu: crea il primo qui sotto.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {menu.map((m) => (
              <li key={m.id} className="py-2">
                <Link href={`/menu/${m.id}`} className="font-medium hover:underline">
                  {m.nome}
                </Link>
                {m.descrizione && (
                  <span className="ml-2 text-sm text-stone-500">{m.descrizione}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Riquadro>

      <div className="mt-6">
        <Riquadro titolo="Nuovo menu">
          <form action={azioneCreaMenu} className="grid gap-4 sm:grid-cols-2">
            <Etichetta testo="Nome (es. Menu Mare 3 portate)">
              <input name="nome" required className={classiInput} />
            </Etichetta>
            <Etichetta testo="Descrizione">
              <input name="descrizione" className={classiInput} />
            </Etichetta>
            <div className="sm:col-span-2">
              <button type="submit" className={classiBottone}>
                Crea menu
              </button>
            </div>
          </form>
        </Riquadro>
      </div>
    </>
  );
}

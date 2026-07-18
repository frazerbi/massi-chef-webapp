import Link from "next/link";
import {
  classiBottone,
  classiBottoneSecondario,
  classiInput,
  Etichetta,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { elencoProfili } from "@/lib/db/profiliBeveraggio";
import { azioneCreaProfilo, azioneCreaProfiloStandard } from "./actions";

export default async function PaginaProfiliBeveraggio() {
  const profili = await elencoProfili();

  return (
    <>
      <TitoloPagina
        titolo="Profili beveraggio"
        sottotitolo="Template di consumi a testa per tipo di servizio (pranzo placée, aperitivo, matrimonio…)."
      >
        <form action={azioneCreaProfiloStandard}>
          <button type="submit" className={classiBottoneSecondario}>
            Crea profilo standard (specifica §5.11)
          </button>
        </form>
      </TitoloPagina>

      <Riquadro>
        {profili.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nessun profilo: parti dal profilo standard o creane uno tuo.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {profili.map((p) => (
              <li key={p.id} className="py-2">
                <Link href={`/profili-beveraggio/${p.id}`} className="font-medium hover:underline">
                  {p.nome}
                </Link>
                {p.note && <span className="ml-2 text-sm text-stone-500">{p.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </Riquadro>

      <div className="mt-6">
        <Riquadro titolo="Nuovo profilo">
          <form action={azioneCreaProfilo} className="grid gap-4 sm:grid-cols-2">
            <Etichetta testo="Nome (es. Aperitivo rinforzato)">
              <input name="nome" required className={classiInput} />
            </Etichetta>
            <Etichetta testo="Note">
              <input name="note" className={classiInput} />
            </Etichetta>
            <div className="sm:col-span-2">
              <button type="submit" className={classiBottone}>
                Crea profilo
              </button>
            </div>
          </form>
        </Riquadro>
      </div>
    </>
  );
}

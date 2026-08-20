import FormBevanda from "@/components/FormBevanda";
import { classiBottoneSecondario, Riquadro, TitoloPagina } from "@/components/ui";
import { bevandaPerId } from "@/lib/db/bevande";
import { ETICHETTE_CATEGORIA_BEVANDA } from "@/lib/db/types";
import { azioneAggiornaBevanda, azioneEliminaBevanda } from "../actions";

export default async function PaginaModificaBevanda({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bevanda = await bevandaPerId(id);

  return (
    <>
      <TitoloPagina
        titolo={bevanda.nome}
        sottotitolo={`${ETICHETTE_CATEGORIA_BEVANDA[bevanda.categoria]} · ${Number(bevanda.capacita_unitaria)} ${bevanda.unita} per unità`}
      >
        <form action={azioneEliminaBevanda}>
          <input type="hidden" name="id" value={bevanda.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Elimina (soft delete)
          </button>
        </form>
      </TitoloPagina>
      <Riquadro>
        <FormBevanda azione={azioneAggiornaBevanda} bevanda={bevanda} />
      </Riquadro>
    </>
  );
}

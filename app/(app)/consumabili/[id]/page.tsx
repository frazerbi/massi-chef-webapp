import FormConsumabile from "@/components/FormConsumabile";
import { classiBottoneSecondario, Riquadro, TitoloPagina } from "@/components/ui";
import { consumabilePerId } from "@/lib/db/consumabili";
import { azioneAggiornaConsumabile, azioneEliminaConsumabile } from "../actions";

export default async function PaginaModificaConsumabile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const consumabile = await consumabilePerId(id);

  return (
    <>
      <TitoloPagina titolo={consumabile.nome}>
        <form action={azioneEliminaConsumabile}>
          <input type="hidden" name="id" value={consumabile.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Elimina (soft delete)
          </button>
        </form>
      </TitoloPagina>
      <Riquadro>
        <FormConsumabile azione={azioneAggiornaConsumabile} consumabile={consumabile} />
      </Riquadro>
    </>
  );
}

import FormMateriaPrima from "@/components/FormMateriaPrima";
import { classiBottoneSecondario, Riquadro, TitoloPagina } from "@/components/ui";
import { materiaPrimaPerId } from "@/lib/db/materiePrime";
import { azioneAggiornaMateriaPrima, azioneEliminaMateriaPrima } from "../actions";

export default async function PaginaModificaMateriaPrima({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const materiaPrima = await materiaPrimaPerId(id);

  return (
    <>
      <TitoloPagina titolo={materiaPrima.nome}>
        <form action={azioneEliminaMateriaPrima}>
          <input type="hidden" name="id" value={materiaPrima.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Elimina (soft delete)
          </button>
        </form>
      </TitoloPagina>
      <Riquadro>
        <FormMateriaPrima azione={azioneAggiornaMateriaPrima} materiaPrima={materiaPrima} />
      </Riquadro>
    </>
  );
}

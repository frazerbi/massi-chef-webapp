import FormMateriaPrima from "@/components/FormMateriaPrima";
import { classiBottoneSecondario, Riquadro, TitoloPagina } from "@/components/ui";
import { elencoCategorieMateriaPrima } from "@/lib/db/categorieMateriaPrima";
import { materiaPrimaPerId } from "@/lib/db/materiePrime";
import { azioneAggiornaMateriaPrima, azioneEliminaMateriaPrima } from "../actions";

export default async function PaginaModificaMateriaPrima({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [materiaPrima, categorie] = await Promise.all([
    materiaPrimaPerId(id),
    elencoCategorieMateriaPrima(),
  ]);

  return (
    <>
      <TitoloPagina titolo={materiaPrima.nome} sottotitolo={materiaPrima.marca ?? undefined}>
        <form action={azioneEliminaMateriaPrima}>
          <input type="hidden" name="id" value={materiaPrima.id} />
          <button type="submit" className={classiBottoneSecondario}>
            Elimina (soft delete)
          </button>
        </form>
      </TitoloPagina>
      <Riquadro>
        <FormMateriaPrima azione={azioneAggiornaMateriaPrima} materiaPrima={materiaPrima}
          categorie={categorie}
        />
      </Riquadro>
    </>
  );
}

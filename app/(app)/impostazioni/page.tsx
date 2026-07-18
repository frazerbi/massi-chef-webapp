import {
  classiBottone,
  classiInput,
  Etichetta,
  Riquadro,
  TitoloPagina,
} from "@/components/ui";
import { ottieniImpostazioni } from "@/lib/db/impostazioni";
import { azioneSalvaImpostazioni } from "./actions";

export default async function PaginaImpostazioni() {
  const impostazioni = await ottieniImpostazioni();

  return (
    <>
      <TitoloPagina
        titolo="Impostazioni"
        sottotitolo="Default configurabili della specifica: valgono per i nuovi preventivi, non per quelli già inviati."
      />
      <Riquadro>
        <form action={azioneSalvaImpostazioni} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Etichetta testo="Sfrido catering (%)">
            <input
              name="sfrido_catering"
              inputMode="decimal"
              defaultValue={String(impostazioni.sfrido_catering_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Sfrido chef privato (%)">
            <input
              name="sfrido_privato"
              inputMode="decimal"
              defaultValue={String(impostazioni.sfrido_privato_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Fattore di distribuzione vino+birra (%)">
            <input
              name="fattore_distribuzione"
              inputMode="decimal"
              defaultValue={String(impostazioni.fattore_distribuzione_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Quota bibite bambini (%)">
            <input
              name="quota_bibite_bambini"
              inputMode="decimal"
              defaultValue={String(impostazioni.quota_bibite_bambini_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Acconto alla conferma (%)">
            <input
              name="acconto"
              inputMode="decimal"
              defaultValue={String(impostazioni.acconto_pct)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Soglia spesatura attrezzature (€)">
            <input
              name="soglia_spesatura"
              inputMode="decimal"
              defaultValue={(impostazioni.soglia_spesatura_cent / 100)
                .toFixed(2)
                .replace(".", ",")}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Avviso scadenze lotti (giorni)">
            <input
              name="giorni_avviso"
              inputMode="numeric"
              defaultValue={String(impostazioni.giorni_avviso_scadenze)}
              className={classiInput}
            />
          </Etichetta>
          <Etichetta testo="Validità preventivi (giorni)">
            <input
              name="validita_preventivo"
              inputMode="numeric"
              defaultValue={String(impostazioni.validita_preventivo_giorni)}
              className={classiInput}
            />
          </Etichetta>
          <div className="flex items-end">
            <button type="submit" className={classiBottone}>
              Salva impostazioni
            </button>
          </div>
        </form>
      </Riquadro>
    </>
  );
}

/**
 * PDF del preventivo (documento per il cliente: mostra i PREZZI, mai i costi
 * interni). Generato lato server dall'API route /api/preventivi/[id]/pdf.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formattaEuro } from "@/lib/calc/money";
import type { CalcoloPreventivo } from "@/lib/db/preventivi";
import { ETICHETTE_CATEGORIA_BEVANDA } from "@/lib/db/types";

const stili = StyleSheet.create({
  pagina: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  titolo: { fontSize: 20, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  sottotitolo: { fontSize: 10, color: "#57534e", marginBottom: 16 },
  sezione: { marginTop: 14 },
  intestazioneSezione: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#d6d3d1",
  },
  rigaTabella: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e5e4",
  },
  colDescrizione: { flex: 3 },
  colNumero: { flex: 1, textAlign: "right" },
  totale: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 8 },
  nota: { marginTop: 4, color: "#57534e" },
});

function RigaPrezzo({
  descrizione,
  quantita,
  prezzoUnitarioCent,
}: {
  descrizione: string;
  quantita: number;
  prezzoUnitarioCent: number | null;
}) {
  return (
    <View style={stili.rigaTabella}>
      <Text style={stili.colDescrizione}>{descrizione}</Text>
      <Text style={stili.colNumero}>{quantita}</Text>
      <Text style={stili.colNumero}>
        {prezzoUnitarioCent != null ? formattaEuro(prezzoUnitarioCent) : "—"}
      </Text>
      <Text style={stili.colNumero}>
        {prezzoUnitarioCent != null
          ? formattaEuro(Math.round(prezzoUnitarioCent * quantita))
          : "—"}
      </Text>
    </View>
  );
}

function DocumentoPreventivo({ calcolo }: { calcolo: CalcoloPreventivo }) {
  const { dati, beveraggio, totali, quantitaEffettivaRighe } = calcolo;
  const { preventivo, cliente, righe, beveraggio: configBev } = dati;
  const ospitiTotali =
    preventivo.numero_ospiti_adulti + preventivo.numero_ospiti_bambini;
  const prezzoFinaleCent = preventivo.prezzo_totale_cent ?? totali.prezzoTotaleCent;

  return (
    <Document>
      <Page size="A4" style={stili.pagina}>
        <Text style={stili.titolo}>Preventivo</Text>
        <Text style={stili.sottotitolo}>
          {preventivo.tipo === "catering" ? "Servizio catering" : "Servizio chef privato"} ·
          data evento {preventivo.data_evento} · {ospitiTotali} ospiti
          {preventivo.numero_ospiti_bambini > 0
            ? ` (di cui ${preventivo.numero_ospiti_bambini} bambini)`
            : ""}
        </Text>

        <View>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Cliente: {cliente.nome}</Text>
          {cliente.email ? <Text>{cliente.email}</Text> : null}
          {cliente.telefono ? <Text>{cliente.telefono}</Text> : null}
        </View>

        <View style={stili.sezione}>
          <Text style={stili.intestazioneSezione}>Menu e servizi</Text>
          <View style={[stili.rigaTabella, { borderBottomColor: "#a8a29e" }]}>
            <Text style={[stili.colDescrizione, { fontFamily: "Helvetica-Bold" }]}>
              Descrizione
            </Text>
            <Text style={[stili.colNumero, { fontFamily: "Helvetica-Bold" }]}>Qtà</Text>
            <Text style={[stili.colNumero, { fontFamily: "Helvetica-Bold" }]}>
              Prezzo unit.
            </Text>
            <Text style={[stili.colNumero, { fontFamily: "Helvetica-Bold" }]}>Totale</Text>
          </View>
          {righe.map((riga) => (
            <RigaPrezzo
              key={riga.id}
              descrizione={riga.descrizione}
              quantita={quantitaEffettivaRighe.get(riga.id) ?? Number(riga.quantita)}
              prezzoUnitarioCent={riga.prezzo_unitario_cent}
            />
          ))}
        </View>

        {configBev?.attivo && beveraggio && (
          <View style={stili.sezione}>
            <Text style={stili.intestazioneSezione}>Beveraggio</Text>
            {configBev.esposizione === "a_corpo" && (
              <Text>
                Beveraggio completo per {ospitiTotali} ospiti, incluso nel servizio.
              </Text>
            )}
            {configBev.esposizione === "a_testa" && (
              <>
                {beveraggio.righe
                  .filter((r) => r.volumeCorretto > 0)
                  .map((r) => (
                    <Text key={r.categoria}>
                      {ETICHETTE_CATEGORIA_BEVANDA[r.categoria]}:{" "}
                      {Math.round(
                        r.volumeCorretto /
                          Math.max(1, preventivo.numero_ospiti_adulti),
                      )}{" "}
                      {r.unita} a persona (adulti)
                    </Text>
                  ))}
              </>
            )}
            {configBev.esposizione === "dettaglio" && (
              <>
                {beveraggio.righe
                  .filter((r) => r.prodotti.length > 0)
                  .map((r) => (
                    <Text key={r.categoria}>
                      {ETICHETTE_CATEGORIA_BEVANDA[r.categoria]}:{" "}
                      {r.prodotti
                        .map((p) => `${p.unitaAcquistate} unità (${p.bevanda.nome})`)
                        .join(", ")}
                    </Text>
                  ))}
              </>
            )}
          </View>
        )}

        <View style={stili.sezione}>
          <Text style={stili.totale}>
            Totale proposto: {formattaEuro(prezzoFinaleCent)}
          </Text>
          <Text style={[stili.nota, { textAlign: "right" }]}>
            Prezzi netti; IVA esclusa ove applicabile.
          </Text>
        </View>

        {preventivo.note_cliente && (
          <View style={stili.sezione}>
            <Text style={stili.intestazioneSezione}>Note</Text>
            <Text>{preventivo.note_cliente}</Text>
          </View>
        )}
        {preventivo.condizioni && (
          <View style={stili.sezione}>
            <Text style={stili.intestazioneSezione}>Condizioni</Text>
            <Text>{preventivo.condizioni}</Text>
          </View>
        )}

        <View style={stili.sezione}>
          <Text style={stili.nota}>
            Validità dell&apos;offerta: {preventivo.validita_giorni} giorni
            {preventivo.inviato_at
              ? ` dall'invio (${preventivo.inviato_at.slice(0, 10)})`
              : " dalla data di invio"}
            .
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generaPdfPreventivo(
  calcolo: CalcoloPreventivo,
): Promise<Buffer> {
  return renderToBuffer(<DocumentoPreventivo calcolo={calcolo} />);
}

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
import { raggruppaRighePreventivo } from "@/lib/calc/raggruppamentoPreventivo";
import type { CalcoloPreventivo } from "@/lib/db/preventivi";
import {
  ETICHETTE_CATEGORIA_BEVANDA,
  type Consumabile,
  type MateriaPrima,
  type PreventivoRiga,
  type Ricetta,
} from "@/lib/db/types";

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
  intestazioneGruppo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 2,
    color: "#44403c",
  },
  totale: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 8 },
  nota: { marginTop: 4, color: "#57534e" },
});

/** Arrotonda a 3 decimali per la presentazione (invariante §4.6: le quantità
 * si arrotondano solo in visualizzazione, mai nei calcoli), evitando i residui
 * in virgola mobile (es. 3520.0000000000005) sui numeri passati al PDF. */
function arrotondaQuantita(quantita: number): number {
  return Math.round(quantita * 1000) / 1000;
}

function RigaPrezzo({
  descrizione,
  quantita,
  unita,
  prezzoUnitarioCent,
}: {
  descrizione: string;
  quantita: number;
  unita: string;
  prezzoUnitarioCent: number | null;
}) {
  const quantitaArrotondata = arrotondaQuantita(quantita);
  return (
    <View style={stili.rigaTabella}>
      <Text style={stili.colDescrizione}>{descrizione}</Text>
      <Text style={stili.colNumero}>
        {quantitaArrotondata}
        {unita ? ` ${unita}` : ""}
      </Text>
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

function unitaRiga(
  riga: PreventivoRiga,
  materiePrimePerId: Map<string, MateriaPrima>,
  consumabiliPerId: Map<string, Consumabile>,
): string {
  if (riga.tipo_riga === "ricetta") return "porzioni";
  if (riga.tipo_riga === "materia_prima" && riga.materia_prima_id) {
    return materiePrimePerId.get(riga.materia_prima_id)?.unita_uso ?? "";
  }
  if (riga.tipo_riga === "consumabile" && riga.consumabile_id) {
    return consumabiliPerId.get(riga.consumabile_id)?.unita_uso ?? "";
  }
  return "";
}

/** CL-1: dati minimi per il raggruppamento, più la riga originale da stampare.
 * Nessun subtotale per gruppo (decisione del 20/08/2026): le categorie sono
 * solo intestazioni, il totale resta uno solo in fondo. */
function descrittoreRiga(
  riga: PreventivoRiga,
  ricettePerId: Map<string, Ricetta>,
  consumabiliPerId: Map<string, Consumabile>,
) {
  return {
    riga,
    tipoRiga: riga.tipo_riga,
    categoriaPortata: riga.ricetta_id
      ? ricettePerId.get(riga.ricetta_id)?.categoria_portata ?? null
      : null,
    tipoConsumabile: riga.consumabile_id
      ? consumabiliPerId.get(riga.consumabile_id)?.tipo_consumabile ?? null
      : null,
  };
}

function DocumentoPreventivo({ calcolo }: { calcolo: CalcoloPreventivo }) {
  const { dati, beveraggio, totali, quantitaEffettivaRighe, materiePrime, consumabili, ricette } =
    calcolo;
  const { preventivo, cliente, righe, beveraggio: configBev } = dati;
  const ospitiTotali =
    preventivo.numero_ospiti_adulti + preventivo.numero_ospiti_bambini;
  const prezzoFinaleCent = preventivo.prezzo_totale_cent ?? totali.prezzoTotaleCent;
  const materiePrimePerId = new Map(materiePrime.map((mp) => [mp.id, mp]));
  const consumabiliPerId = new Map(consumabili.map((c) => [c.id, c]));
  const ricettePerId = new Map(ricette.map((r) => [r.id, r]));
  // CL-1: solo riordino di presentazione — nessun costo e nessun prezzo cambia
  const gruppi = raggruppaRighePreventivo(
    righe.map((riga) => descrittoreRiga(riga, ricettePerId, consumabiliPerId)),
  );

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
          {gruppi.map((gruppo) => (
            <View key={gruppo.chiave}>
              <Text style={stili.intestazioneGruppo} minPresenceAhead={40}>
                {gruppo.etichetta}
              </Text>
              {gruppo.righe.map(({ riga }) => (
                <RigaPrezzo
                  key={riga.id}
                  descrizione={riga.descrizione}
                  quantita={quantitaEffettivaRighe.get(riga.id) ?? Number(riga.quantita)}
                  unita={unitaRiga(riga, materiePrimePerId, consumabiliPerId)}
                  prezzoUnitarioCent={riga.prezzo_unitario_cent}
                />
              ))}
            </View>
          ))}
        </View>

        {configBev?.attivo && beveraggio && (
          <View style={stili.sezione}>
            <Text style={stili.intestazioneSezione}>Beveraggio</Text>
            {beveraggio.righe
              .filter((r) => r.volumeCorretto > 0)
              .map((r) => (
                <View key={r.categoria} style={{ marginBottom: 4 }}>
                  <Text>
                    {ETICHETTE_CATEGORIA_BEVANDA[r.categoria]}: {arrotondaQuantita(r.volumeCorretto)}{" "}
                    {r.unita}
                  </Text>
                  {r.prodotti.map((p) => (
                    <Text key={p.bevanda.id} style={{ marginLeft: 12, color: "#57534e" }}>
                      {p.bevanda.nome}: {arrotondaQuantita(p.volumeAssegnato)} {r.unita} (
                      {p.unitaAcquistate} {p.bevanda.unita === "pz" ? "pz" : "unità"})
                    </Text>
                  ))}
                  {r.prodotti.length === 0 && (
                    <Text style={{ marginLeft: 12, color: "#57534e" }}>
                      Nessun prodotto assegnato
                    </Text>
                  )}
                </View>
              ))}
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

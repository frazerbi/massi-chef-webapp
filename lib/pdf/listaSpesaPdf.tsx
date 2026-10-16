/**
 * CL-4 — PDF della lista della spesa. Documento INTERNO: mostra quantità e
 * costi stimati, non va al cliente. Una casella da spuntare per ogni riga,
 * così si usa stampato al banco del fornitore.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  ETICHETTA_FORNITORE_MANCANTE,
  formattaQuantita,
} from "@/lib/calc/listaSpesa";
import { formattaEuro } from "@/lib/calc/money";
import type { ListaSpesaPreventivo } from "@/lib/db/listaSpesa";
import { ETICHETTE_CATEGORIA_BEVANDA } from "@/lib/db/types";

const stili = StyleSheet.create({
  pagina: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  titolo: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  sottotitolo: { fontSize: 10, color: "#57534e", marginBottom: 4 },
  avviso: { fontSize: 8, color: "#57534e", marginBottom: 12 },
  sezione: { marginTop: 14 },
  intestazioneSezione: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#d6d3d1",
  },
  riga: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e5e4",
  },
  casella: {
    width: 9,
    height: 9,
    borderWidth: 0.8,
    borderColor: "#44403c",
    marginRight: 8,
  },
  colNome: { flex: 3 },
  dettaglio: { fontSize: 8, color: "#78716c" },
  colQuantita: { flex: 1.2, textAlign: "right", fontFamily: "Helvetica-Bold" },
  colCosto: { flex: 1, textAlign: "right" },
  totaleGruppo: { textAlign: "right", marginTop: 4, color: "#44403c" },
  totale: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 4 },
  nota: { fontSize: 8, color: "#78716c", textAlign: "right" },
});

function Riga({
  nome,
  dettaglio,
  quantita,
  costoCent,
}: {
  nome: string;
  dettaglio: string;
  quantita: string;
  costoCent: number;
}) {
  return (
    <View style={stili.riga} wrap={false}>
      <View style={stili.casella} />
      <View style={stili.colNome}>
        <Text>{nome}</Text>
        {dettaglio && <Text style={stili.dettaglio}>{dettaglio}</Text>}
      </View>
      <Text style={stili.colQuantita}>{quantita}</Text>
      <Text style={stili.colCosto}>{formattaEuro(costoCent)}</Text>
    </View>
  );
}

function DocumentoListaSpesa({ lista }: { lista: ListaSpesaPreventivo }) {
  const { preventivo, cliente, ospitiTotali, gruppi, beveraggio } = lista;
  return (
    <Document title={`Lista spesa — ${cliente.nome}`}>
      <Page size="A4" style={stili.pagina}>
        <Text style={stili.titolo}>Lista della spesa — {cliente.nome}</Text>
        <Text style={stili.sottotitolo}>
          Evento del {preventivo.data_evento} · {ospitiTotali} ospiti · sfrido{" "}
          {Number(preventivo.sfrido_pct)}%
        </Text>
        <Text style={stili.avviso}>
          Documento interno. Quantità con sfrido e scarto di pulizia, arrotondate
          per eccesso all&apos;unità d&apos;acquisto; ricette e prezzi attuali;
          magazzino non sottratto. Generata il{" "}
          {new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}.
        </Text>

        {lista.ricette.length > 0 && (
          <View style={stili.sezione}>
            <Text style={stili.intestazioneSezione}>Ricette considerate</Text>
            <Text style={stili.dettaglio}>
              {lista.ricette
                .map(
                  (r) =>
                    `${r.nome}: ${formattaQuantita(r.porzioni, "porz.")}${r.escludiOpzionali ? " (senza opzionali)" : ""}`,
                )
                .join(" · ")}
            </Text>
          </View>
        )}

        {gruppi.map((g) => (
          <View key={g.fornitore ?? ""} style={stili.sezione}>
            <Text style={stili.intestazioneSezione}>
              {g.fornitore ?? ETICHETTA_FORNITORE_MANCANTE}
            </Text>
            {g.articoli.map((a) => (
              <Riga
                key={`${a.tipo}-${a.id}`}
                nome={a.nome}
                dettaglio={`serve ${formattaQuantita(a.quantitaAcquistoEsatta, a.unitaAcquisto)}${
                  a.resaPercentuale < 100 ? ` · resa ${a.resaPercentuale}%` : ""
                }`}
                quantita={formattaQuantita(a.unitaDaAcquistare, a.unitaAcquisto)}
                costoCent={a.costoAcquistoCent}
              />
            ))}
            <Text style={stili.totaleGruppo}>
              Totale fornitore: {formattaEuro(g.costoAcquistoCent)}
            </Text>
          </View>
        ))}

        {beveraggio.length > 0 && (
          <View style={stili.sezione}>
            <Text style={stili.intestazioneSezione}>Beveraggio</Text>
            {beveraggio.map((p, i) => (
              <Riga
                key={i}
                nome={p.bevanda.nome}
                dettaglio={ETICHETTE_CATEGORIA_BEVANDA[p.categoria]}
                quantita={`${p.colli} colli (${p.unitaAcquistate} ${p.bevanda.unita === "pz" ? "pz" : "unità"})`}
                costoCent={p.costoCent}
              />
            ))}
          </View>
        )}

        <View style={stili.sezione} wrap={false}>
          <Text style={stili.totale}>
            Totale spesa stimata:{" "}
            {formattaEuro(lista.costoAcquistoCent + lista.costoBeveraggioCent)}
          </Text>
          <Text style={stili.nota}>
            di cui cibo e consumabili {formattaEuro(lista.costoAcquistoCent)}
            {beveraggio.length > 0 &&
              ` · beveraggio ${formattaEuro(lista.costoBeveraggioCent)}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generaPdfListaSpesa(lista: ListaSpesaPreventivo): Promise<Buffer> {
  return renderToBuffer(<DocumentoListaSpesa lista={lista} />);
}

import { describe, expect, it } from "vitest";
import {
  calcolaBeveraggio,
  PROFILO_STANDARD,
  type BevandaCalc,
  type OpzioniBeveraggio,
  type RigaBeveraggioInput,
} from "@/lib/calc/beveraggio";

const opzioniBase: OpzioniBeveraggio = {
  ospitiAdulti: 100,
  ospitiBambini: 0,
  oreServizio: 0,
  fattoreDistribuzionePct: 25,
  quotaBibiteBambiniPct: 50,
  correttivoStagioneCalda: false,
  correttivoEventoLungo: false,
  correttivoPubblico: "normale",
};

function bevanda(parziale: Partial<BevandaCalc> & { id: string }): BevandaCalc {
  return {
    nome: parziale.id,
    capacitaUnitaria: 750,
    unita: "ml",
    unitaPerCollo: 6,
    prezzoUnitarioCent: 500,
    ...parziale,
  };
}

function riga(
  parziale: Partial<Omit<RigaBeveraggioInput, "prodotti">> &
    Pick<RigaBeveraggioInput, "categoria" | "quantitaATesta"> & {
      /** scorciatoia: un solo prodotto a copertura 100% */
      bevanda?: BevandaCalc;
      prodotti?: RigaBeveraggioInput["prodotti"];
    },
): RigaBeveraggioInput {
  const { bevanda, prodotti, ...resto } = parziale;
  return {
    unita: "ml",
    quantitaATestaOra: 0,
    prodotti: prodotti ?? (bevanda ? [{ bevanda, quotaPct: 100 }] : []),
    ...resto,
  };
}

describe("calcolaBeveraggio (§5.11)", () => {
  it("fattore di distribuzione applicato solo se vino E birra attivi, spumante escluso", () => {
    const righe = [
      riga({ categoria: "vino_bianco", quantitaATesta: 200 }),
      riga({ categoria: "vino_rosso", quantitaATesta: 200 }),
      riga({ categoria: "birra", quantitaATesta: 400 }),
      riga({ categoria: "bollicine", quantitaATesta: 100 }),
    ];
    const r = calcolaBeveraggio(righe, opzioniBase);
    expect(r.fattoreDistribuzioneApplicato).toBe(true);
    const perCategoria = Object.fromEntries(r.righe.map((x) => [x.categoria, x]));
    // −25% ripartito proporzionalmente: rapporti interni invariati
    expect(perCategoria.vino_bianco.volumeCorretto).toBeCloseTo(200 * 0.75 * 100);
    expect(perCategoria.vino_rosso.volumeCorretto).toBeCloseTo(200 * 0.75 * 100);
    expect(perCategoria.birra.volumeCorretto).toBeCloseTo(400 * 0.75 * 100);
    // spumante non ridotto
    expect(perCategoria.bollicine.volumeCorretto).toBe(100 * 100);
    // il teorico resta visibile e non ridotto
    expect(perCategoria.vino_bianco.volumeTeorico).toBe(200 * 100);
  });

  it("una sola categoria alcolica (caso limite): nessuna riduzione", () => {
    const righe = [
      riga({ categoria: "vino_bianco", quantitaATesta: 200 }),
      riga({ categoria: "vino_rosso", quantitaATesta: 200 }),
    ];
    const r = calcolaBeveraggio(righe, opzioniBase);
    expect(r.fattoreDistribuzioneApplicato).toBe(false);
    expect(r.righe[0].volumeCorretto).toBe(200 * 100);
  });

  it("correttivi rapidi applicati PRIMA del fattore di distribuzione", () => {
    const righe = [
      riga({ categoria: "vino_bianco", quantitaATesta: 200 }),
      riga({ categoria: "birra", quantitaATesta: 400 }),
      riga({ categoria: "acqua_naturale", quantitaATesta: 600 }),
    ];
    const r = calcolaBeveraggio(righe, {
      ...opzioniBase,
      correttivoStagioneCalda: true, // +30% acqua e birra
      correttivoPubblico: "beve_molto", // +20% alcolici
    });
    const perCategoria = Object.fromEntries(r.righe.map((x) => [x.categoria, x]));
    // birra: 400 × 1,3 × 1,2 poi × 0,75 = 468 a testa
    expect(perCategoria.birra.volumeCorretto).toBeCloseTo(400 * 1.3 * 1.2 * 0.75 * 100);
    // vino: 200 × 1,2 × 0,75
    expect(perCategoria.vino_bianco.volumeCorretto).toBeCloseTo(200 * 1.2 * 0.75 * 100);
    // acqua: solo stagione calda
    expect(perCategoria.acqua_naturale.volumeCorretto).toBeCloseTo(600 * 1.3 * 100);
  });

  it("evento lungo: +20% su tutto", () => {
    const r = calcolaBeveraggio(
      [riga({ categoria: "acqua_naturale", quantitaATesta: 600 })],
      { ...opzioniBase, correttivoEventoLungo: true },
    );
    expect(r.righe[0].volumeCorretto).toBeCloseTo(600 * 1.2 * 100);
  });

  it("bambini: solo analcolico, bibite al 50%, acqua piena, niente caffè/alcolici", () => {
    const righe = [
      riga({ categoria: "acqua_naturale", quantitaATesta: 600 }),
      riga({ categoria: "soft_drink", quantitaATesta: 400 }),
      riga({ categoria: "vino_bianco", quantitaATesta: 200 }),
      riga({ categoria: "caffe", quantitaATesta: 1, unita: "pz" }),
    ];
    const r = calcolaBeveraggio(righe, {
      ...opzioniBase,
      ospitiAdulti: 80,
      ospitiBambini: 20,
    });
    const perCategoria = Object.fromEntries(r.righe.map((x) => [x.categoria, x]));
    expect(perCategoria.acqua_naturale.volumeCorretto).toBe(600 * 100); // tutti, quota piena
    expect(perCategoria.soft_drink.volumeCorretto).toBe(400 * (80 + 20 * 0.5));
    expect(perCategoria.vino_bianco.volumeCorretto).toBe(200 * 80); // solo adulti
    expect(perCategoria.caffe.volumeCorretto).toBe(1 * 80); // solo adulti
  });

  it("ospiti bambini = totale (caso limite): nessun alcolico, analcolici presenti", () => {
    const righe = [
      riga({ categoria: "acqua_naturale", quantitaATesta: 600 }),
      riga({ categoria: "soft_drink", quantitaATesta: 400 }),
      riga({ categoria: "vino_bianco", quantitaATesta: 200 }),
    ];
    const r = calcolaBeveraggio(righe, {
      ...opzioniBase,
      ospitiAdulti: 0,
      ospitiBambini: 20,
    });
    const perCategoria = Object.fromEntries(r.righe.map((x) => [x.categoria, x]));
    expect(perCategoria.vino_bianco.volumeCorretto).toBe(0);
    expect(perCategoria.acqua_naturale.volumeCorretto).toBe(600 * 20);
    expect(perCategoria.soft_drink.volumeCorretto).toBe(400 * 10);
  });

  it("voci a durata: ml/persona/ora × ore di servizio", () => {
    const r = calcolaBeveraggio(
      [
        riga({
          categoria: "soft_drink",
          quantitaATesta: 200,
          quantitaATestaOra: 100,
        }),
      ],
      { ...opzioniBase, ospitiAdulti: 10, oreServizio: 3 },
    );
    expect(r.righe[0].volumeCorretto).toBe((200 + 100 * 3) * 10);
  });

  it("arrotondamento per eccesso a unità e poi a collo, con costo e scorta", () => {
    const acqua = bevanda({
      id: "acqua",
      capacitaUnitaria: 1000,
      unitaPerCollo: 6,
      prezzoUnitarioCent: 80,
    });
    const r = calcolaBeveraggio(
      [riga({ categoria: "acqua_naturale", quantitaATesta: 600, bevanda: acqua })],
      { ...opzioniBase, ospitiAdulti: 101 },
    );
    const x = r.righe[0];
    // 101 × 600 = 60600 ml -> 61 bottiglie -> 11 colli -> 66 unità
    expect(x.prodotti[0].unitaNecessarie).toBe(61);
    expect(x.prodotti[0].colli).toBe(11);
    expect(x.prodotti[0].unitaAcquistate).toBe(66);
    expect(x.prodotti[0].costoCent).toBe(66 * 80);
    expect(x.prodotti[0].scortaResidua).toBe(66 * 1000 - 60600);
    // gli aggregati di riga coincidono col singolo prodotto
    expect(x.costoCent).toBe(66 * 80);
    expect(x.scortaResidua).toBe(66 * 1000 - 60600);
    expect(r.costoTotaleCent).toBe(66 * 80);
  });

  it("BUG-001: due prodotti sotto la stessa categoria, quota ripartita 60/40", () => {
    const chardonnay = bevanda({
      id: "chardonnay",
      capacitaUnitaria: 750,
      unitaPerCollo: 6,
      prezzoUnitarioCent: 600,
    });
    const pinot = bevanda({
      id: "pinot",
      capacitaUnitaria: 750,
      unitaPerCollo: 6,
      prezzoUnitarioCent: 900,
    });
    const r = calcolaBeveraggio(
      [
        riga({
          categoria: "vino_bianco",
          quantitaATesta: 200,
          prodotti: [
            { bevanda: chardonnay, quotaPct: 60 },
            { bevanda: pinot, quotaPct: 40 },
          ],
        }),
      ],
      { ...opzioniBase, ospitiAdulti: 100 },
    );
    const x = r.righe[0];
    // volume corretto totale: 200 × 100 = 20000 ml (nessuna riduzione: birra assente)
    expect(x.volumeCorretto).toBe(20000);
    expect(x.quotaCopertaPct).toBe(100);
    expect(x.prodotti[0].volumeAssegnato).toBe(12000); // 60%
    expect(x.prodotti[1].volumeAssegnato).toBe(8000); // 40%
    expect(x.costoCent).toBe(
      (x.prodotti[0].costoCent ?? 0) + (x.prodotti[1].costoCent ?? 0),
    );
    expect(r.righeSenzaPrezzo).toBe(false);
  });

  it("quota assegnata sotto il 100%: la categoria resta parzialmente non prezzata", () => {
    const chardonnay = bevanda({ id: "chardonnay" });
    const r = calcolaBeveraggio(
      [
        riga({
          categoria: "vino_bianco",
          quantitaATesta: 200,
          prodotti: [{ bevanda: chardonnay, quotaPct: 50 }],
        }),
      ],
      opzioniBase,
    );
    expect(r.righe[0].quotaCopertaPct).toBe(50);
    expect(r.righeSenzaPrezzo).toBe(true);
  });

  it("lancia se le quote dei prodotti superano il 100% per la stessa categoria", () => {
    const chardonnay = bevanda({ id: "chardonnay" });
    const pinot = bevanda({ id: "pinot" });
    expect(() =>
      calcolaBeveraggio(
        [
          riga({
            categoria: "vino_bianco",
            quantitaATesta: 200,
            prodotti: [
              { bevanda: chardonnay, quotaPct: 70 },
              { bevanda: pinot, quotaPct: 40 },
            ],
          }),
        ],
        opzioniBase,
      ),
    ).toThrow(/oltre il 100%/);
  });

  it("lancia su unità incoerente anche quando uno solo dei prodotti multipli è discorde", () => {
    const chardonnay = bevanda({ id: "chardonnay", unita: "ml" });
    const bicchieriere = bevanda({ id: "bicchieriere", unita: "pz" });
    expect(() =>
      calcolaBeveraggio(
        [
          riga({
            categoria: "vino_bianco",
            quantitaATesta: 200,
            unita: "ml",
            prodotti: [
              { bevanda: chardonnay, quotaPct: 60 },
              { bevanda: bicchieriere, quotaPct: 40 },
            ],
          }),
        ],
        opzioniBase,
      ),
    ).toThrow(/Unità incoerente/);
  });

  it("riga con volume ma senza bevanda: segnalata come non prezzata", () => {
    const r = calcolaBeveraggio(
      [riga({ categoria: "acqua_naturale", quantitaATesta: 600 })],
      opzioniBase,
    );
    expect(r.righeSenzaPrezzo).toBe(true);
    expect(r.righe[0].costoCent).toBeNull();
  });

  it("lancia su unità incoerente tra riga e bevanda (mai conversioni implicite)", () => {
    const caffe = bevanda({ id: "caffe", unita: "pz", capacitaUnitaria: 100 });
    expect(() =>
      calcolaBeveraggio(
        [riga({ categoria: "caffe", quantitaATesta: 1, unita: "ml", bevanda: caffe })],
        opzioniBase,
      ),
    ).toThrow(/Unità incoerente/);
  });

  it("lancia senza ospiti o con categoria duplicata", () => {
    expect(() =>
      calcolaBeveraggio([], { ...opzioniBase, ospitiAdulti: 0, ospitiBambini: 0 }),
    ).toThrow();
    expect(() =>
      calcolaBeveraggio(
        [
          riga({ categoria: "birra", quantitaATesta: 400 }),
          riga({ categoria: "birra", quantitaATesta: 200 }),
        ],
        opzioniBase,
      ),
    ).toThrow(/duplicata/);
  });

  it("profilo standard della specifica: valori attesi", () => {
    const perCategoria = Object.fromEntries(
      PROFILO_STANDARD.map((r) => [r.categoria, r.quantitaATesta]),
    );
    expect(perCategoria.acqua_naturale).toBe(600);
    expect(perCategoria.acqua_frizzante).toBe(400);
    expect(perCategoria.vino_bianco).toBe(200);
    expect(perCategoria.vino_rosso).toBe(200);
    expect(perCategoria.bollicine).toBe(100);
    expect(perCategoria.birra).toBe(400);
    expect(perCategoria.soft_drink).toBe(400);
    expect(perCategoria.caffe).toBe(1);
  });
});

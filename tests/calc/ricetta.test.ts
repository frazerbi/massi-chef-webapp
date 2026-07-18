import { describe, expect, it } from "vitest";
import {
  allergeniRicetta,
  costoPorzioneCent,
  type MateriaPrimaCalc,
  type RicettaCalc,
} from "@/lib/calc/ricetta";

const materiePrime = new Map<string, MateriaPrimaCalc>([
  [
    "farina",
    {
      id: "farina",
      prezzoAcquistoCent: 100, // 1 €/kg
      fattoreConversione: 1000,
      resaPercentuale: 100,
      allergeni: ["glutine"],
    },
  ],
  [
    "branzino",
    {
      id: "branzino",
      prezzoAcquistoCent: 1800, // 18 €/kg
      fattoreConversione: 1000,
      resaPercentuale: 45, // -> 4 cent/g
      allergeni: ["pesce"],
    },
  ],
  [
    "uovo",
    {
      id: "uovo",
      prezzoAcquistoCent: 30, // 0,30 €/pz
      fattoreConversione: 1,
      resaPercentuale: 100,
      allergeni: ["uova"],
    },
  ],
]);

function ricetta(parziale: Partial<RicettaCalc> & { id: string }): RicettaCalc {
  return {
    porzioniBase: 4,
    costoManualeExtraCent: 0,
    ingredienti: [],
    ...parziale,
  };
}

describe("costoPorzioneCent (§5.2)", () => {
  it("ricetta semplice senza sotto-ricette (caso limite)", () => {
    const ricette = new Map([
      [
        "pasta",
        ricetta({
          id: "pasta",
          porzioniBase: 4,
          ingredienti: [
            { materiaPrimaId: "farina", quantita: 400, opzionale: false },
            { materiaPrimaId: "uovo", quantita: 4, opzionale: false },
          ],
        }),
      ],
    ]);
    // farina: 400 g × 0,1 cent = 40 cent; uova: 4 × 30 = 120 cent
    // (40 + 120) / 4 porzioni = 40 cent/porzione
    expect(costoPorzioneCent("pasta", ricette, materiePrime)).toBeCloseTo(40, 10);
  });

  it("costo manuale extra sommato per porzione", () => {
    const ricette = new Map([
      [
        "r",
        ricetta({
          id: "r",
          porzioniBase: 2,
          costoManualeExtraCent: 50,
          ingredienti: [{ materiaPrimaId: "uovo", quantita: 2, opzionale: false }],
        }),
      ],
    ]);
    expect(costoPorzioneCent("r", ricette, materiePrime)).toBeCloseTo(80, 10);
  });

  it("con sotto-ricetta: ricorsivo (porzioni sotto-ricetta × costo porzione)", () => {
    const ricette = new Map([
      [
        "fondo",
        ricetta({
          id: "fondo",
          porzioniBase: 10,
          ingredienti: [
            { materiaPrimaId: "branzino", quantita: 500, opzionale: false },
          ],
        }),
      ],
      [
        "piatto",
        ricetta({
          id: "piatto",
          porzioniBase: 4,
          ingredienti: [
            { materiaPrimaId: "branzino", quantita: 600, opzionale: false },
            { sottoRicettaId: "fondo", quantitaPorzioni: 2, opzionale: false },
          ],
        }),
      ],
    ]);
    // fondo: 500 g × 4 cent / 10 porzioni = 200 cent/porzione
    // piatto: (600 × 4 + 2 × 200) / 4 = (2400 + 400) / 4 = 700 cent
    expect(costoPorzioneCent("piatto", ricette, materiePrime)).toBeCloseTo(700, 10);
  });

  it("ingredienti opzionali esclusi su richiesta", () => {
    const ricette = new Map([
      [
        "r",
        ricetta({
          id: "r",
          porzioniBase: 1,
          ingredienti: [
            { materiaPrimaId: "uovo", quantita: 1, opzionale: false },
            { materiaPrimaId: "branzino", quantita: 100, opzionale: true },
          ],
        }),
      ],
    ]);
    expect(costoPorzioneCent("r", ricette, materiePrime)).toBeCloseTo(430, 10);
    expect(
      costoPorzioneCent("r", ricette, materiePrime, { includiOpzionali: false }),
    ).toBeCloseTo(30, 10);
  });

  it("lancia su ciclo diretto e indiretto", () => {
    const ricette = new Map([
      [
        "a",
        ricetta({
          id: "a",
          ingredienti: [{ sottoRicettaId: "b", quantitaPorzioni: 1, opzionale: false }],
        }),
      ],
      [
        "b",
        ricetta({
          id: "b",
          ingredienti: [{ sottoRicettaId: "a", quantitaPorzioni: 1, opzionale: false }],
        }),
      ],
    ]);
    expect(() => costoPorzioneCent("a", ricette, materiePrime)).toThrow(/Ciclo/);
  });

  it("profondità 5 ammessa, 6 rifiutata", () => {
    const catena = (n: number): Map<string, RicettaCalc> => {
      const m = new Map<string, RicettaCalc>();
      for (let i = 1; i <= n; i++) {
        m.set(
          `r${i}`,
          ricetta({
            id: `r${i}`,
            porzioniBase: 1,
            ingredienti:
              i < n
                ? [{ sottoRicettaId: `r${i + 1}`, quantitaPorzioni: 1, opzionale: false }]
                : [{ materiaPrimaId: "uovo", quantita: 1, opzionale: false }],
          }),
        );
      }
      return m;
    };
    expect(costoPorzioneCent("r1", catena(5), materiePrime)).toBeCloseTo(30, 10);
    expect(() => costoPorzioneCent("r1", catena(6), materiePrime)).toThrow(
      /Profondità/,
    );
  });

  it("lancia su riferimenti mancanti e quantità non valide", () => {
    const ricette = new Map([
      [
        "r",
        ricetta({
          id: "r",
          ingredienti: [{ materiaPrimaId: "inesistente", quantita: 1, opzionale: false }],
        }),
      ],
      [
        "q",
        ricetta({
          id: "q",
          ingredienti: [{ materiaPrimaId: "uovo", quantita: 0, opzionale: false }],
        }),
      ],
    ]);
    expect(() => costoPorzioneCent("r", ricette, materiePrime)).toThrow();
    expect(() => costoPorzioneCent("q", ricette, materiePrime)).toThrow();
    expect(() => costoPorzioneCent("manca", ricette, materiePrime)).toThrow();
  });
});

describe("allergeniRicetta", () => {
  it("eredita ricorsivamente dagli ingredienti e dalle sotto-ricette", () => {
    const ricette = new Map([
      [
        "fondo",
        ricetta({
          id: "fondo",
          ingredienti: [{ materiaPrimaId: "branzino", quantita: 100, opzionale: false }],
        }),
      ],
      [
        "piatto",
        ricetta({
          id: "piatto",
          ingredienti: [
            { materiaPrimaId: "farina", quantita: 100, opzionale: false },
            { sottoRicettaId: "fondo", quantitaPorzioni: 1, opzionale: false },
          ],
        }),
      ],
    ]);
    expect(allergeniRicetta("piatto", ricette, materiePrime)).toEqual([
      "glutine",
      "pesce",
    ]);
  });
});

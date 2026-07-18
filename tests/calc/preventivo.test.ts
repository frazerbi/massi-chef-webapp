import { describe, expect, it } from "vitest";
import { calcolaTotaliPreventivo } from "@/lib/calc/preventivo";

describe("calcolaTotaliPreventivo (§5.4)", () => {
  it("food cost, extra, prezzo suggerito e margini", () => {
    const totali = calcolaTotaliPreventivo({
      righe: [
        // 100 porzioni a 700 cent di costo, prezzo 1500 cent
        {
          tipoRiga: "ricetta",
          quantita: 100,
          costoUnitarioCent: 700,
          prezzoUnitarioCent: 1500,
        },
        // personale: costo 30000, prezzo 40000
        {
          tipoRiga: "extra",
          quantita: 1,
          costoUnitarioCent: 30000,
          prezzoUnitarioCent: 40000,
        },
      ],
      costoBeveraggioCent: 20000,
      prezzoBeveraggioCent: 30000,
      margineTargetPct: 30,
    });

    expect(totali.foodCostCent).toBe(70000 + 20000);
    expect(totali.costoExtraCent).toBe(30000);
    expect(totali.costoTotaleCent).toBe(120000);
    // 120000 / (1 - 0,30) = 171428,57 -> 171429
    expect(totali.prezzoSuggeritoCent).toBe(171429);
    expect(totali.prezzoTotaleCent).toBe(150000 + 40000 + 30000);
    expect(totali.utileCent).toBe(220000 - 120000);
    expect(totali.margineEffettivoPct).toBeCloseTo((100000 / 220000) * 100, 6);
    expect(totali.foodCostPct).toBeCloseTo((90000 / 220000) * 100, 6);
  });

  it("righe senza costo o prezzo (bozza in compilazione) valgono 0", () => {
    const totali = calcolaTotaliPreventivo({
      righe: [
        {
          tipoRiga: "ricetta",
          quantita: 10,
          costoUnitarioCent: null,
          prezzoUnitarioCent: null,
        },
      ],
      costoBeveraggioCent: 0,
      prezzoBeveraggioCent: 0,
      margineTargetPct: 0,
    });
    expect(totali.costoTotaleCent).toBe(0);
    expect(totali.prezzoTotaleCent).toBe(0);
    expect(totali.margineEffettivoPct).toBeNull();
    expect(totali.foodCostPct).toBeNull();
  });

  it("margine 0 (caso limite): prezzo suggerito = costo totale", () => {
    const totali = calcolaTotaliPreventivo({
      righe: [
        {
          tipoRiga: "ricetta",
          quantita: 1,
          costoUnitarioCent: 5000,
          prezzoUnitarioCent: null,
        },
      ],
      costoBeveraggioCent: 0,
      prezzoBeveraggioCent: 0,
      margineTargetPct: 0,
    });
    expect(totali.prezzoSuggeritoCent).toBe(5000);
  });

  it("lancia su margine >= 100 e quantità non valide", () => {
    expect(() =>
      calcolaTotaliPreventivo({
        righe: [],
        costoBeveraggioCent: 0,
        prezzoBeveraggioCent: 0,
        margineTargetPct: 100,
      }),
    ).toThrow();
    expect(() =>
      calcolaTotaliPreventivo({
        righe: [
          {
            tipoRiga: "ricetta",
            quantita: 0,
            costoUnitarioCent: 100,
            prezzoUnitarioCent: null,
          },
        ],
        costoBeveraggioCent: 0,
        prezzoBeveraggioCent: 0,
        margineTargetPct: 30,
      }),
    ).toThrow();
  });
});

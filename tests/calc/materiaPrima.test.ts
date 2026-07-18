import { describe, expect, it } from "vitest";
import { costoUnitaUsoCent } from "@/lib/calc/materiaPrima";

describe("costoUnitaUsoCent (§5.1)", () => {
  it("esempio della specifica: branzino 18 €/kg, resa 45% -> 4 cent/g", () => {
    expect(
      costoUnitaUsoCent({
        prezzoAcquistoCent: 1800,
        fattoreConversione: 1000,
        resaPercentuale: 45,
      }),
    ).toBeCloseTo(4, 10);
  });

  it("resa 100% (caso limite): solo conversione", () => {
    expect(
      costoUnitaUsoCent({
        prezzoAcquistoCent: 250,
        fattoreConversione: 1000,
        resaPercentuale: 100,
      }),
    ).toBeCloseTo(0.25, 10);
  });

  it("pezzo singolo: fattore di conversione 1", () => {
    expect(
      costoUnitaUsoCent({
        prezzoAcquistoCent: 120,
        fattoreConversione: 1,
        resaPercentuale: 100,
      }),
    ).toBe(120);
  });

  it("lancia su resa fuori intervallo 1–100", () => {
    expect(() =>
      costoUnitaUsoCent({
        prezzoAcquistoCent: 100,
        fattoreConversione: 1000,
        resaPercentuale: 0,
      }),
    ).toThrow();
    expect(() =>
      costoUnitaUsoCent({
        prezzoAcquistoCent: 100,
        fattoreConversione: 1000,
        resaPercentuale: 101,
      }),
    ).toThrow();
  });

  it("lancia su fattore di conversione non positivo e prezzo negativo", () => {
    expect(() =>
      costoUnitaUsoCent({
        prezzoAcquistoCent: 100,
        fattoreConversione: 0,
        resaPercentuale: 100,
      }),
    ).toThrow();
    expect(() =>
      costoUnitaUsoCent({
        prezzoAcquistoCent: -1,
        fattoreConversione: 1000,
        resaPercentuale: 100,
      }),
    ).toThrow();
  });
});

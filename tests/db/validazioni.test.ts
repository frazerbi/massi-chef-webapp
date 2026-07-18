import { describe, expect, it } from "vitest";
import {
  validaCentesimi,
  validaConversioneUnita,
  validaIntero,
  validaMargine,
  validaPercentuale,
  validaQuantita,
  validaResa,
  validaTesto,
} from "@/lib/db/validazioni";

describe("validazioni server-side (/lib/db)", () => {
  it("testo obbligatorio", () => {
    expect(validaTesto(" Farina ", "nome")).toBe("Farina");
    expect(() => validaTesto("", "nome")).toThrow(/obbligatorio/);
    expect(() => validaTesto("   ", "nome")).toThrow();
    expect(() => validaTesto(null, "nome")).toThrow();
  });

  it("centesimi: interi non negativi", () => {
    expect(validaCentesimi(1800, "prezzo")).toBe(1800);
    expect(validaCentesimi(0, "prezzo")).toBe(0);
    expect(() => validaCentesimi(-1, "prezzo")).toThrow();
    expect(() => validaCentesimi(10.5, "prezzo")).toThrow();
  });

  it("quantità > 0, arrotondate a 3 decimali", () => {
    expect(validaQuantita(1.23456, "q")).toBe(1.235);
    // le stringhe con virgola vanno convertite prima (lib/form), qui non sono ammesse
    expect(() => validaQuantita("2,5", "q")).toThrow();
    expect(() => validaQuantita(0, "q")).toThrow();
    expect(() => validaQuantita(-2, "q")).toThrow();
  });

  it("interi con minimo", () => {
    expect(validaIntero(4, "porzioni", 1)).toBe(4);
    expect(() => validaIntero(0, "porzioni", 1)).toThrow();
    expect(() => validaIntero(2.5, "porzioni", 1)).toThrow();
  });

  it("resa 1–100 e margine < 100", () => {
    expect(validaResa(45)).toBe(45);
    expect(() => validaResa(0)).toThrow();
    expect(() => validaResa(101)).toThrow();
    expect(validaMargine(30)).toBe(30);
    expect(() => validaMargine(100)).toThrow();
    expect(() => validaMargine(-1)).toThrow();
  });

  it("percentuali generiche entro intervallo", () => {
    expect(validaPercentuale(25, "fattore", 0, 100)).toBe(25);
    expect(() => validaPercentuale(101, "fattore", 0, 100)).toThrow();
  });

  it("conversioni di unità: mai peso <-> volume", () => {
    expect(() => validaConversioneUnita("kg", "g")).not.toThrow();
    expect(() => validaConversioneUnita("l", "ml")).not.toThrow();
    expect(() => validaConversioneUnita("pz", "pz")).not.toThrow();
    expect(() => validaConversioneUnita("conf", "pz")).not.toThrow();
    expect(() => validaConversioneUnita("kg", "ml")).toThrow(/non ammessa/);
    expect(() => validaConversioneUnita("l", "g")).toThrow();
    expect(() => validaConversioneUnita("kg", "pz")).toThrow();
  });
});

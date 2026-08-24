import { describe, expect, it } from "vitest";
import { etichettaMateriaPrima } from "@/lib/db/types";

describe("etichettaMateriaPrima", () => {
  it("aggiunge la marca quando c'è, per distinguere due omonimi", () => {
    expect(etichettaMateriaPrima({ nome: "Pomodoro pelati", marca: "Mutti" })).toBe(
      "Pomodoro pelati — Mutti",
    );
    expect(etichettaMateriaPrima({ nome: "Pomodoro pelati", marca: "Cirio" })).toBe(
      "Pomodoro pelati — Cirio",
    );
  });

  it("resta il solo nome se la marca manca o è vuota", () => {
    expect(etichettaMateriaPrima({ nome: "Basilico", marca: null })).toBe("Basilico");
    expect(etichettaMateriaPrima({ nome: "Basilico" })).toBe("Basilico");
    expect(etichettaMateriaPrima({ nome: "Basilico", marca: "   " })).toBe("Basilico");
  });
});

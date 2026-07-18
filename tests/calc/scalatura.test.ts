import { describe, expect, it } from "vitest";
import { quantitaTotaleIngrediente } from "@/lib/calc/scalatura";

describe("quantitaTotaleIngrediente (§5.3)", () => {
  it("scala linearmente con lo sfrido catering (10%)", () => {
    expect(quantitaTotaleIngrediente(120, 100, 10)).toBeCloseTo(13200, 10);
  });

  it("sfrido 0 (caso limite): nessuna maggiorazione", () => {
    expect(quantitaTotaleIngrediente(120, 100, 0)).toBe(12000);
  });

  it("lancia su ospiti o quantità non validi", () => {
    expect(() => quantitaTotaleIngrediente(0, 10, 10)).toThrow();
    expect(() => quantitaTotaleIngrediente(100, 0, 10)).toThrow();
    expect(() => quantitaTotaleIngrediente(100, 1.5, 10)).toThrow();
    expect(() => quantitaTotaleIngrediente(100, 10, -1)).toThrow();
  });
});

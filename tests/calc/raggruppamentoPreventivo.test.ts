import { describe, expect, it } from "vitest";
import {
  ORDINE_GRUPPI_PREVENTIVO,
  gruppoDiRigaPreventivo,
  raggruppaRighePreventivo,
  type RigaRaggruppabile,
} from "@/lib/calc/raggruppamentoPreventivo";

/** riga di comodo con un'etichetta per verificarne l'ordine */
function riga(
  nome: string,
  parziale: Partial<RigaRaggruppabile> & Pick<RigaRaggruppabile, "tipoRiga">,
) {
  return {
    nome,
    categoriaPortata: null,
    tipoConsumabile: null,
    ...parziale,
  };
}

describe("gruppoDiRigaPreventivo (CL-1)", () => {
  it("mappa ogni tipo di riga sul suo gruppo", () => {
    expect(
      gruppoDiRigaPreventivo({ tipoRiga: "ricetta", categoriaPortata: "primo" }),
    ).toBe("primo");
    expect(gruppoDiRigaPreventivo({ tipoRiga: "materia_prima" })).toBe(
      "altri_prodotti",
    );
    expect(
      gruppoDiRigaPreventivo({
        tipoRiga: "consumabile",
        tipoConsumabile: "apparecchiatura",
      }),
    ).toBe("apparecchiatura");
    expect(
      gruppoDiRigaPreventivo({
        tipoRiga: "consumabile",
        tipoConsumabile: "consumabile",
      }),
    ).toBe("consumabile");
    expect(gruppoDiRigaPreventivo({ tipoRiga: "extra" })).toBe("servizi");
  });

  it("riga ricetta senza portata disponibile finisce in 'altro'", () => {
    expect(gruppoDiRigaPreventivo({ tipoRiga: "ricetta" })).toBe("altro");
    expect(
      gruppoDiRigaPreventivo({ tipoRiga: "ricetta", categoriaPortata: null }),
    ).toBe("altro");
  });

  it("riga consumabile senza tipo cade sul default 'consumabile'", () => {
    expect(gruppoDiRigaPreventivo({ tipoRiga: "consumabile" })).toBe(
      "consumabile",
    );
  });
});

describe("raggruppaRighePreventivo (CL-1)", () => {
  it("rispetta l'ordine dei gruppi indipendentemente dall'ordine delle righe", () => {
    const gruppi = raggruppaRighePreventivo([
      riga("gelato", { tipoRiga: "ricetta", categoriaPortata: "dessert" }),
      riga("tagliolini", { tipoRiga: "ricetta", categoriaPortata: "primo" }),
      riga("olive", { tipoRiga: "materia_prima" }),
      riga("piatti", {
        tipoRiga: "consumabile",
        tipoConsumabile: "apparecchiatura",
      }),
      riga("tartare", { tipoRiga: "ricetta", categoriaPortata: "antipasto" }),
      riga("tovaglioli", {
        tipoRiga: "consumabile",
        tipoConsumabile: "consumabile",
      }),
      riga("branzino", { tipoRiga: "ricetta", categoriaPortata: "secondo" }),
    ]);
    expect(gruppi.map((g) => g.chiave)).toEqual([
      "antipasto",
      "primo",
      "secondo",
      "dessert",
      "apparecchiatura",
      "consumabile",
      "altri_prodotti",
    ]);
  });

  it("le righe extra stanno sempre in coda, dopo ogni altro gruppo", () => {
    const gruppi = raggruppaRighePreventivo([
      riga("personale", { tipoRiga: "extra" }),
      riga("trasferta", { tipoRiga: "extra" }),
      riga("frutta", { tipoRiga: "materia_prima" }),
      riga("tartare", { tipoRiga: "ricetta", categoriaPortata: "antipasto" }),
    ]);
    expect(gruppi.at(-1)?.chiave).toBe("servizi");
    expect(gruppi.at(-1)?.righe.map((r) => r.nome)).toEqual([
      "personale",
      "trasferta",
    ]);
  });

  it("un gruppo senza righe non compare", () => {
    const gruppi = raggruppaRighePreventivo([
      riga("tartare", { tipoRiga: "ricetta", categoriaPortata: "antipasto" }),
    ]);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0].chiave).toBe("antipasto");
    expect(gruppi.some((g) => g.chiave === "servizi")).toBe(false);
  });

  it("nessuna riga: nessun gruppo", () => {
    expect(raggruppaRighePreventivo([])).toEqual([]);
  });

  it("non perde né duplica righe e ne conserva l'ordine dentro il gruppo", () => {
    const righe = [
      riga("primo A", { tipoRiga: "ricetta", categoriaPortata: "primo" }),
      riga("extra A", { tipoRiga: "extra" }),
      riga("primo B", { tipoRiga: "ricetta", categoriaPortata: "primo" }),
      riga("senza portata", { tipoRiga: "ricetta" }),
    ];
    const gruppi = raggruppaRighePreventivo(righe);
    expect(gruppi.flatMap((g) => g.righe)).toHaveLength(righe.length);
    const primi = gruppi.find((g) => g.chiave === "primo");
    expect(primi?.righe.map((r) => r.nome)).toEqual(["primo A", "primo B"]);
    expect(gruppi.find((g) => g.chiave === "altro")?.righe.map((r) => r.nome)).toEqual([
      "senza portata",
    ]);
  });

  it("ogni gruppo prodotto ha un'etichetta e una chiave dell'ordine ufficiale", () => {
    const gruppi = raggruppaRighePreventivo([
      riga("x", { tipoRiga: "extra" }),
      riga("y", { tipoRiga: "materia_prima" }),
    ]);
    for (const gruppo of gruppi) {
      expect(ORDINE_GRUPPI_PREVENTIVO).toContain(gruppo.chiave);
      expect(gruppo.etichetta.length).toBeGreaterThan(0);
    }
  });
});

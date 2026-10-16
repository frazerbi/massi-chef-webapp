import { describe, expect, it } from "vitest";
import type { CostoMateriaPrimaInput } from "@/lib/calc/materiaPrima";
import {
  arrotondaAcquistoPerEccesso,
  calcolaListaSpesa,
  esplodiRicetta,
  formattaQuantita,
  raggruppaPerFornitore,
  type ListaSpesaInput,
} from "@/lib/calc/listaSpesa";
import type { RicettaCalc } from "@/lib/calc/ricetta";

const materiePrime = new Map<string, CostoMateriaPrimaInput>([
  // 20 €/kg, resa 100%
  ["tastasal", { prezzoAcquistoCent: 2000, fattoreConversione: 1000, resaPercentuale: 100 }],
  // 4 €/kg
  ["riso", { prezzoAcquistoCent: 400, fattoreConversione: 1000, resaPercentuale: 100 }],
  // 18 €/kg, resa 45%
  ["branzino", { prezzoAcquistoCent: 1800, fattoreConversione: 1000, resaPercentuale: 45 }],
  // 6 €/l
  ["brodo", { prezzoAcquistoCent: 600, fattoreConversione: 1000, resaPercentuale: 100 }],
  // 0,30 €/pz
  ["uovo", { prezzoAcquistoCent: 30, fattoreConversione: 1, resaPercentuale: 100 }],
]);

const consumabili = new Map([
  // confezione da 50 piatti a 10 €
  ["piatto", { prezzoAcquistoCent: 1000, fattoreConversione: 50 }],
]);

function ricetta(
  id: string,
  porzioniBase: number,
  ingredienti: RicettaCalc["ingredienti"],
): [string, RicettaCalc] {
  return [id, { id, porzioniBase, costoManualeExtraCent: 0, ingredienti }];
}

const ricette = new Map<string, RicettaCalc>([
  // l'esempio dello chef: 1 kg di tastasal per 8 persone
  ricetta("risotto", 8, [
    { materiaPrimaId: "tastasal", quantita: 1000, opzionale: false },
    { materiaPrimaId: "riso", quantita: 640, opzionale: false },
    { sottoRicettaId: "fondo", quantitaPorzioni: 2, opzionale: false },
    { materiaPrimaId: "uovo", quantita: 2, opzionale: true },
  ]),
  // sotto-ricetta: 1 l di brodo e 40 g di tastasal per 4 porzioni di fondo
  ricetta("fondo", 4, [
    { materiaPrimaId: "brodo", quantita: 1000, opzionale: false },
    { materiaPrimaId: "tastasal", quantita: 40, opzionale: false },
  ]),
  ricetta("branzino_forno", 10, [
    { materiaPrimaId: "branzino", quantita: 1800, opzionale: false },
  ]),
  ricetta("ciclo_a", 1, [{ sottoRicettaId: "ciclo_b", quantitaPorzioni: 1, opzionale: false }]),
  ricetta("ciclo_b", 1, [{ sottoRicettaId: "ciclo_a", quantitaPorzioni: 1, opzionale: false }]),
]);

function input(over: Partial<ListaSpesaInput>): ListaSpesaInput {
  return {
    righe: [],
    ospitiTotali: 180,
    sfridoPct: 10,
    ricette,
    materiePrime,
    consumabili,
    ...over,
  };
}

function articolo(lista: ReturnType<typeof calcolaListaSpesa>, id: string) {
  const a = lista.find((x) => x.id === id);
  if (!a) throw new Error(`articolo ${id} assente`);
  return a;
}

describe("esplodiRicetta", () => {
  it("ricetta senza sotto-ricette: scala lineare sulle porzioni", () => {
    const f = esplodiRicetta("branzino_forno", 20, ricette);
    expect(f.get("branzino")).toBeCloseTo(3600);
  });

  it("ricetta con sotto-ricetta: somma la stessa materia prima dai due livelli", () => {
    // 180 porzioni = 22,5 ricette; fondo: 22,5 × 2 = 45 porzioni = 11,25 ricette fondo
    const f = esplodiRicetta("risotto", 180, ricette);
    expect(f.get("tastasal")).toBeCloseTo(22500 + 11.25 * 40);
    expect(f.get("brodo")).toBeCloseTo(11250);
    expect(f.get("uovo")).toBeCloseTo(45);
  });

  it("esclude gli opzionali se richiesto", () => {
    const f = esplodiRicetta("risotto", 8, ricette, { includiOpzionali: false });
    expect(f.has("uovo")).toBe(false);
  });

  it("lancia su ciclo, ricetta mancante e porzioni non valide", () => {
    expect(() => esplodiRicetta("ciclo_a", 1, ricette)).toThrow(/Ciclo/);
    expect(() => esplodiRicetta("inesistente", 1, ricette)).toThrow(/non trovata/);
    expect(() => esplodiRicetta("risotto", 0, ricette)).toThrow(/Porzioni/);
  });

  it("lancia oltre la profondità massima", () => {
    const profonde = new Map<string, RicettaCalc>([
      ...Array.from({ length: 6 }, (_, i) =>
        ricetta(`l${i}`, 1, [{ sottoRicettaId: `l${i + 1}`, quantitaPorzioni: 1, opzionale: false }]),
      ),
      ricetta("l6", 1, [{ materiaPrimaId: "riso", quantita: 1, opzionale: false }]),
    ]);
    expect(() => esplodiRicetta("l0", 1, profonde)).toThrow(/Profondità/);
  });
});

describe("calcolaListaSpesa", () => {
  it("esempio dello chef: 1 kg per 8, 180 porzioni, sfrido 10% → 24,75 kg, si comprano 25 kg", () => {
    const solo = new Map<string, RicettaCalc>([
      ricetta("r", 8, [{ materiaPrimaId: "tastasal", quantita: 1000, opzionale: false }]),
    ]);
    const lista = calcolaListaSpesa(
      input({
        ricette: solo,
        righe: [{ tipo: "ricetta", ricettaId: "r", porzioni: 180, escludiOpzionali: false }],
      }),
    );
    const t = articolo(lista, "tastasal");
    expect(t.quantitaAcquistoEsatta).toBeCloseTo(24.75);
    expect(t.unitaDaAcquistare).toBe(25);
    expect(t.costoAcquistoCent).toBe(25 * 2000);
    expect(t.costoNecessarioCent).toBeCloseTo(24.75 * 2000);
  });

  it("sfrido 0: nessuna maggiorazione", () => {
    const lista = calcolaListaSpesa(
      input({
        sfridoPct: 0,
        righe: [{ tipo: "ricetta", ricettaId: "branzino_forno", porzioni: 10, escludiOpzionali: false }],
      }),
    );
    expect(articolo(lista, "branzino").quantitaNettaUso).toBeCloseTo(1800);
  });

  it("resa sotto il 100%: si compra il lordo, il costo necessario resta il food cost", () => {
    const lista = calcolaListaSpesa(
      input({
        sfridoPct: 0,
        righe: [{ tipo: "ricetta", ricettaId: "branzino_forno", porzioni: 10, escludiOpzionali: false }],
      }),
    );
    const b = articolo(lista, "branzino");
    // 1,8 kg puliti con resa 45% → 4 kg interi
    expect(b.quantitaLordaUso).toBeCloseTo(4000);
    expect(b.quantitaAcquistoEsatta).toBeCloseTo(4);
    expect(b.unitaDaAcquistare).toBe(4);
    // 1800 g × 4 cent/g
    expect(b.costoNecessarioCent).toBeCloseTo(7200);
    expect(b.costoAcquistoCent).toBe(7200);
  });

  it("aggrega la stessa materia prima da ricette diverse e da riga diretta", () => {
    const lista = calcolaListaSpesa(
      input({
        ospitiTotali: 10,
        righe: [
          { tipo: "ricetta", ricettaId: "risotto", porzioni: 8, escludiOpzionali: true },
          { tipo: "materia_prima", materiaPrimaId: "tastasal", quantitaPersona: 50 },
        ],
      }),
    );
    // risotto: 1000 + fondo (2 porzioni = 0,5 ricette → 20 g) = 1020 g, × 1,1
    // diretta: 50 g × 10 ospiti × 1,1
    expect(articolo(lista, "tastasal").quantitaNettaUso).toBeCloseTo(1020 * 1.1 + 550);
    expect(lista.filter((a) => a.id === "tastasal")).toHaveLength(1);
    expect(lista.some((a) => a.id === "uovo")).toBe(false);
  });

  it("consumabili: nessuno sfrido, arrotondati alla confezione", () => {
    const lista = calcolaListaSpesa(
      input({
        ospitiTotali: 120,
        righe: [{ tipo: "consumabile", consumabileId: "piatto", quantitaPersona: 2 }],
      }),
    );
    const p = articolo(lista, "piatto");
    expect(p.tipo).toBe("consumabile");
    expect(p.quantitaNettaUso).toBe(240);
    expect(p.quantitaAcquistoEsatta).toBeCloseTo(4.8);
    expect(p.unitaDaAcquistare).toBe(5);
    expect(p.costoAcquistoCent).toBe(5000);
  });

  it("nessuna riga: lista vuota", () => {
    expect(calcolaListaSpesa(input({}))).toEqual([]);
  });

  it("lancia su input invalidi e riferimenti mancanti", () => {
    expect(() => calcolaListaSpesa(input({ ospitiTotali: 0 }))).toThrow(/Ospiti/);
    expect(() => calcolaListaSpesa(input({ sfridoPct: -1 }))).toThrow(/Sfrido/);
    expect(() =>
      calcolaListaSpesa(
        input({ righe: [{ tipo: "materia_prima", materiaPrimaId: "x", quantitaPersona: 1 }] }),
      ),
    ).toThrow(/Materia prima non trovata/);
    expect(() =>
      calcolaListaSpesa(
        input({ righe: [{ tipo: "consumabile", consumabileId: "x", quantitaPersona: 1 }] }),
      ),
    ).toThrow(/Consumabile non trovato/);
  });
});

describe("arrotondaAcquistoPerEccesso", () => {
  it("per eccesso, ma senza farsi ingannare dai residui in virgola mobile", () => {
    expect(arrotondaAcquistoPerEccesso(24.75)).toBe(25);
    expect(arrotondaAcquistoPerEccesso(0.001)).toBe(1);
    expect(arrotondaAcquistoPerEccesso(3.0000000000000004)).toBe(3);
    expect(arrotondaAcquistoPerEccesso(0.1 + 0.2)).toBe(1);
    expect(arrotondaAcquistoPerEccesso(0)).toBe(0);
    expect(() => arrotondaAcquistoPerEccesso(-1)).toThrow();
  });
});

describe("raggruppaPerFornitore", () => {
  it("unisce maiuscole e spazi, ordina, mette il fornitore mancante in coda", () => {
    const gruppi = raggruppaPerFornitore([
      { nome: "Riso", fornitore: "Metro", costoAcquistoCent: 400 },
      { nome: "Burro", fornitore: " metro ", costoAcquistoCent: 300 },
      { nome: "Sale", fornitore: null, costoAcquistoCent: 50 },
      { nome: "Pesce", fornitore: "Ittica Adriatica", costoAcquistoCent: 7200 },
      { nome: "Pepe", fornitore: "  ", costoAcquistoCent: 80 },
    ]);
    expect(gruppi.map((g) => g.fornitore)).toEqual(["Ittica Adriatica", "Metro", null]);
    expect(gruppi[1].articoli.map((a) => a.nome)).toEqual(["Burro", "Riso"]);
    expect(gruppi[1].costoAcquistoCent).toBe(700);
    expect(gruppi[2].articoli.map((a) => a.nome)).toEqual(["Pepe", "Sale"]);
  });
});

describe("formattaQuantita", () => {
  it("virgola decimale e massimo 3 decimali", () => {
    expect(formattaQuantita(24.75, "kg")).toBe("24,75 kg");
    expect(formattaQuantita(3520.0000000000005, "g")).toBe("3520 g");
    expect(formattaQuantita(2, "")).toBe("2");
  });
});

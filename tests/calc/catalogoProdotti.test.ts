import { describe, expect, it } from "vitest";
import {
  GRUPPO_BEVANDE,
  GRUPPO_SENZA_CATEGORIA,
  raggruppaCatalogo,
  spostaInElenco,
  voceCorrisponde,
  type VoceCatalogo,
} from "@/lib/calc/catalogoProdotti";

const categorie = [
  { id: "c-carne", nome: "Carne" },
  { id: "c-pesce", nome: "Pesce" },
  { id: "c-dispensa", nome: "Dispensa" },
];

const mp = (nome: string, categoriaId: string | null, marca?: string): VoceCatalogo => ({
  tipo: "materia_prima",
  nome,
  categoriaId,
  marca,
});

const titoli = (gruppi: { titolo: string }[]) => gruppi.map((g) => g.titolo);
const nomi = (gruppo: { voci: VoceCatalogo[] } | undefined) => gruppo?.voci.map((v) => v.nome);

describe("raggruppaCatalogo (CL-2)", () => {
  it("ordina i gruppi: categorie nell'ordine dato, poi bevande e consumabili", () => {
    const gruppi = raggruppaCatalogo([], categorie);
    expect(titoli(gruppi)).toEqual([
      "Carne",
      "Pesce",
      "Dispensa",
      "Bevande",
      "Consumabili apparecchio",
      "Consumabili cucina",
    ]);
  });

  it("colloca ogni tipo di voce nel suo gruppo, in ordine alfabetico", () => {
    const gruppi = raggruppaCatalogo(
      [
        mp("Salsiccia", "c-carne"),
        mp("Arrosto", "c-carne"),
        mp("Olive", "c-dispensa"),
        { tipo: "bevanda", nome: "Prosecco" },
        { tipo: "consumabile", nome: "Piatto piano", tipoConsumabile: "apparecchiatura" },
        { tipo: "consumabile", nome: "Pellicola", tipoConsumabile: "consumabile" },
      ],
      categorie,
    );
    const per = new Map(gruppi.map((g) => [g.chiave, g]));
    expect(nomi(per.get("c-carne"))).toEqual(["Arrosto", "Salsiccia"]);
    expect(nomi(per.get("c-pesce"))).toEqual([]);
    expect(nomi(per.get("c-dispensa"))).toEqual(["Olive"]);
    expect(nomi(per.get(GRUPPO_BEVANDE))).toEqual(["Prosecco"]);
    expect(nomi(per.get("apparecchiatura"))).toEqual(["Piatto piano"]);
    expect(nomi(per.get("consumabile"))).toEqual(["Pellicola"]);
  });

  it("materie prime senza categoria o con categoria eliminata vanno in 'Senza categoria'", () => {
    const gruppi = raggruppaCatalogo(
      [mp("Zafferano", null), mp("Tartufo", "c-eliminata"), mp("Manzo", "c-carne")],
      categorie,
    );
    const senza = gruppi.find((g) => g.chiave === GRUPPO_SENZA_CATEGORIA);
    expect(nomi(senza)).toEqual(["Tartufo", "Zafferano"]);
    // compare subito dopo le categorie, prima delle bevande
    expect(titoli(gruppi).indexOf("Senza categoria")).toBe(3);
  });

  it("'Senza categoria' non compare quando e' vuoto", () => {
    const gruppi = raggruppaCatalogo([mp("Manzo", "c-carne")], categorie);
    expect(gruppi.some((g) => g.chiave === GRUPPO_SENZA_CATEGORIA)).toBe(false);
  });

  it("usa ordineNelGruppo prima del nome (es. categorie bevanda)", () => {
    const gruppi = raggruppaCatalogo(
      [
        { tipo: "bevanda", nome: "Barolo", ordineNelGruppo: 3 },
        { tipo: "bevanda", nome: "Acqua Levissima", ordineNelGruppo: 0 },
        { tipo: "bevanda", nome: "Acqua Fiuggi", ordineNelGruppo: 0 },
      ],
      categorie,
    );
    expect(nomi(gruppi.find((g) => g.chiave === GRUPPO_BEVANDE))).toEqual([
      "Acqua Fiuggi",
      "Acqua Levissima",
      "Barolo",
    ]);
  });

  it("con una ricerca tiene solo i gruppi con risultati", () => {
    const gruppi = raggruppaCatalogo(
      [
        mp("Pomodoro pelati", "c-dispensa", "Mutti"),
        mp("Pomodoro pelati", "c-dispensa", "Cirio"),
        mp("Manzo", "c-carne"),
        { tipo: "bevanda", nome: "Succo di pomodoro" },
      ],
      categorie,
      "pomodoro",
    );
    expect(titoli(gruppi)).toEqual(["Dispensa", "Bevande"]);
    expect(gruppi[0].voci).toHaveLength(2);
  });

  it("un consumabile senza tipo e' un errore esplicito", () => {
    expect(() => raggruppaCatalogo([{ tipo: "consumabile", nome: "Vassoio" }], categorie)).toThrow(
      /senza tipo/,
    );
  });
});

describe("voceCorrisponde", () => {
  it("cerca in nome e marca, senza maiuscole ne' accenti", () => {
    expect(voceCorrisponde(mp("Pomodoro pelati", null, "Mutti"), "mutti")).toBe(true);
    expect(voceCorrisponde({ tipo: "bevanda", nome: "Caffè in grani" }, "CAFFE")).toBe(true);
    expect(voceCorrisponde({ tipo: "bevanda", nome: "Caffe" }, "caffè")).toBe(true);
    expect(voceCorrisponde(mp("Manzo", null), "pesce")).toBe(false);
  });

  it("una ricerca vuota o di soli spazi trova tutto", () => {
    expect(voceCorrisponde(mp("Manzo", null), "")).toBe(true);
    expect(voceCorrisponde(mp("Manzo", null), "   ")).toBe(true);
  });
});

describe("spostaInElenco", () => {
  it("scambia l'elemento con il vicino", () => {
    expect(spostaInElenco(["a", "b", "c"], "b", "su")).toEqual(["b", "a", "c"]);
    expect(spostaInElenco(["a", "b", "c"], "b", "giu")).toEqual(["a", "c", "b"]);
  });

  it("agli estremi l'elenco resta invariato", () => {
    expect(spostaInElenco(["a", "b"], "a", "su")).toEqual(["a", "b"]);
    expect(spostaInElenco(["a", "b"], "b", "giu")).toEqual(["a", "b"]);
  });

  it("lancia se l'elemento non c'e'", () => {
    expect(() => spostaInElenco(["a"], "z", "su")).toThrow();
  });
});

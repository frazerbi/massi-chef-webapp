/**
 * §5.3 — Scalatura per numero di ospiti con sfrido di servizio.
 *
 * quantita_totale = quantita_per_porzione × numero_ospiti × (1 + sfrido_pct/100)
 *
 * Lo sfrido (default 10% catering, 5% privato) è distinto dalla resa della
 * materia prima e copre assaggi, porzioni extra e imprevisti.
 */

export function quantitaTotaleIngrediente(
  quantitaPerPorzione: number,
  numeroOspiti: number,
  sfridoPct: number,
): number {
  if (!Number.isFinite(quantitaPerPorzione) || quantitaPerPorzione <= 0) {
    throw new Error(`Quantità per porzione non valida: ${quantitaPerPorzione}`);
  }
  if (!Number.isInteger(numeroOspiti) || numeroOspiti <= 0) {
    throw new Error(`Numero ospiti non valido: ${numeroOspiti}`);
  }
  if (!Number.isFinite(sfridoPct) || sfridoPct < 0) {
    throw new Error(`Sfrido non valido: ${sfridoPct}`);
  }
  return quantitaPerPorzione * numeroOspiti * (1 + sfridoPct / 100);
}

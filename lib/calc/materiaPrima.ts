/**
 * §5.1 — Costo per unità d'uso di una materia prima, tenendo conto della
 * conversione unità di acquisto -> unità d'uso e della resa (scarto).
 *
 * costo_per_unita_uso = prezzo_acquisto / fattore_conversione / (resa / 100)
 *
 * Il risultato è in centesimi per unità d'uso e può essere frazionario
 * (es. 4 cent/g per il branzino a 18 €/kg con resa 45%).
 */

export interface CostoMateriaPrimaInput {
  prezzoAcquistoCent: number;
  fattoreConversione: number;
  resaPercentuale: number;
}

export function costoUnitaUsoCent(input: CostoMateriaPrimaInput): number {
  const { prezzoAcquistoCent, fattoreConversione, resaPercentuale } = input;
  if (!Number.isFinite(prezzoAcquistoCent) || prezzoAcquistoCent < 0) {
    throw new Error(`Prezzo di acquisto non valido: ${prezzoAcquistoCent}`);
  }
  if (!Number.isFinite(fattoreConversione) || fattoreConversione <= 0) {
    throw new Error(`Fattore di conversione non valido: ${fattoreConversione}`);
  }
  if (
    !Number.isFinite(resaPercentuale) ||
    resaPercentuale < 1 ||
    resaPercentuale > 100
  ) {
    throw new Error(`Resa percentuale non valida (1–100): ${resaPercentuale}`);
  }
  return prezzoAcquistoCent / fattoreConversione / (resaPercentuale / 100);
}

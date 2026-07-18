/**
 * Validazioni lato server degli input delle anagrafiche.
 * Funzioni pure: lanciano un errore esplicito sul primo campo non valido.
 */

import type { UnitaAcquisto, UnitaUso } from "./types";

export function validaTesto(valore: unknown, campo: string): string {
  if (typeof valore !== "string" || valore.trim().length === 0) {
    throw new Error(`Campo obbligatorio: ${campo}`);
  }
  return valore.trim();
}

export function validaCentesimi(valore: unknown, campo: string): number {
  const n = Number(valore);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error(`Importo non valido per ${campo}: ${valore}`);
  }
  return n;
}

export function validaQuantita(valore: unknown, campo: string): number {
  const n = Number(valore);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Quantità non valida per ${campo}: ${valore}`);
  }
  return Math.round(n * 1000) / 1000; // quantità a 3 decimali
}

export function validaIntero(
  valore: unknown,
  campo: string,
  minimo = 0,
): number {
  const n = Number(valore);
  if (!Number.isInteger(n) || n < minimo) {
    throw new Error(`Valore non valido per ${campo}: ${valore}`);
  }
  return n;
}

export function validaPercentuale(
  valore: unknown,
  campo: string,
  minimo: number,
  massimo: number,
): number {
  const n = Number(valore);
  if (!Number.isFinite(n) || n < minimo || n > massimo) {
    throw new Error(
      `Percentuale non valida per ${campo} (${minimo}–${massimo}): ${valore}`,
    );
  }
  return Math.round(n * 100) / 100;
}

export function validaResa(valore: unknown): number {
  return validaPercentuale(valore, "resa", 1, 100);
}

export function validaMargine(valore: unknown): number {
  const n = validaPercentuale(valore, "margine target", 0, 99.99);
  if (n >= 100) throw new Error(`Margine target deve essere < 100: ${valore}`);
  return n;
}

export function validaDataFutura(valore: unknown, campo: string): string {
  if (typeof valore !== "string" || Number.isNaN(Date.parse(valore))) {
    throw new Error(`Data non valida per ${campo}: ${valore}`);
  }
  return valore;
}

/** Coppie ammesse: mai conversioni implicite peso <-> volume (invariante 5). */
export function validaConversioneUnita(
  unitaAcquisto: UnitaAcquisto,
  unitaUso: UnitaUso,
): void {
  const coerente =
    (unitaAcquisto === "kg" && unitaUso === "g") ||
    (unitaAcquisto === "l" && unitaUso === "ml") ||
    ((unitaAcquisto === "pz" || unitaAcquisto === "conf") && unitaUso === "pz");
  if (!coerente) {
    throw new Error(
      `Conversione non ammessa: ${unitaAcquisto} -> ${unitaUso} (mai peso <-> volume)`,
    );
  }
}

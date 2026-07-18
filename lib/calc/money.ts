/**
 * Denaro: nei calcoli interni gli importi viaggiano in centesimi di euro.
 * I costi unitari intermedi (es. costo al grammo) possono essere frazionari;
 * l'arrotondamento a centesimo intero avviene sui totali, quello a 2 decimali
 * solo in presentazione.
 */

export function arrotondaCentesimi(valoreCent: number): number {
  if (!Number.isFinite(valoreCent)) {
    throw new Error(`Importo non valido: ${valoreCent}`);
  }
  return Math.round(valoreCent);
}

/** Formatta centesimi in euro per la presentazione (es. 123456 -> "1.234,56 €"). */
export function formattaEuro(valoreCent: number): string {
  if (!Number.isFinite(valoreCent)) {
    throw new Error(`Importo non valido: ${valoreCent}`);
  }
  return (valoreCent / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

/** Converte un input utente in euro (stringa o numero) in centesimi interi. */
export function centesimiDaEuro(euro: number): number {
  if (!Number.isFinite(euro) || euro < 0) {
    throw new Error(`Valore in euro non valido: ${euro}`);
  }
  return Math.round(euro * 100);
}

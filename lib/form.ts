/**
 * Parsing degli input dei form (stringhe in formato italiano) verso i tipi
 * interni: euro con virgola -> centesimi interi, numeri con virgola.
 */

export function parseEuroCent(valore: FormDataEntryValue | null, campo: string): number {
  if (typeof valore !== "string" || valore.trim() === "") {
    throw new Error(`Campo obbligatorio: ${campo}`);
  }
  const normalizzato = valore.replace(/\./g, "").replace(",", ".").replace("€", "").trim();
  const n = Number(normalizzato);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Importo non valido per ${campo}: ${valore}`);
  }
  return Math.round(n * 100);
}

export function parseNumero(valore: FormDataEntryValue | null, campo: string): number {
  if (typeof valore !== "string" || valore.trim() === "") {
    throw new Error(`Campo obbligatorio: ${campo}`);
  }
  const n = Number(valore.replace(",", "."));
  if (!Number.isFinite(n)) {
    throw new Error(`Numero non valido per ${campo}: ${valore}`);
  }
  return n;
}

export function parseNumeroOpzionale(
  valore: FormDataEntryValue | null,
): number | null {
  if (typeof valore !== "string" || valore.trim() === "") return null;
  const n = Number(valore.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseTesto(valore: FormDataEntryValue | null, campo: string): string {
  if (typeof valore !== "string" || valore.trim() === "") {
    throw new Error(`Campo obbligatorio: ${campo}`);
  }
  return valore.trim();
}

export function parseTestoOpzionale(valore: FormDataEntryValue | null): string | null {
  if (typeof valore !== "string" || valore.trim() === "") return null;
  return valore.trim();
}

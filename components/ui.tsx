import type { ReactNode } from "react";

/** Classi condivise per form e tabelle (nessuna component library: solo Tailwind). */
export const classiInput =
  "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm";
export const classiBottone =
  "rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700";
export const classiBottoneSecondario =
  "rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100";
export const classiTh =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-500";
export const classiTd = "px-3 py-2 text-sm";

export function TitoloPagina({
  titolo,
  sottotitolo,
  children,
}: {
  titolo: string;
  sottotitolo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{titolo}</h1>
        {sottotitolo && <p className="mt-1 text-sm text-stone-500">{sottotitolo}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

export function Riquadro({
  titolo,
  children,
}: {
  titolo?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      {titolo && <h2 className="mb-4 text-lg font-semibold">{titolo}</h2>}
      {children}
    </section>
  );
}

/**
 * Tooltip: "?" accanto a un'etichetta, con la spiegazione nell'attributo
 * `title` nativo del browser. Nessuna libreria e nessun JS, quindi funziona
 * anche nei server component; `aria-label` e `tabIndex` lo rendono
 * raggiungibile da tastiera e screen reader.
 */
export function Aiuto({ testo }: { testo: string }) {
  return (
    <span
      title={testo}
      aria-label={testo}
      role="note"
      tabIndex={0}
      className="ml-1 inline-flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border border-stone-300 align-middle text-[10px] font-semibold text-stone-500"
    >
      ?
    </span>
  );
}

export function Etichetta({
  testo,
  aiuto,
  children,
}: {
  testo: string;
  /** testo del tooltip mostrato dal "?" accanto all'etichetta */
  aiuto?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{testo}</span>
      {aiuto && <Aiuto testo={aiuto} />}
      {children}
    </label>
  );
}

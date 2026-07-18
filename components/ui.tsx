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

export function Etichetta({
  testo,
  children,
}: {
  testo: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{testo}</span>
      {children}
    </label>
  );
}

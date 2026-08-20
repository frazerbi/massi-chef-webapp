"use client";

import { useState } from "react";
import { classiBottoneSecondario } from "./ui";

/**
 * Riapertura di un preventivo non più in bozza: deroga all'invariante 1, quindi
 * mai a un solo click. Primo click = intenzione, secondo = conferma esplicita,
 * dopo aver letto cosa comporta (snapshot azzerato, ricalcolo sui prezzi correnti).
 */
export function BottoneRiapriPreventivo({
  preventivoId,
  stato,
  azione,
}: {
  preventivoId: string;
  stato: string;
  azione: (formData: FormData) => Promise<void>;
}) {
  const [confermando, setConfermando] = useState(false);

  if (!confermando) {
    return (
      <button
        type="button"
        className={classiBottoneSecondario}
        onClick={() => setConfermando(true)}
      >
        Riporta in bozza per modificarlo
      </button>
    );
  }

  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      <p className="font-semibold">Riportare in bozza questo preventivo?</p>
      <ul className="mt-1 list-disc pl-5">
        <li>
          I costi congelati all&apos;invio vengono <strong>cancellati</strong>: il
          preventivo tornerà a calcolarsi sui prezzi attuali delle materie prime, quindi
          i totali possono cambiare.
        </li>
        <li>
          Se il preventivo è già stato mandato al cliente, la versione che ha in mano non
          corrisponderà più a questa. L&apos;alternativa che conserva l&apos;originale è
          &laquo;Crea revisione&raquo;.
        </li>
        <li>Stato attuale: {stato}. Il passaggio resta registrato nello storico stati.</li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={azione}>
          <input type="hidden" name="id" value={preventivoId} />
          <input type="hidden" name="conferma" value="riporta-in-bozza" />
          <button
            type="submit"
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
          >
            Sì, riporta in bozza
          </button>
        </form>
        <button
          type="button"
          className={classiBottoneSecondario}
          onClick={() => setConfermando(false)}
        >
          Annulla
        </button>
      </div>
    </div>
  );
}

import { impostaNuovaPassword } from "./actions";

const messaggiErrore: Record<string, string> = {
  corta: "La password deve avere almeno 8 caratteri.",
  mismatch: "Le due password non coincidono.",
  generico:
    "Non è stato possibile impostare la password. Il link potrebbe essere scaduto: richiedine uno nuovo.",
};

export default async function PaginaImpostaPassword({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const { errore } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Imposta nuova password</h1>

        {errore && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {messaggiErrore[errore] ?? "Si è verificato un errore. Riprova."}
          </p>
        )}

        <form action={impostaNuovaPassword} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Nuova password</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Conferma password</span>
            <input
              type="password"
              name="conferma"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700"
          >
            Salva nuova password
          </button>
        </form>
      </div>
    </main>
  );
}

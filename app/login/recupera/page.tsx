import Link from "next/link";
import { richiediRecuperoPassword } from "./actions";

export default async function PaginaRecuperaPassword({
  searchParams,
}: {
  searchParams: Promise<{ inviato?: string }>;
}) {
  const { inviato } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Recupera password</h1>
        <p className="mt-1 text-sm text-stone-500">
          Inserisci la tua email: se corrisponde a un account, riceverai un link per
          reimpostare la password.
        </p>

        {inviato ? (
          <p className="mt-6 rounded-md bg-stone-50 p-3 text-sm text-stone-700">
            Se l&apos;indirizzo è registrato, a breve riceverai un&apos;email con le
            istruzioni per reimpostare la password.
          </p>
        ) : (
          <form action={richiediRecuperoPassword} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="font-medium">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-md bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700"
            >
              Invia link di recupero
            </button>
          </form>
        )}

        <p className="mt-4 text-sm">
          <Link href="/login" className="text-stone-600 underline">
            Torna al login
          </Link>
        </p>
      </div>
    </main>
  );
}

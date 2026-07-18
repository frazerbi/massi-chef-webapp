import { accedi } from "./actions";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const { errore } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Chef Manager</h1>
        <p className="mt-1 text-sm text-stone-500">
          Accedi con le credenziali del tuo account Supabase.
        </p>
        {errore && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Credenziali non valide. Riprova.
          </p>
        )}
        <form action={accedi} className="mt-6 space-y-4">
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
          <label className="block text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700"
          >
            Accedi
          </button>
        </form>
      </div>
    </main>
  );
}

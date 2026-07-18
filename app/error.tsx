"use client";

export default function ErrorePagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-800">Si è verificato un errore</h1>
        <p className="mt-2 text-sm text-red-700">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          Riprova
        </button>
      </div>
    </main>
  );
}

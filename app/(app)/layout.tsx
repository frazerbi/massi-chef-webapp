import Nav from "@/components/Nav";

// Tutte le schermate leggono dati per-utente da Supabase: mai prerender statico.
export const dynamic = "force-dynamic";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

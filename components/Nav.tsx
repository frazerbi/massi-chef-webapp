import Link from "next/link";
import { esci } from "@/app/login/actions";

const VOCI = [
  { href: "/", etichetta: "Dashboard" },
  { href: "/materie-prime", etichetta: "Materie prime" },
  { href: "/consumabili", etichetta: "Consumabili" },
  { href: "/ricette", etichetta: "Ricette" },
  { href: "/menu", etichetta: "Menu" },
  { href: "/bevande", etichetta: "Bevande" },
  { href: "/profili-beveraggio", etichetta: "Profili beveraggio" },
  { href: "/preventivi", etichetta: "Preventivi" },
  { href: "/impostazioni", etichetta: "Impostazioni" },
];

export default function Nav() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="mr-2 text-lg font-semibold">
          Chef Manager
        </Link>
        <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {VOCI.map((voce) => (
            <Link
              key={voce.href}
              href={voce.href}
              className="rounded-md px-2 py-1 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            >
              {voce.etichetta}
            </Link>
          ))}
        </nav>
        <form action={esci} className="ml-auto">
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            Esci
          </button>
        </form>
      </div>
    </header>
  );
}

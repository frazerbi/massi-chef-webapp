import type { NextRequest } from "next/server";
import { aggiornaSessione } from "@/lib/db/middleware";

export async function proxy(request: NextRequest) {
  return aggiornaSessione(request);
}

export const config = {
  matcher: [
    // tutto tranne asset statici e immagini
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

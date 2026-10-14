import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

// Next.js 16: "middleware" fue renombrado a "proxy".
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, optimización de imágenes y recursos públicos.
    "/((?!_next/static|_next/image|favicon.ico|img/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

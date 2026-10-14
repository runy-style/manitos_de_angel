import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

// Next.js 16: "middleware" fue renombrado a "proxy".
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

// Compatibilidad con adaptadores de Vercel
export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    // Proteger únicamente el dashboard. La landing page (/) y recursos públicos
    // se sirven de forma directa e instantánea sin intercepción de Edge.
    "/dashboard",
    "/dashboard/:path*",
  ],
};

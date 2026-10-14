import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "./config";

/**
 * Refresca la sesión de Supabase en cada solicitud y protege las rutas internas.
 * Se invoca desde src/proxy.ts (convención de Next.js 16, antes "middleware").
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sin llaves reales no hay sesión posible: el dashboard se encarga de avisar.
  if (!supabaseConfigurado()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // IMPORTANTE: no ejecutar lógica entre createServerClient y getClaims().
  const { data } = await supabase.auth.getClaims();
  const usuario = data?.claims;

  const ruta = request.nextUrl.pathname;
  if (!usuario && ruta.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?acceso=requerido";
    url.hash = "acceso";
    return NextResponse.redirect(url);
  }

  return response;
}

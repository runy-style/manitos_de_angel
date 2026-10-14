import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "./config";

/**
 * Refresca la sesión de Supabase en cada solicitud y protege las rutas internas.
 * Se invoca desde src/proxy.ts (convención de Next.js 16, antes "middleware").
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseConfigurado()) return response;

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ruta = request.nextUrl.pathname;
    if (!user && ruta.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "?acceso=requerido";
      url.hash = "acceso";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("Error al verificar sesión en proxy:", error);
  }

  return response;
}

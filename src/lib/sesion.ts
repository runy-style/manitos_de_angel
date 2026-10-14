import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import type { PerfilConNivel } from "@/lib/types";

export type EstadoSesion =
  | { tipo: "sin-configurar" }
  | { tipo: "sin-sesion" }
  | { tipo: "sin-perfil"; email: string | null }
  | { tipo: "ok"; perfil: PerfilConNivel };

/**
 * Obtiene el usuario autenticado y su perfil (rol + nivel asignado).
 * Memoizado por solicitud con React.cache para no repetir consultas
 * entre el layout y las páginas del dashboard.
 */
export const obtenerSesion = cache(async (): Promise<EstadoSesion> => {
  if (!supabaseConfigurado()) return { tipo: "sin-configurar" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { tipo: "sin-sesion" };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, email, rol, nivel_id, nivel:niveles(id, nombre)")
    .eq("id", user.id)
    .maybeSingle<PerfilConNivel>();

  if (!perfil) return { tipo: "sin-perfil", email: user.email ?? null };

  return { tipo: "ok", perfil };
});

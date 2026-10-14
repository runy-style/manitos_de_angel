"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puedeEditarNivel } from "@/lib/permisos";
import type { CategoriaComunicado } from "@/lib/types";

export type EstadoAccionComunicado = {
  ok?: boolean;
  error?: string;
  mensaje?: string;
} | undefined;

export async function crearComunicadoAction(
  _prev: EstadoAccionComunicado,
  formData: FormData,
): Promise<EstadoAccionComunicado> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado o no tienes permisos." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();
  const categoria = (String(formData.get("categoria") ?? "informativo").trim()) as CategoriaComunicado;
  const nivelRaw = String(formData.get("nivel_id") ?? "").trim();
  const nivel_id = nivelRaw === "" || nivelRaw === "todos" ? null : nivelRaw;
  const fecha_evento = String(formData.get("fecha_evento") ?? "").trim() || null;
  const adjunto_url = String(formData.get("adjunto_url") ?? "").trim() || null;
  const fijado = formData.get("fijado") === "on" || formData.get("fijado") === "true";

  if (!titulo || !contenido) {
    return { ok: false, error: "El título y el contenido del comunicado son obligatorios." };
  }

  // Si especifica un nivel, verificar permisos
  if (nivel_id && !puedeEditarNivel(sesion.perfil, nivel_id)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo del nivel o el equipo directivo pueden publicar comunicados para este nivel.",
    };
  }

  // Si es para todo el jardín, permitirlo a educadoras, directivos y administradores
  const supabase = await createClient();

  const { error } = await supabase.from("comunicados").insert({
    titulo,
    contenido,
    categoria,
    nivel_id,
    autor_id: sesion.perfil.id,
    fijado,
    fecha_evento,
    adjunto_url,
    activo: true,
  });

  if (error) {
    return { ok: false, error: `Error al publicar comunicado: ${error.message}` };
  }

  revalidatePath("/dashboard/comunicados");
  revalidatePath("/apoderado");
  revalidatePath("/dashboard");
  return { ok: true, mensaje: "Comunicado publicado exitosamente." };
}

export async function toggleFijarComunicadoAction(
  id: string,
  fijadoActual: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Sesión no válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("comunicados")
    .update({ fijado: !fijadoActual, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/comunicados");
  revalidatePath("/apoderado");
  return { ok: true };
}

export async function eliminarComunicadoAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Sesión no válida." };
  }

  const supabase = await createClient();
  // Soft delete para preservar historial
  const { error } = await supabase
    .from("comunicados")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/comunicados");
  revalidatePath("/apoderado");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";

export type EstadoAccionBitacora = {
  ok?: boolean;
  error?: string;
  mensaje?: string;
} | undefined;

function usuarioPuedeEditar(
  rol: string,
  nivelUsuario: string | null,
  nivelObjetivo: string,
): boolean {
  if (rol === "admin") return true;
  return rol === "educadora" && nivelUsuario === nivelObjetivo;
}

export async function crearEntradaBitacora(
  _prev: EstadoAccionBitacora,
  formData: FormData,
): Promise<EstadoAccionBitacora> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado o no tienes permisos." };
  }

  const parvulo_id = String(formData.get("parvulo_id") ?? "").trim();
  const nivel_id = String(formData.get("nivel_id") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const area_avance = String(formData.get("area_avance") ?? "").trim();
  const observacion = String(formData.get("observacion") ?? "").trim();
  const visible_apoderado = formData.get("visible_apoderado") === "on";

  if (!parvulo_id || !nivel_id || !fecha || !area_avance || !observacion) {
    return { ok: false, error: "Todos los campos con asterisco son obligatorios." };
  }

  if (!usuarioPuedeEditar(sesion.perfil.rol, sesion.perfil.nivel_id, nivel_id)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo del nivel o administración pueden registrar observaciones.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bitacoras").insert({
    parvulo_id,
    nivel_id,
    educadora_id: sesion.perfil.id,
    fecha,
    area_avance,
    observacion,
    visible_apoderado,
  });

  if (error) {
    return { ok: false, error: `Error al guardar en la bitácora: ${error.message}` };
  }

  revalidatePath("/dashboard/bitacora");
  revalidatePath("/dashboard/parvulos");
  return { ok: true, mensaje: "Observación de bitácora registrada con éxito." };
}

export async function actualizarEntradaBitacora(
  _prev: EstadoAccionBitacora,
  formData: FormData,
): Promise<EstadoAccionBitacora> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado o no tienes permisos." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const nivel_id = String(formData.get("nivel_id") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const area_avance = String(formData.get("area_avance") ?? "").trim();
  const observacion = String(formData.get("observacion") ?? "").trim();
  const visible_apoderado = formData.get("visible_apoderado") === "on";

  if (!id || !nivel_id || !fecha || !area_avance || !observacion) {
    return { ok: false, error: "Todos los campos obligatorios deben estar completos." };
  }

  if (!usuarioPuedeEditar(sesion.perfil.rol, sesion.perfil.nivel_id, nivel_id)) {
    return {
      ok: false,
      error: "No tienes permisos para modificar esta observación.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bitacoras")
    .update({
      fecha,
      area_avance,
      observacion,
      visible_apoderado,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: `Error al actualizar la bitácora: ${error.message}` };
  }

  revalidatePath("/dashboard/bitacora");
  revalidatePath("/dashboard/parvulos");
  return { ok: true, mensaje: "Observación actualizada correctamente." };
}

export async function eliminarEntradaBitacora(
  id: string,
  nivel_id: string,
): Promise<EstadoAccionBitacora> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado." };
  }

  if (!usuarioPuedeEditar(sesion.perfil.rol, sesion.perfil.nivel_id, nivel_id)) {
    return {
      ok: false,
      error: "No tienes permisos para eliminar esta observación.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bitacoras").delete().eq("id", id);

  if (error) {
    return { ok: false, error: `Error al eliminar la observación: ${error.message}` };
  }

  revalidatePath("/dashboard/bitacora");
  revalidatePath("/dashboard/parvulos");
  return { ok: true, mensaje: "Observación eliminada de la bitácora." };
}

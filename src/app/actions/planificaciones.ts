"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puedeEditarNivel } from "@/lib/permisos";
import { driveConfigurado, subirDocumentoNivelDrive } from "@/lib/drive";
import type { TipoDocumentoNivel } from "@/lib/types";

export type EstadoAccionPlanificacion = {
  ok?: boolean;
  error?: string;
  mensaje?: string;
} | undefined;

export async function crearDocumentoNivel(
  _prev: EstadoAccionPlanificacion,
  formData: FormData,
): Promise<EstadoAccionPlanificacion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado. Por favor inicia sesión nuevamente." };
  }

  const nivel_id = String(formData.get("nivel_id") ?? "").trim();
  const tipo_documento = String(formData.get("tipo_documento") ?? "") as TipoDocumentoNivel;
  const mes = parseInt(String(formData.get("mes") ?? "1"), 10);
  const anio = parseInt(String(formData.get("anio") ?? new Date().getFullYear()), 10);
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const enlaceDirecto = String(formData.get("enlace_directo") ?? "").trim();
  const archivo = formData.get("archivo") as File | null;

  if (!nivel_id || !tipo_documento || !titulo || !mes || !anio) {
    return { ok: false, error: "Completa todos los campos obligatorios (*)." };
  }

  if (!puedeEditarNivel(sesion.perfil, nivel_id)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo del nivel o administración pueden subir planificaciones.",
    };
  }

  const supabase = await createClient();

  // Obtener nombre del nivel para la carpeta de Drive
  const { data: nivel } = await supabase
    .from("niveles")
    .select("nombre")
    .eq("id", nivel_id)
    .single();

  const nombreNivel = nivel?.nombre ?? "General";

  let drive_file_id: string | null = null;
  let drive_file_url: string = enlaceDirecto;
  let nombre_archivo: string = archivo?.name || titulo;

  // Si se adjuntó un archivo físico
  if (archivo && archivo.size > 0) {
    if (!driveConfigurado()) {
      if (!enlaceDirecto) {
        return {
          ok: false,
          error:
            "Para subir archivos directamente se requiere configurar GOOGLE_SCRIPT_WEBHOOK_URL. Puedes ingresar un enlace de Google Drive en el campo 'Enlace alternativo'.",
        };
      }
    } else {
      try {
        const buffer = Buffer.from(await archivo.arrayBuffer());
        const base64Data = buffer.toString("base64");
        const mimeType = archivo.type || "application/octet-stream";

        const resDrive = await subirDocumentoNivelDrive({
          nombreNivel,
          tipoDocumento: tipo_documento,
          nombreArchivo: archivo.name,
          mimeType,
          base64Data,
        });

        if (!resDrive.ok || !resDrive.fileUrl) {
          return {
            ok: false,
            error: resDrive.error || "No se pudo subir el archivo a Google Drive.",
          };
        }

        drive_file_id = resDrive.fileId ?? null;
        drive_file_url = resDrive.fileUrl;
        nombre_archivo = archivo.name;
      } catch (err: unknown) {
        return {
          ok: false,
          error:
            "Error al comunicarse con Google Drive: " +
            (err instanceof Error ? err.message : String(err)),
        };
      }
    }
  }

  if (!drive_file_url) {
    return {
      ok: false,
      error: "Debes seleccionar un archivo o ingresar un enlace de Google Drive.",
    };
  }

  const { error } = await supabase.from("documentos_nivel").insert({
    nivel_id,
    educadora_id: sesion.perfil.id,
    tipo_documento,
    mes,
    anio,
    titulo,
    descripcion,
    drive_file_id,
    drive_file_url,
    nombre_archivo,
  });

  if (error) {
    return { ok: false, error: "Error al guardar en la base de datos: " + error.message };
  }

  revalidatePath("/dashboard/planificaciones");
  return { ok: true, mensaje: "Documento guardado exitosamente." };
}

export async function eliminarDocumentoNivel(
  id: string,
  nivel_id: string,
): Promise<EstadoAccionPlanificacion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado." };
  }

  if (!puedeEditarNivel(sesion.perfil, nivel_id)) {
    return {
      ok: false,
      error: "No tienes permisos para eliminar este documento.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documentos_nivel").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Error al eliminar: " + error.message };
  }

  revalidatePath("/dashboard/planificaciones");
  return { ok: true, mensaje: "Documento eliminado correctamente." };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puedeEditarNivel } from "@/lib/permisos";
import {
  asegurarCarpetaParvuloDrive,
  driveConfigurado,
  subirArchivoParvuloDrive,
} from "@/lib/drive";
import type { ArchivoParvulo, CategoriaArchivoParvulo } from "@/lib/types";

export type EstadoAccionArchivo = {
  ok?: boolean;
  error?: string;
  mensaje?: string;
  folderUrl?: string;
} | undefined;

export async function subirArchivoParvulo(
  _prev: EstadoAccionArchivo,
  formData: FormData,
): Promise<EstadoAccionArchivo> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado. Por favor inicia sesión nuevamente." };
  }

  const parvulo_id = String(formData.get("parvulo_id") ?? "").trim();
  const nivel_id = String(formData.get("nivel_id") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "fotografia") as CategoriaArchivoParvulo;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const visible_apoderado = formData.get("visible_apoderado") === "on";
  const enlaceDirecto = String(formData.get("enlace_directo") ?? "").trim();
  const archivo = formData.get("archivo") as File | null;

  if (!parvulo_id || !nivel_id || !titulo) {
    return { ok: false, error: "Completa todos los campos obligatorios (*)." };
  }

  if (!puedeEditarNivel(sesion.perfil, nivel_id)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo del nivel o administración pueden subir archivos a este párvulo.",
    };
  }

  const supabase = await createClient();

  // Obtener datos del párvulo y nivel
  const { data: parvulo } = await supabase
    .from("parvulos")
    .select("nombres, apellidos, rut, drive_folder_id, drive_folder_url, nivel:niveles(nombre)")
    .eq("id", parvulo_id)
    .single();

  if (!parvulo) {
    return { ok: false, error: "El párvulo no fue encontrado." };
  }

  const nombreParvulo = `${parvulo.nombres} ${parvulo.apellidos}`;
  const nombreNivel = (parvulo.nivel as unknown as { nombre: string })?.nombre ?? "General";

  let drive_file_id: string | null = null;
  let drive_file_url: string = enlaceDirecto;

  if (archivo && archivo.size > 0) {
    if (!driveConfigurado()) {
      if (!enlaceDirecto) {
        return {
          ok: false,
          error:
            "Para subir archivos directamente a Drive debes configurar GOOGLE_SCRIPT_WEBHOOK_URL en Vercel/.env.local, o ingresar un enlace de Drive manualmente.",
        };
      }
    } else {
      try {
        const buffer = Buffer.from(await archivo.arrayBuffer());
        const base64Data = buffer.toString("base64");
        const mimeType = archivo.type || "application/octet-stream";

        const resDrive = await subirArchivoParvuloDrive({
          rutParvulo: parvulo.rut,
          nombreParvulo,
          nombreNivel,
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

        // Si Drive devolvió carpeta y el párvulo no la tenía, la actualizamos
        if (resDrive.folderUrl && !parvulo.drive_folder_url) {
          await supabase
            .from("parvulos")
            .update({
              drive_folder_id: resDrive.folderId,
              drive_folder_url: resDrive.folderUrl,
            })
            .eq("id", parvulo_id);
        }
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
      error: "Debes adjuntar un archivo o ingresar un enlace de Google Drive.",
    };
  }

  const { error } = await supabase.from("archivos_parvulo").insert({
    parvulo_id,
    educadora_id: sesion.perfil.id,
    categoria,
    titulo,
    drive_file_id,
    drive_file_url,
    visible_apoderado,
  });

  if (error) {
    return { ok: false, error: "Error al registrar archivo: " + error.message };
  }

  revalidatePath("/dashboard/parvulos");
  revalidatePath("/dashboard/bitacora");
  return { ok: true, mensaje: "Archivo guardado exitosamente." };
}

export async function eliminarArchivoParvulo(
  id: string,
  nivel_id: string,
): Promise<EstadoAccionArchivo> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Tu sesión ha expirado." };
  }

  if (!puedeEditarNivel(sesion.perfil, nivel_id)) {
    return {
      ok: false,
      error: "No tienes permisos para eliminar este archivo.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("archivos_parvulo").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Error al eliminar: " + error.message };
  }

  revalidatePath("/dashboard/parvulos");
  revalidatePath("/dashboard/bitacora");
  return { ok: true, mensaje: "Archivo eliminado." };
}

export async function crearCarpetaDriveParvulo(
  parvulo_id: string,
): Promise<EstadoAccionArchivo> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Sesión expirada." };
  }

  const supabase = await createClient();
  const { data: parvulo } = await supabase
    .from("parvulos")
    .select("nombres, apellidos, rut, nivel_id, nivel:niveles(nombre)")
    .eq("id", parvulo_id)
    .single();

  if (!parvulo) {
    return { ok: false, error: "Párvulo no encontrado." };
  }

  if (!puedeEditarNivel(sesion.perfil, parvulo.nivel_id)) {
    return { ok: false, error: "Sin permisos para editar este nivel." };
  }

  const nombreNivel = (parvulo.nivel as unknown as { nombre: string })?.nombre ?? "General";
  const res = await asegurarCarpetaParvuloDrive({
    rutParvulo: parvulo.rut,
    nombreParvulo: `${parvulo.nombres} ${parvulo.apellidos}`,
    nombreNivel,
  });

  if (!res.ok || !res.folderUrl) {
    return {
      ok: false,
      error: res.error || "No se pudo crear la carpeta en Google Drive.",
    };
  }

  await supabase
    .from("parvulos")
    .update({
      drive_folder_id: res.folderId,
      drive_folder_url: res.folderUrl,
    })
    .eq("id", parvulo_id);

  revalidatePath("/dashboard/parvulos");
  return {
    ok: true,
    mensaje: "Carpeta en Google Drive creada correctamente.",
    folderUrl: res.folderUrl,
  };
}

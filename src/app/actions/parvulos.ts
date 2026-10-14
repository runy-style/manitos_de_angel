"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puedeEditarNivel } from "@/lib/permisos";
import { normalizarRut, validarRut } from "@/lib/rut";
import { driveConfigurado, asegurarCarpetaParvuloDrive } from "@/lib/drive";
import type { Parvulo } from "@/lib/types";

export type RespuestaAccion = {
  ok: boolean;
  error?: string;
  parvulo?: Parvulo;
};

export async function guardarParvulo(
  _prev: RespuestaAccion | undefined,
  formData: FormData,
): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "No tienes una sesión activa autorizada." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const nivelId = String(formData.get("nivel_id") ?? "").trim();
  const rutOriginal = String(formData.get("rut") ?? "").trim();
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "").trim() || null;
  const nombreApoderado = String(formData.get("nombre_apoderado") ?? "").trim() || null;
  const telefonoApoderado = String(formData.get("telefono_apoderado") ?? "").trim() || null;
  const driveFolderUrl = String(formData.get("drive_folder_url") ?? "").trim() || null;

  if (!nivelId) {
    return { ok: false, error: "Debes seleccionar un nivel para el párvulo." };
  }

  // Verificar permisos: solo la educadora a cargo del nivel puede guardar
  if (!puedeEditarNivel(sesion.perfil, nivelId)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo de este nivel tiene permisos para crear o modificar párvulos.",
    };
  }

  if (!rutOriginal || !validarRut(rutOriginal)) {
    return { ok: false, error: "El RUT ingresado no es válido. Revisa los números y el dígito verificador." };
  }

  if (!nombres || !apellidos) {
    return { ok: false, error: "Ingresa los nombres y apellidos del párvulo." };
  }

  const rutNormalizado = normalizarRut(rutOriginal);
  const supabase = await createClient();

  if (id) {
    // Actualizar párvulo existente
    const { data, error } = await supabase
      .from("parvulos")
      .update({
        rut: rutNormalizado,
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
        nombre_apoderado: nombreApoderado,
        telefono_apoderado: telefonoApoderado,
        nivel_id: nivelId,
        drive_folder_url: driveFolderUrl,
      })
      .eq("id", id)
      .select()
      .single<Parvulo>();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Ya existe otro párvulo registrado con este mismo RUT." };
      }
      return { ok: false, error: "Error al actualizar el párvulo: " + error.message };
    }

    revalidarRutas();
    return { ok: true, parvulo: data };
  } else {
    // Crear nuevo párvulo
    const { data, error } = await supabase
      .from("parvulos")
      .insert({
        rut: rutNormalizado,
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
        nombre_apoderado: nombreApoderado,
        telefono_apoderado: telefonoApoderado,
        nivel_id: nivelId,
        drive_folder_url: driveFolderUrl,
        activo: true,
      })
      .select()
      .single<Parvulo>();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Ya existe un párvulo registrado con este RUT." };
      }
      return { ok: false, error: "Error al registrar el párvulo: " + error.message };
    }

    if (driveConfigurado() && !driveFolderUrl && data) {
      try {
        const { data: nivel } = await supabase
          .from("niveles")
          .select("nombre")
          .eq("id", nivelId)
          .single();

        const resDrive = await asegurarCarpetaParvuloDrive({
          rutParvulo: rutNormalizado,
          nombreParvulo: `${nombres} ${apellidos}`,
          nombreNivel: nivel?.nombre ?? "General",
        });

        if (resDrive.ok && resDrive.folderUrl) {
          await supabase
            .from("parvulos")
            .update({
              drive_folder_id: resDrive.folderId,
              drive_folder_url: resDrive.folderUrl,
            })
            .eq("id", data.id);
          data.drive_folder_id = resDrive.folderId ?? null;
          data.drive_folder_url = resDrive.folderUrl;
        }
      } catch {
        // Si Drive está temporalmente inaccesible no bloquea la inscripción
      }
    }

    revalidarRutas();
    return { ok: true, parvulo: data };
  }
}

export async function alternarEstadoParvulo(id: string, activoNuevo: boolean): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "No tienes una sesión activa autorizada." };
  }

  const supabase = await createClient();

  // Obtener el párvulo para verificar el nivel
  const { data: parvulo } = await supabase
    .from("parvulos")
    .select("nivel_id")
    .eq("id", id)
    .single<{ nivel_id: string }>();

  if (!parvulo || !puedeEditarNivel(sesion.perfil, parvulo.nivel_id)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo del nivel puede cambiar el estado de este párvulo.",
    };
  }

  const { error } = await supabase
    .from("parvulos")
    .update({ activo: activoNuevo })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Error al cambiar estado: " + error.message };
  }

  revalidarRutas();
  return { ok: true };
}

function revalidarRutas() {
  revalidatePath("/dashboard/parvulos");
  revalidatePath("/dashboard/asistencia");
  revalidatePath("/dashboard/estadisticas");
  revalidatePath("/dashboard");
}

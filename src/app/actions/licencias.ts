"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { subirArchivoParvuloDrive } from "@/lib/drive";
import { limpiarRut, validarRut } from "@/lib/rut";
import { obtenerSesion } from "@/lib/sesion";
import type { FichaApoderado } from "@/lib/types";

export interface EstadoSubidaLicencia {
  ok?: boolean;
  error?: string;
  mensaje?: string;
}

/**
 * Server Action para que los apoderados suban su licencia médica
 * sin necesidad de credenciales, solo validando el RUT del párvulo.
 */
export async function subirLicenciaMedicaApoderado(
  _prev: EstadoSubidaLicencia | undefined,
  formData: FormData,
): Promise<EstadoSubidaLicencia> {
  if (!supabaseConfigurado()) {
    return {
      ok: false,
      error: "El sistema no está conectado a Supabase en este momento.",
    };
  }

  const rutIngresado = String(formData.get("rut") ?? "").trim();
  const fechaInicio = String(formData.get("fecha_inicio") ?? "").trim();
  const diasReposoNum = Math.max(1, parseInt(String(formData.get("dias_reposo") ?? "1"), 10) || 1);
  const diagnosticoMotivo = String(formData.get("diagnostico_motivo") ?? "").trim();
  const archivo = formData.get("archivo") as File | null;

  if (!rutIngresado) {
    return { ok: false, error: "El RUT del párvulo es obligatorio." };
  }

  if (!validarRut(rutIngresado)) {
    return { ok: false, error: "El RUT ingresado no es válido." };
  }

  if (!fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
    return { ok: false, error: "Ingresa una fecha de inicio de reposo válida." };
  }

  if (!archivo || archivo.size === 0) {
    return { ok: false, error: "Debes adjuntar el documento de la licencia médica (PDF o Imagen)." };
  }

  // Límite de tamaño: 10MB
  if (archivo.size > 10 * 1024 * 1024) {
    return { ok: false, error: "El archivo no debe superar los 10 MB." };
  }

  // Calcular fecha de término
  const [y, m, d] = fechaInicio.split("-").map(Number);
  const fechaFinDate = new Date(y, m - 1, d + diasReposoNum - 1);
  const fechaTermino = `${fechaFinDate.getFullYear()}-${String(fechaFinDate.getMonth() + 1).padStart(2, "0")}-${String(fechaFinDate.getDate()).padStart(2, "0")}`;

  const supabase = await createClient();

  // 1. Verificar si el párvulo existe mediante la función RPC segura
  const { data: ficha, error: errFicha } = await supabase.rpc(
    "consultar_ficha_apoderado",
    { p_rut: rutIngresado },
  );

  const fichaTyped = ficha as FichaApoderado | null;
  if (errFicha || !fichaTyped || !fichaTyped.encontrado || !fichaTyped.parvulo) {
    return {
      ok: false,
      error:
        fichaTyped?.mensaje ??
        "No encontramos un párvulo activo asociado al RUT ingresado.",
    };
  }

  const parvulo = fichaTyped.parvulo;
  const nombreCompleto = `${parvulo.nombres} ${parvulo.apellidos}`.trim();
  const nombreNivel = parvulo.nivel || "General";

  // 2. Procesar el archivo y subirlo a Google Drive en la subcarpeta "Licencias"
  const buffer = Buffer.from(await archivo.arrayBuffer());
  const base64Data = buffer.toString("base64");
  const mimeType = archivo.type || "application/octet-stream";
  const extension = archivo.name.includes(".") ? archivo.name.split(".").pop() : "pdf";
  const nombreArchivoDrive = `Licencia_${fechaInicio}_${limpiarRut(rutIngresado)}.${extension}`;

  const driveRes = await subirArchivoParvuloDrive({
    rutParvulo: parvulo.rut,
    nombreParvulo: nombreCompleto,
    nombreNivel,
    nombreArchivo: nombreArchivoDrive,
    mimeType,
    base64Data,
    subCarpeta: "Licencias",
  });

  if (!driveRes.ok || !driveRes.fileUrl) {
    return {
      ok: false,
      error:
        driveRes.error ||
        "No fue posible subir el archivo a Google Drive. Por favor intenta nuevamente.",
    };
  }

  // 3. Registrar la licencia médica en la base de datos de Supabase
  const { data: resRpc, error: errRpc } = await supabase.rpc(
    "subir_licencia_apoderado",
    {
      p_rut: parvulo.rut,
      p_fecha_inicio: fechaInicio,
      p_fecha_termino: fechaTermino,
      p_dias_reposo: diasReposoNum,
      p_diagnostico_motivo: diagnosticoMotivo || "Reposo médico",
      p_drive_file_id: driveRes.fileId ?? null,
      p_drive_file_url: driveRes.fileUrl,
      p_nombre_archivo: archivo.name,
    },
  );

  if (errRpc) {
    return {
      ok: false,
      error: `Error al guardar en el sistema: ${errRpc.message}`,
    };
  }

  const resultado = resRpc as { ok?: boolean; error?: string };
  if (!resultado?.ok) {
    return {
      ok: false,
      error: resultado?.error || "No se pudo registrar la licencia médica.",
    };
  }

  revalidatePath("/apoderado");
  revalidatePath("/dashboard/asistencia");
  revalidatePath("/dashboard/licencias");

  return {
    ok: true,
    mensaje: `¡Licencia médica recibida con éxito! Quedó guardada en la carpeta "Licencias" de Google Drive y fue notificada a la educadora de ${nombreNivel}.`,
  };
}

/**
 * Server Action para que la Educadora o Dirección apruebe una licencia
 * y justifique automáticamente los días hábiles en el módulo de Asistencia.
 */
export async function justificarLicenciaAction(
  licenciaId: string,
  observacion?: string,
): Promise<{ ok: boolean; error?: string; diasJustificados?: number }> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("justificar_licencia_asistencia", {
    p_licencia_id: licenciaId,
    p_observacion: observacion || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const res = data as { ok?: boolean; error?: string; dias_justificados?: number };
  if (!res?.ok) {
    return { ok: false, error: res?.error || "Error al justificar la licencia." };
  }

  revalidatePath("/dashboard/asistencia");
  revalidatePath("/dashboard/licencias");
  revalidatePath("/dashboard/estadisticas");
  revalidatePath("/apoderado");

  return { ok: true, diasJustificados: res.dias_justificados };
}

/**
 * Server Action para que la Educadora rechace u observe una licencia.
 */
export async function rechazarLicenciaAction(
  licenciaId: string,
  observacion?: string,
): Promise<{ ok: boolean; error?: string }> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rechazar_licencia_medica", {
    p_licencia_id: licenciaId,
    p_observacion: observacion || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const res = data as { ok?: boolean; error?: string };
  if (!res?.ok) {
    return { ok: false, error: res?.error || "Error al rechazar la licencia." };
  }

  revalidatePath("/dashboard/asistencia");
  revalidatePath("/dashboard/licencias");
  revalidatePath("/apoderado");

  return { ok: true };
}

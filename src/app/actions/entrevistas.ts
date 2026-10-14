"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { subirArchivoParvuloDrive } from "@/lib/drive";
import { generarPdfActaEntrevistaBytes } from "@/lib/pdf-entrevista";
import { limpiarRut, validarRut } from "@/lib/rut";
import type { EstadoEntrevista, FichaApoderado, ModalidadEntrevista } from "@/lib/types";

export interface EstadoAccionEntrevista {
  ok?: boolean;
  error?: string;
  mensaje?: string;
  fileUrl?: string;
}

/**
 * Agendar una entrevista desde el panel de la Educadora
 */
export async function crearEntrevistaEducadoraAction(
  _prev: EstadoAccionEntrevista | undefined,
  formData: FormData,
): Promise<EstadoAccionEntrevista> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Debes iniciar sesión para agendar entrevistas." };
  }

  const parvuloId = String(formData.get("parvulo_id") ?? "").trim();
  const nivelId = String(formData.get("nivel_id") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "10:00").trim();
  const modalidad = (formData.get("modalidad") ?? "presencial") as ModalidadEntrevista;
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!parvuloId || !nivelId || !fecha || !motivo) {
    return { ok: false, error: "Selecciona el párvulo, la fecha y describe el motivo de la reunión." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("entrevistas").insert({
    parvulo_id: parvuloId,
    nivel_id: nivelId,
    educadora_id: sesion.perfil.id,
    fecha,
    hora,
    solicitado_por: "educadora",
    modalidad,
    motivo,
    estado: "confirmada", // Las citadas por la educadora nacen confirmadas
  });

  if (error) {
    return { ok: false, error: `Error al agendar: ${error.message}` };
  }

  revalidatePath("/dashboard/entrevistas");
  revalidatePath("/apoderado");
  return { ok: true, mensaje: "Entrevista agendada exitosamente en el calendario del nivel." };
}

/**
 * Solicitar una entrevista desde el Portal de Apoderados
 */
export async function solicitarEntrevistaApoderadoAction(
  _prev: EstadoAccionEntrevista | undefined,
  formData: FormData,
): Promise<EstadoAccionEntrevista> {
  const rut = String(formData.get("rut") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "10:00").trim();
  const modalidad = (formData.get("modalidad") ?? "presencial") as ModalidadEntrevista;
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!rut || !validarRut(rut)) {
    return { ok: false, error: "RUT del párvulo no válido." };
  }

  if (!fecha || !motivo) {
    return { ok: false, error: "Por favor indica la fecha propuesta y el motivo de la solicitud." };
  }

  const supabase = await createClient();

  // Buscar datos del párvulo mediante RPC
  const { data: fichaRaw, error: errFicha } = await supabase.rpc(
    "consultar_ficha_apoderado",
    { p_rut: rut },
  );

  const ficha = fichaRaw as FichaApoderado | null;
  if (errFicha || !ficha?.encontrado || !ficha?.parvulo) {
    return { ok: false, error: "No se encontró al párvulo indicado." };
  }

  // Llamar RPC para insertar la entrevista de forma segura como anon
  const { data: resRpc, error: errRpc } = await supabase.rpc(
    "solicitar_entrevista_apoderado",
    {
      p_rut: rut,
      p_fecha: fecha,
      p_hora: hora,
      p_modalidad: modalidad,
      p_motivo: motivo,
    },
  );

  if (errRpc) {
    return { ok: false, error: `Error al solicitar entrevista: ${errRpc.message}` };
  }

  const res = resRpc as { ok?: boolean; error?: string };
  if (!res?.ok) {
    return { ok: false, error: res?.error || "No se pudo registrar la solicitud." };
  }

  revalidatePath("/apoderado");
  revalidatePath("/dashboard/entrevistas");
  return {
    ok: true,
    mensaje: "Tu solicitud de entrevista fue enviada a la educadora del nivel. Te avisará su confirmación.",
  };
}

/**
 * Actualizar estado de una entrevista (Confirmar / Cancelar)
 */
export async function actualizarEstadoEntrevistaAction(
  entrevistaId: string,
  nuevoEstado: EstadoEntrevista,
) {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("entrevistas")
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq("id", entrevistaId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/entrevistas");
  revalidatePath("/apoderado");
  return { ok: true };
}

/**
 * Registrar el Acta Oficial de la Entrevista y generar el PDF en Google Drive
 */
export async function guardarYGenerarActaEntrevistaAction(
  entrevistaId: string,
  formData: FormData,
): Promise<EstadoAccionEntrevista> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "No autorizado." };
  }

  const asistentes = String(formData.get("asistentes") ?? "").trim();
  const puntosTratados = String(formData.get("puntos_tratados") ?? "").trim();
  const acuerdosCompromisos = String(formData.get("acuerdos_compromisos") ?? "").trim();
  const observaciones = String(formData.get("observaciones") ?? "").trim();
  const visibleApoderado = formData.get("visible_apoderado") === "on";

  if (!puntosTratados || !acuerdosCompromisos) {
    return {
      ok: false,
      error: "Debes ingresar los temas tratados y los acuerdos/compromisos de la reunión.",
    };
  }

  const supabase = await createClient();

  // 1. Obtener los antecedentes completos de la entrevista
  const { data: ent, error: errEnt } = await supabase
    .from("entrevistas")
    .select(`
      id,
      fecha,
      hora,
      modalidad,
      motivo,
      parvulo:parvulos(id, nombres, apellidos, rut, nombre_apoderado),
      nivel:niveles(id, nombre),
      educadora:perfiles(id, nombre_completo)
    `)
    .eq("id", entrevistaId)
    .single();

  if (errEnt || !ent) {
    return { ok: false, error: "No se encontró el registro de la entrevista." };
  }

  const parvuloData = ent.parvulo as any;
  const nivelData = ent.nivel as any;
  const educadoraData = ent.educadora as any;

  const nombreParvulo = `${parvuloData?.nombres ?? ""} ${parvuloData?.apellidos ?? ""}`.trim();
  const rutParvulo = parvuloData?.rut ?? "";
  const nombreNivel = nivelData?.nombre ?? "General";
  const nombreApoderado = parvuloData?.nombre_apoderado ?? "";
  const nombreEducadora = educadoraData?.nombre_completo ?? sesion.perfil.nombre_completo;

  // 2. Generar el documento PDF oficial
  const pdfBytes = await generarPdfActaEntrevistaBytes({
    nombreParvulo,
    rutParvulo,
    nombreNivel,
    nombreApoderado,
    nombreEducadora,
    fecha: ent.fecha,
    hora: ent.hora,
    modalidad: ent.modalidad,
    motivo: ent.motivo,
    asistentes: asistentes || `${nombreApoderado} y ${nombreEducadora}`,
    puntosTratados,
    acuerdosCompromisos,
    observaciones,
  });

  const base64Data = Buffer.from(pdfBytes).toString("base64");
  const nombreArchivoPdf = `Acta_Entrevista_${ent.fecha}_${limpiarRut(rutParvulo)}.pdf`;

  // 3. Subir el PDF a Google Drive en la subcarpeta "Entrevistas"
  const driveRes = await subirArchivoParvuloDrive({
    rutParvulo,
    nombreParvulo,
    nombreNivel,
    nombreArchivo: nombreArchivoPdf,
    mimeType: "application/pdf",
    base64Data,
    subCarpeta: "Entrevistas",
  });

  const driveUrl = driveRes.fileUrl || "";
  const driveId = driveRes.fileId || null;

  // 4. Guardar acta en la tabla entrevistas
  const { error: errUpdate } = await supabase
    .from("entrevistas")
    .update({
      asistentes,
      puntos_tratados: puntosTratados,
      acuerdos_compromisos: acuerdosCompromisos,
      observaciones: observaciones || null,
      drive_file_id: driveId,
      drive_file_url: driveUrl,
      nombre_archivo_pdf: nombreArchivoPdf,
      acta_firmada_o_cerrada: true,
      estado: "realizada",
      visible_apoderado: visibleApoderado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entrevistaId);

  if (errUpdate) {
    return { ok: false, error: `Error al guardar acta: ${errUpdate.message}` };
  }

  // 5. Opcional: Registrar en archivos_parvulo para historial general
  if (driveUrl) {
    await supabase.from("archivos_parvulo").insert({
      parvulo_id: parvuloData.id,
      educadora_id: sesion.perfil.id,
      categoria: "otro",
      titulo: `Acta de Entrevista (${ent.fecha})`,
      drive_file_id: driveId,
      drive_file_url: driveUrl,
      visible_apoderado: visibleApoderado,
    });
  }

  revalidatePath("/dashboard/entrevistas");
  revalidatePath("/dashboard/parvulos");
  revalidatePath("/apoderado");

  return {
    ok: true,
    fileUrl: driveUrl,
    mensaje: `¡Acta generada exitosamente y guardada en formato PDF en la carpeta "Entrevistas" de Google Drive!`,
  };
}

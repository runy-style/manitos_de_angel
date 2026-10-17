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
  const pinApoderadoRaw = String(formData.get("pin_apoderado") ?? "").trim();
  const pinApoderado = pinApoderadoRaw || null;

  if (pinApoderado && !/^[0-9]{4}$/.test(pinApoderado)) {
    return { ok: false, error: "El PIN de apoderado debe ser exactamente de 4 dígitos numéricos (ej. 1234)." };
  }

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
        pin_apoderado: pinApoderado,
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
        pin_apoderado: pinApoderado,
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

export async function eliminarParvulo(id: string): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "No tienes una sesión activa autorizada." };
  }

  const supabase = await createClient();

  // Obtener el párvulo para verificar el nivel
  const { data: parvulo } = await supabase
    .from("parvulos")
    .select("id, nombres, apellidos, nivel_id")
    .eq("id", id)
    .single<{ id: string; nombres: string; apellidos: string; nivel_id: string }>();

  if (!parvulo) {
    return { ok: false, error: "El párvulo no fue encontrado o ya fue eliminado." };
  }

  if (!puedeEditarNivel(sesion.perfil, parvulo.nivel_id)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo del nivel o administración pueden eliminar este párvulo.",
    };
  }

  const { error } = await supabase
    .from("parvulos")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Error al eliminar el párvulo: " + error.message };
  }

  revalidarRutas();
  return { ok: true };
}

export async function actualizarPinParvuloAction(
  parvuloId: string,
  nuevoPin: string | null,
): Promise<{ ok: boolean; error?: string; mensaje?: string }> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "Sesión no válida o expirada." };
  }

  const pinLimpio = nuevoPin?.trim() || null;
  if (pinLimpio && !/^[0-9]{4}$/.test(pinLimpio)) {
    return { ok: false, error: "El PIN debe tener exactamente 4 dígitos numéricos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parvulos")
    .update({ pin_apoderado: pinLimpio })
    .eq("id", parvuloId);

  if (error) {
    return { ok: false, error: `Error al actualizar PIN: ${error.message}` };
  }

  revalidarRutas();
  return {
    ok: true,
    mensaje: pinLimpio ? `PIN actualizado a ${pinLimpio}` : "PIN eliminado exitosamente.",
  };
}

export async function establecerPinApoderadoAction(
  rut: string,
  pinActual: string,
  nuevoPin: string,
): Promise<{ ok: boolean; error?: string; mensaje?: string }> {
  const nuevoPinLimpio = nuevoPin.trim();
  if (!/^[0-9]{4}$/.test(nuevoPinLimpio)) {
    return { ok: false, error: "El nuevo PIN debe ser exactamente de 4 dígitos numéricos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("establecer_pin_apoderado", {
    p_rut: normalizarRut(rut),
    p_pin_actual: pinActual.trim(),
    p_nuevo_pin: nuevoPinLimpio,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const res = data as { ok?: boolean; error?: string; mensaje?: string };
  if (!res?.ok) {
    return { ok: false, error: res?.error || "No se pudo actualizar el PIN." };
  }

  revalidatePath("/apoderado");
  return { ok: true, mensaje: res.mensaje || "PIN actualizado con éxito." };
}

function capitalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export interface DetalleParvuloParseado {
  rut: string;
  nombres: string;
  apellidos: string;
}

export function parsearLineaParvulo(
  linea: string,
): { ok: true; dato: DetalleParvuloParseado } | { ok: false; error: string } {
  const l = linea.trim();
  if (!l) return { ok: false, error: "Línea vacía" };

  const matchRut = l.match(/(\d{1,2}\.?\d{3}\.?\d{3}-?[0-9kK])/i);
  if (!matchRut) {
    return { ok: false, error: "No se encontró un RUT chileno en la línea" };
  }

  const rutEncontrado = matchRut[1];
  if (!validarRut(rutEncontrado)) {
    return {
      ok: false,
      error: `El RUT ${rutEncontrado} no es válido según el algoritmo chileno (Módulo 11)`,
    };
  }

  const rutNormalizado = normalizarRut(rutEncontrado);
  const resto = l.replace(matchRut[0], "").trim();

  let apellidos = "";
  let nombres = "";

  if (resto.includes(",")) {
    const [p1, ...p2] = resto.split(",");
    apellidos = capitalizarTexto(p1.trim());
    nombres = capitalizarTexto(p2.join(" ").trim());
  } else if (resto.includes(";")) {
    const [p1, ...p2] = resto.split(";");
    apellidos = capitalizarTexto(p1.trim());
    nombres = capitalizarTexto(p2.join(" ").trim());
  } else if (resto.includes("\t")) {
    const partes = resto.split("\t").filter(Boolean);
    if (partes.length >= 2) {
      apellidos = capitalizarTexto(partes[0].trim());
      nombres = capitalizarTexto(partes.slice(1).join(" ").trim());
    } else {
      const palabras = resto.split(/\s+/).filter(Boolean);
      apellidos = capitalizarTexto(palabras.slice(0, 2).join(" "));
      nombres = capitalizarTexto(palabras.slice(2).join(" "));
    }
  } else {
    const palabras = resto.split(/\s+/).filter(Boolean);
    if (palabras.length >= 4) {
      apellidos = capitalizarTexto(palabras.slice(0, 2).join(" "));
      nombres = capitalizarTexto(palabras.slice(2).join(" "));
    } else if (palabras.length === 3) {
      apellidos = capitalizarTexto(palabras.slice(0, 2).join(" "));
      nombres = capitalizarTexto(palabras[2]);
    } else if (palabras.length === 2) {
      apellidos = capitalizarTexto(palabras[0]);
      nombres = capitalizarTexto(palabras[1]);
    } else {
      nombres = capitalizarTexto(resto);
      apellidos = "Por Definir";
    }
  }

  if (!nombres) {
    return { ok: false, error: "No se pudieron identificar los nombres del alumno" };
  }

  return {
    ok: true,
    dato: {
      rut: rutNormalizado,
      nombres,
      apellidos: apellidos || "Por Definir",
    },
  };
}

export async function importarParvulosEnBloque(
  nivelId: string,
  lineasTexto: string,
): Promise<{
  ok: boolean;
  error?: string;
  totalProcesados?: number;
  insertados?: number;
  fallidos?: { linea: string; motivo: string }[];
}> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "No tienes una sesión activa autorizada." };
  }

  if (!nivelId) {
    return { ok: false, error: "Debes seleccionar un nivel para asignar los párvulos." };
  }

  if (!puedeEditarNivel(sesion.perfil, nivelId)) {
    return {
      ok: false,
      error: "No tienes permisos de edición sobre este nivel.",
    };
  }

  const lineas = lineasTexto.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lineas.length === 0) {
    return { ok: false, error: "No hay texto para procesar. Pega una lista de alumnos." };
  }

  const supabase = await createClient();
  let insertados = 0;
  const fallidos: { linea: string; motivo: string }[] = [];

  for (const linea of lineas) {
    const parseado = parsearLineaParvulo(linea);
    if (!parseado.ok) {
      fallidos.push({ linea, motivo: parseado.error });
      continue;
    }

    const { rut, nombres, apellidos } = parseado.dato;

    const { error } = await supabase.from("parvulos").upsert(
      {
        rut,
        nombres,
        apellidos,
        nivel_id: nivelId,
        activo: true,
      },
      { onConflict: "rut" },
    );

    if (error) {
      fallidos.push({ linea, motivo: error.message });
    } else {
      insertados++;
    }
  }

  revalidarRutas();

  return {
    ok: insertados > 0,
    totalProcesados: lineas.length,
    insertados,
    fallidos,
  };
}

function revalidarRutas() {
  revalidatePath("/dashboard/parvulos");
  revalidatePath("/dashboard/asistencia");
  revalidatePath("/dashboard/bitacora");
  revalidatePath("/dashboard/licencias");
  revalidatePath("/dashboard/entrevistas");
  revalidatePath("/dashboard/estadisticas");
  revalidatePath("/dashboard");
  revalidatePath("/apoderado");
}

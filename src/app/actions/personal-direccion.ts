"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { normalizarRut, validarRut } from "@/lib/rut";
import type {
  EstamentoPersonal,
  EstadoPermiso,
  FuncionariaConSaldo,
  ReemplazoPersonal,
  SolicitudPermiso,
  TipoContratoPersonal,
} from "@/lib/types";

function verificarAccesoDireccion(rol?: string): boolean {
  return rol === "admin" || rol === "organizacion";
}

export type RespuestaAccion = {
  ok: boolean;
  error?: string;
  mensaje?: string;
};

// =====================================================================
// 1. GESTIÓN DE FUNCIONARIAS / DOTACIÓN
// =====================================================================

export async function guardarFuncionaria(
  _prev: RespuestaAccion | undefined,
  formData: FormData,
): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración pueden gestionar personal." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const rutOriginal = String(formData.get("rut") ?? "").trim();
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const estamento = String(formData.get("estamento_rol") ?? "educadora") as EstamentoPersonal;
  const contrato = String(formData.get("tipo_contrato") ?? "planta") as TipoContratoPersonal;
  const fechaIngreso = String(formData.get("fecha_ingreso") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const diasAnuales = Number(formData.get("dias_permiso_anual") ?? 6.0);
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;
  const activo = formData.get("activo") !== "false";

  if (!rutOriginal || !validarRut(rutOriginal)) {
    return { ok: false, error: "El RUT ingresado no es válido." };
  }

  if (!nombres || !apellidos) {
    return { ok: false, error: "Debes ingresar nombres y apellidos completos." };
  }

  const rutNormalizado = normalizarRut(rutOriginal);
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase
      .from("personal")
      .update({
        rut: rutNormalizado,
        nombres,
        apellidos,
        correo,
        telefono,
        estamento_rol: estamento,
        tipo_contrato: contrato,
        fecha_ingreso: fechaIngreso,
        dias_permiso_anual: diasAnuales,
        observaciones,
        activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Ya existe otra funcionaria registrada con este mismo RUT." };
      }
      return { ok: false, error: "Error al actualizar funcionaria: " + error.message };
    }

    revalidarDireccion();
    return { ok: true, mensaje: "Funcionaria actualizada exitosamente." };
  } else {
    const { error } = await supabase.from("personal").insert({
      rut: rutNormalizado,
      nombres,
      apellidos,
      correo,
      telefono,
      estamento_rol: estamento,
      tipo_contrato: contrato,
      fecha_ingreso: fechaIngreso,
      dias_permiso_anual: diasAnuales,
      observaciones,
      activo,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Ya existe una funcionaria registrada con este mismo RUT." };
      }
      return { ok: false, error: "Error al registrar funcionaria: " + error.message };
    }

    revalidarDireccion();
    return { ok: true, mensaje: "Funcionaria ingresada exitosamente a la dotación." };
  }
}

export async function eliminarFuncionaria(id: string): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("personal").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Error al eliminar funcionaria: " + error.message };
  }

  revalidarDireccion();
  return { ok: true, mensaje: "Funcionaria eliminada de la dotación." };
}

// =====================================================================
// 2. CONTROL Y REGISTRO DE PERMISOS ADMINISTRATIVOS
// =====================================================================

export async function registrarPermisoAdministrativo(
  _prev: RespuestaAccion | undefined,
  formData: FormData,
): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración." };
  }

  const funcionariaId = String(formData.get("funcionaria_id") ?? "").trim();
  const fechaSolicitada = String(formData.get("fecha_solicitada") ?? "").trim();
  const fechaTermino = String(formData.get("fecha_termino") ?? "").trim() || null;
  const diasSolicitados = Number(formData.get("dias_solicitados") ?? 1.0);
  const estado = String(formData.get("estado") ?? "aprobado") as EstadoPermiso;
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;
  const ano = fechaSolicitada ? Number(fechaSolicitada.slice(0, 4)) : new Date().getFullYear();

  if (!funcionariaId) {
    return { ok: false, error: "Debes seleccionar a la funcionaria." };
  }

  if (!fechaSolicitada) {
    return { ok: false, error: "Debes seleccionar la fecha del permiso." };
  }

  if (diasSolicitados <= 0) {
    return { ok: false, error: "La cantidad de días solicitados debe ser mayor a 0 (ej. 0.5 o 1.0)." };
  }

  const supabase = await createClient();

  // Validación de saldo previo si se intenta aprobar
  if (estado === "aprobado") {
    const { data: saldoData } = await supabase
      .from("vista_saldos_permisos")
      .select("dias_restantes, total_dias_asignados")
      .eq("funcionaria_id", funcionariaId)
      .single();

    if (saldoData && diasSolicitados > Number(saldoData.dias_restantes)) {
      return {
        ok: false,
        error: `Saldo insuficiente: la funcionaria dispone de ${saldoData.dias_restantes} días restantes y estás intentando registrar ${diasSolicitados} días.`,
      };
    }
  }

  const { error } = await supabase.from("solicitudes_permisos").insert({
    funcionaria_id: funcionariaId,
    fecha_solicitada: fechaSolicitada,
    fecha_termino: fechaTermino,
    dias_solicitados: diasSolicitados,
    estado,
    periodo_ano: ano,
    observaciones,
    registrado_por: sesion.perfil.id,
  });

  if (error) {
    return { ok: false, error: "Error al registrar permiso administrativo: " + error.message };
  }

  revalidarDireccion();
  return { ok: true, mensaje: `Permiso administrativo de ${diasSolicitados} día(s) registrado exitosamente.` };
}

export async function cambiarEstadoPermiso(
  id: string,
  nuevoEstado: EstadoPermiso,
): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_permisos")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Error al actualizar estado del permiso: " + error.message };
  }

  revalidarDireccion();
  return { ok: true, mensaje: `Estado actualizado a "${nuevoEstado}".` };
}

export async function eliminarPermiso(id: string): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("solicitudes_permisos").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Error al eliminar permiso: " + error.message };
  }

  revalidarDireccion();
  return { ok: true, mensaje: "Permiso administrativo eliminado y días reintegrados al saldo." };
}

// =====================================================================
// 3. GESTIÓN DE REEMPLAZOS
// =====================================================================

export async function registrarReemplazo(
  _prev: RespuestaAccion | undefined,
  formData: FormData,
): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const titularId = String(formData.get("titular_id") ?? "").trim();
  const reemplazanteNombre = String(formData.get("reemplazante_nombre") ?? "").trim();
  const reemplazanteId = String(formData.get("reemplazante_id") ?? "").trim() || null;
  const motivo = String(formData.get("motivo") ?? "").trim();
  const fechaInicio = String(formData.get("fecha_inicio") ?? "").trim();
  const fechaTermino = String(formData.get("fecha_termino") ?? "").trim();
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;
  const activo = formData.get("activo") !== "false";

  if (!titularId) {
    return { ok: false, error: "Debes seleccionar a la funcionaria titular ausente." };
  }

  if (!reemplazanteNombre) {
    return { ok: false, error: "Debes ingresar el nombre de la persona reemplazante." };
  }

  if (!motivo) {
    return { ok: false, error: "Debes indicar el motivo del reemplazo (ej. Licencia médica, Permiso, etc.)." };
  }

  if (!fechaInicio || !fechaTermino) {
    return { ok: false, error: "Debes indicar fecha de inicio y término del reemplazo." };
  }

  if (fechaTermino < fechaInicio) {
    return { ok: false, error: "La fecha de término no puede ser anterior a la fecha de inicio." };
  }

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase
      .from("reemplazos")
      .update({
        titular_id: titularId,
        reemplazante_nombre: reemplazanteNombre,
        reemplazante_id: reemplazanteId,
        motivo,
        fecha_inicio: fechaInicio,
        fecha_termino: fechaTermino,
        observaciones,
        activo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { ok: false, error: "Error al actualizar reemplazo: " + error.message };
    }

    revalidarDireccion();
    return { ok: true, mensaje: "Reemplazo actualizado exitosamente." };
  } else {
    const { error } = await supabase.from("reemplazos").insert({
      titular_id: titularId,
      reemplazante_nombre: reemplazanteNombre,
      reemplazante_id: reemplazanteId,
      motivo,
      fecha_inicio: fechaInicio,
      fecha_termino: fechaTermino,
      observaciones,
      activo,
    });

    if (error) {
      return { ok: false, error: "Error al registrar reemplazo: " + error.message };
    }

    revalidarDireccion();
    return { ok: true, mensaje: "Reemplazo registrado exitosamente." };
  }
}

export async function finalizarReemplazo(id: string): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración." };
  }

  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("reemplazos")
    .update({ activo: false, fecha_termino: hoy, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Error al finalizar reemplazo: " + error.message };
  }

  revalidarDireccion();
  return { ok: true, mensaje: "Reemplazo marcado como finalizado." };
}

export async function eliminarReemplazo(id: string): Promise<RespuestaAccion> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, error: "Acceso denegado: solo Dirección o Administración." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reemplazos").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Error al eliminar reemplazo: " + error.message };
  }

  revalidarDireccion();
  return { ok: true, mensaje: "Registro de reemplazo eliminado." };
}

// =====================================================================
// 4. HISTORIAL Y AUDITORÍA POR FUNCIONARIA
// =====================================================================

export async function obtenerHistorialAuditoria(funcionariaId: string): Promise<{
  ok: boolean;
  permisos: SolicitudPermiso[];
  reemplazos: ReemplazoPersonal[];
}> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || !verificarAccesoDireccion(sesion.perfil.rol)) {
    return { ok: false, permisos: [], reemplazos: [] };
  }

  const supabase = await createClient();

  const [permisosRes, reemplazosRes] = await Promise.all([
    supabase
      .from("solicitudes_permisos")
      .select("*")
      .eq("funcionaria_id", funcionariaId)
      .order("fecha_solicitada", { ascending: false }),
    supabase
      .from("reemplazos")
      .select("*")
      .eq("titular_id", funcionariaId)
      .order("fecha_inicio", { ascending: false }),
  ]);

  return {
    ok: true,
    permisos: (permisosRes.data as SolicitudPermiso[]) ?? [],
    reemplazos: (reemplazosRes.data as ReemplazoPersonal[]) ?? [],
  };
}

function revalidarDireccion() {
  revalidatePath("/dashboard/direccion");
  revalidatePath("/dashboard");
}

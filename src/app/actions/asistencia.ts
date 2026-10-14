"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puedeEditarNivel } from "@/lib/permisos";
import type { EstadoAsistencia } from "@/lib/types";

export interface ItemAsistenciaInput {
  parvulo_id: string;
  estado: EstadoAsistencia;
  observacion_dia?: string;
}

export interface RespuestaAsistencia {
  ok: boolean;
  error?: string;
  guardados?: number;
}

export async function guardarAsistenciaNivel(
  nivelId: string,
  fecha: string,
  registros: ItemAsistenciaInput[],
): Promise<RespuestaAsistencia> {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return { ok: false, error: "No tienes una sesión activa autorizada." };
  }

  if (!nivelId) {
    return { ok: false, error: "Falta el identificador de nivel." };
  }

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: "Fecha inválida. Debe tener formato AAAA-MM-DD." };
  }

  // Comprobar que sea la educadora a cargo del nivel
  if (!puedeEditarNivel(sesion.perfil, nivelId)) {
    return {
      ok: false,
      error: "Solo la educadora a cargo de este nivel puede registrar o modificar la asistencia.",
    };
  }

  if (!registros.length) {
    return { ok: false, error: "No hay registros de párvulos para guardar." };
  }

  const supabase = await createClient();

  const datosUpsert = registros.map((r) => ({
    parvulo_id: r.parvulo_id,
    nivel_id: nivelId,
    fecha,
    estado: r.estado,
    observacion_dia: r.observacion_dia?.trim() || null,
    registrado_por: sesion.perfil.id,
  }));

  const { error } = await supabase
    .from("asistencia")
    .upsert(datosUpsert, { onConflict: "parvulo_id,fecha" });

  if (error) {
    return { ok: false, error: "Error al guardar asistencia: " + error.message };
  }

  revalidatePath("/dashboard/asistencia");
  revalidatePath("/dashboard/estadisticas");
  revalidatePath("/dashboard/parvulos");
  revalidatePath("/dashboard");

  return { ok: true, guardados: datosUpsert.length };
}

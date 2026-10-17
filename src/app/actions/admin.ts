"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { Rol } from "@/lib/types";

async function asegurarAdmin() {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok" || sesion.perfil.rol !== "admin") {
    throw new Error("No tienes permisos de Administrador para realizar esta acción.");
  }
  return sesion;
}

export async function adminCrearUsuarioAction(formData: FormData) {
  try {
    await asegurarAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const nombre = String(formData.get("nombre") ?? "").trim();
    const rol = String(formData.get("rol") ?? "educadora") as Rol;
    const nivelIds = formData
      .getAll("nivel_ids")
      .map((id) => String(id))
      .filter(Boolean);
    const nivelId = nivelIds[0] || String(formData.get("nivel_id") ?? "") || null;

    if (!email || !password || !nombre) {
      return { ok: false, error: "Ingresa el nombre, correo y contraseña inicial." };
    }

    if (password.length < 6) {
      return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_crear_usuario", {
      p_email: email,
      p_password: password,
      p_nombre: nombre,
      p_rol: rol,
      p_nivel_id: rol === "educadora" ? nivelId : null,
      p_nivel_ids: rol === "educadora" ? nivelIds : [],
    });

    let newUserId: string | undefined;

    if (error) {
      // Si la función en Supabase todavía no tiene el parámetro p_nivel_ids, intentar con la firma clásica
      const fallback = await supabase.rpc("admin_crear_usuario", {
        p_email: email,
        p_password: password,
        p_nombre: nombre,
        p_rol: rol,
        p_nivel_id: rol === "educadora" ? nivelId : null,
      });

      if (fallback.error) {
        return { ok: false, error: fallback.error.message };
      }
      newUserId = (fallback.data as { user_id?: string })?.user_id;
    } else {
      const res = data as { ok?: boolean; error?: string; user_id?: string };
      if (!res?.ok) {
        return { ok: false, error: res?.error || "No se pudo crear el usuario." };
      }
      newUserId = res.user_id;
    }

    // Sincronizar tabla educadoras_niveles
    if (newUserId && rol === "educadora" && nivelIds.length > 0) {
      try {
        const rows = nivelIds.map((nid) => ({ educadora_id: newUserId!, nivel_id: nid }));
        await supabase.from("educadoras_niveles").upsert(rows, { onConflict: "educadora_id,nivel_id" });
      } catch {
        // Fallback si la tabla aún no se ha creado
      }
    }

    revalidatePath("/dashboard/admin");
    return { ok: true, mensaje: `Cuenta creada con éxito para ${nombre}. Ya puede iniciar sesión.` };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminCambiarPasswordAction(userId: string, nuevaPassword: string) {
  try {
    await asegurarAdmin();

    if (!nuevaPassword || nuevaPassword.length < 6) {
      return { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_cambiar_password", {
      p_user_id: userId,
      p_nueva_password: nuevaPassword,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const res = data as { ok?: boolean; error?: string };
    if (!res?.ok) {
      return { ok: false, error: res?.error || "Error al actualizar la contraseña." };
    }

    revalidatePath("/dashboard/admin");
    return { ok: true, mensaje: "Contraseña actualizada exitosamente." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminActualizarUsuarioAction(
  userId: string,
  nombre: string,
  rol: Rol,
  nivelIds: string[],
) {
  try {
    await asegurarAdmin();

    if (!nombre.trim()) {
      return { ok: false, error: "El nombre no puede estar vacío." };
    }

    const supabase = await createClient();
    const nivelIdPrincipal = rol === "educadora" && nivelIds.length > 0 ? nivelIds[0] : null;

    // Intentar actualizar mediante la función de múltiples niveles
    const { error } = await supabase.rpc("admin_actualizar_usuario_niveles", {
      p_user_id: userId,
      p_nombre: nombre.trim(),
      p_rol: rol,
      p_nivel_ids: rol === "educadora" ? nivelIds : [],
    });

    if (error) {
      // Fallback a admin_actualizar_usuario clásico
      const fallback = await supabase.rpc("admin_actualizar_usuario", {
        p_user_id: userId,
        p_nombre: nombre.trim(),
        p_rol: rol,
        p_nivel_id: nivelIdPrincipal,
      });

      if (fallback.error) {
        return { ok: false, error: fallback.error.message };
      }
    }

    // Sincronizar tabla educadoras_niveles
    try {
      await supabase.from("educadoras_niveles").delete().eq("educadora_id", userId);
      if (rol === "educadora" && nivelIds.length > 0) {
        const rows = nivelIds.map((nid) => ({ educadora_id: userId, nivel_id: nid }));
        await supabase.from("educadoras_niveles").insert(rows);
      }
    } catch {
      // Fallback si la tabla aún no se ha creado
    }

    revalidatePath("/dashboard/admin");
    return { ok: true, mensaje: "Datos del usuario y niveles asignados actualizados correctamente." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminEliminarUsuarioAction(userId: string) {
  try {
    await asegurarAdmin();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_eliminar_usuario", {
      p_user_id: userId,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const res = data as { ok?: boolean; error?: string };
    if (!res?.ok) {
      return { ok: false, error: res?.error || "Error al eliminar el usuario." };
    }

    revalidatePath("/dashboard/admin");
    return { ok: true, mensaje: "Cuenta de usuario eliminada." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminCrearNivelAction(nombre: string, descripcion?: string) {
  try {
    await asegurarAdmin();

    if (!nombre.trim()) {
      return { ok: false, error: "El nombre del nivel es obligatorio." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_crear_nivel", {
      p_nombre: nombre.trim(),
      p_descripcion: descripcion?.trim() || null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const res = data as { ok?: boolean; error?: string };
    if (!res?.ok) {
      return { ok: false, error: res?.error || "Error al crear el nivel." };
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/asistencia");
    revalidatePath("/dashboard/parvulos");
    revalidatePath("/dashboard/planificaciones");
    return { ok: true, mensaje: `Nivel "${nombre}" creado exitosamente.` };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminActualizarNivelAction(
  nivelId: string,
  nombre: string,
  descripcion?: string,
) {
  try {
    await asegurarAdmin();

    if (!nombre.trim()) {
      return { ok: false, error: "El nombre del nivel no puede estar vacío." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_actualizar_nivel", {
      p_nivel_id: nivelId,
      p_nombre: nombre.trim(),
      p_descripcion: descripcion?.trim() || null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const res = data as { ok?: boolean; error?: string };
    if (!res?.ok) {
      return { ok: false, error: res?.error || "Error al actualizar el nivel." };
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/asistencia");
    revalidatePath("/dashboard/parvulos");
    revalidatePath("/dashboard/planificaciones");
    return { ok: true, mensaje: "Nivel actualizado correctamente." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminEliminarNivelAction(nivelId: string) {
  try {
    await asegurarAdmin();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_eliminar_nivel", {
      p_nivel_id: nivelId,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const res = data as { ok?: boolean; error?: string };
    if (!res?.ok) {
      return { ok: false, error: res?.error || "Error al eliminar el nivel." };
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/asistencia");
    revalidatePath("/dashboard/parvulos");
    return { ok: true, mensaje: "Nivel eliminado correctamente." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function adminLimpiarTodosLosParvulosAction() {
  try {
    await asegurarAdmin();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_limpiar_todos_los_parvulos");

    if (error) {
      return { ok: false, error: error.message };
    }

    const res = data as {
      ok?: boolean;
      error?: string;
      mensaje?: string;
      parvulos_eliminados?: number;
    };

    if (!res?.ok) {
      return { ok: false, error: res?.error || "Error al vaciar la nómina de párvulos." };
    }

    revalidatePath("/dashboard/parvulos");
    revalidatePath("/dashboard/asistencia");
    revalidatePath("/dashboard/bitacora");
    revalidatePath("/dashboard/licencias");
    revalidatePath("/dashboard/entrevistas");
    revalidatePath("/dashboard/estadisticas");
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard");
    revalidatePath("/apoderado");

    return {
      ok: true,
      mensaje:
        res.mensaje ||
        `Se eliminaron ${res.parvulos_eliminados ?? 0} párvulos y todos sus registros asociados.`,
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}


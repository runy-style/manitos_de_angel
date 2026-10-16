"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import {
  crearPublicacion,
  editarPublicacion,
  eliminarPublicacion,
  subirImagenNoticia,
  eliminarImagenNoticia,
} from "@/lib/publicaciones";
import type { Publicacion } from "@/lib/types";

export type RespuestaPublicacion = {
  ok: boolean;
  error?: string;
  mensaje?: string;
  publicacion?: Publicacion;
};

/**
 * Valida que la sesión actual pertenezca a la Dirección u Organización o Administración.
 */
async function verificarPermisoDireccionOAdmin() {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    throw new Error("No tienes una sesión activa autorizada.");
  }

  const rol = sesion.perfil.rol;
  if (rol !== "admin" && rol !== "organizacion") {
    throw new Error(
      "Acceso restringido: Solo la Dirección o Administración pueden gestionar publicaciones.",
    );
  }

  return sesion;
}

/**
 * Server Action para crear una publicación (con o sin imagen).
 */
export async function crearPublicacionAction(
  _prev: RespuestaPublicacion | undefined,
  formData: FormData,
): Promise<RespuestaPublicacion> {
  try {
    const sesion = await verificarPermisoDireccionOAdmin();
    const titulo = String(formData.get("titulo") ?? "").trim();
    const contenido = String(formData.get("contenido") ?? "").trim();
    const activo = formData.get("activo") === "true" || formData.get("activo") === "on";
    const archivoImagen = formData.get("imagen") as File | null;

    if (!titulo) {
      return { ok: false, error: "El título de la publicación es obligatorio." };
    }

    if (!contenido) {
      return { ok: false, error: "El contenido de la noticia es obligatorio." };
    }

    const supabase = await createClient();
    let imagenUrl: string | null = null;

    // Procesar archivo de imagen si se adjuntó uno
    if (archivoImagen && archivoImagen.size > 0 && archivoImagen.name !== "undefined") {
      if (!archivoImagen.type.startsWith("image/")) {
        return { ok: false, error: "El archivo adjunto debe ser una imagen válida (PNG, JPG, WebP)." };
      }

      if (archivoImagen.size > 5 * 1024 * 1024) {
        return { ok: false, error: "La imagen no puede superar los 5 MB de tamaño." };
      }

      const resSubida = await subirImagenNoticia(supabase, archivoImagen);
      if (!resSubida.ok || !resSubida.url) {
        return { ok: false, error: resSubida.error || "No se pudo subir la imagen a Supabase Storage." };
      }

      imagenUrl = resSubida.url;
    }

    const resCrear = await crearPublicacion(supabase, {
      titulo,
      contenido,
      imagen_url: imagenUrl,
      activo,
      autor_id: sesion.perfil.id,
    });

    if (!resCrear.ok || !resCrear.publicacion) {
      // Si falló el insert y se había subido imagen, purgarla
      if (imagenUrl) {
        await eliminarImagenNoticia(supabase, imagenUrl);
      }
      return { ok: false, error: resCrear.error || "Error al guardar la publicación en la base de datos." };
    }

    revalidarRutas();
    return {
      ok: true,
      mensaje: "Publicación creada exitosamente.",
      publicacion: resCrear.publicacion,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Server Action para editar una publicación (actualizar texto, reemplazar o remover imagen).
 */
export async function editarPublicacionAction(
  _prev: RespuestaPublicacion | undefined,
  formData: FormData,
): Promise<RespuestaPublicacion> {
  try {
    await verificarPermisoDireccionOAdmin();
    const id = String(formData.get("id") ?? "").trim();
    const titulo = String(formData.get("titulo") ?? "").trim();
    const contenido = String(formData.get("contenido") ?? "").trim();
    const activo = formData.get("activo") === "true" || formData.get("activo") === "on";
    const eliminarImagen = formData.get("eliminar_imagen") === "true";
    const archivoImagen = formData.get("imagen") as File | null;

    if (!id) {
      return { ok: false, error: "Identificador de publicación no proporcionado." };
    }

    if (!titulo) {
      return { ok: false, error: "El título no puede estar vacío." };
    }

    if (!contenido) {
      return { ok: false, error: "El contenido no puede estar vacío." };
    }

    const supabase = await createClient();

    // Obtener la publicación actual para gestionar la imagen previa
    const { data: pubActual, error: errorFetch } = await supabase
      .from("publicaciones")
      .select("id, imagen_url")
      .eq("id", id)
      .single<{ id: string; imagen_url: string | null }>();

    if (errorFetch || !pubActual) {
      return { ok: false, error: "No se encontró la publicación a editar." };
    }

    let nuevaImagenUrl: string | null = pubActual.imagen_url;
    let imagenPreviaAEliminar: string | null = null;

    // Caso 1: El usuario sube una nueva imagen para reemplazar la existente
    if (archivoImagen && archivoImagen.size > 0 && archivoImagen.name !== "undefined") {
      if (!archivoImagen.type.startsWith("image/")) {
        return { ok: false, error: "El archivo adjunto debe ser una imagen válida." };
      }

      if (archivoImagen.size > 5 * 1024 * 1024) {
        return { ok: false, error: "La imagen no puede exceder los 5 MB." };
      }

      const resSubida = await subirImagenNoticia(supabase, archivoImagen);
      if (!resSubida.ok || !resSubida.url) {
        return { ok: false, error: resSubida.error || "Error al subir la nueva imagen." };
      }

      nuevaImagenUrl = resSubida.url;
      // Si ya tenía una imagen previa, se marcará para purgar
      if (pubActual.imagen_url) {
        imagenPreviaAEliminar = pubActual.imagen_url;
      }
    } else if (eliminarImagen) {
      // Caso 2: El usuario optó por quitar la imagen existente y dejar la noticia en solo texto
      nuevaImagenUrl = null;
      if (pubActual.imagen_url) {
        imagenPreviaAEliminar = pubActual.imagen_url;
      }
    }

    const resEditar = await editarPublicacion(
      supabase,
      id,
      {
        titulo,
        contenido,
        imagen_url: nuevaImagenUrl,
        activo,
      },
      imagenPreviaAEliminar,
    );

    if (!resEditar.ok) {
      return { ok: false, error: resEditar.error || "Error al actualizar la publicación." };
    }

    revalidarRutas();
    return {
      ok: true,
      mensaje: "Publicación actualizada correctamente.",
      publicacion: resEditar.publicacion,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Server Action para alternar estado activo/inactivo (publicar / despublicar).
 */
export async function alternarEstadoPublicacionAction(
  id: string,
  activoNuevo: boolean,
): Promise<RespuestaPublicacion> {
  try {
    await verificarPermisoDireccionOAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("publicaciones")
      .update({ activo: activoNuevo })
      .eq("id", id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidarRutas();
    return {
      ok: true,
      mensaje: activoNuevo ? "Noticia activada en el sitio web." : "Noticia pasada a borrador/inactiva.",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Server Action para eliminar permanentemente una publicación y purgar su imagen de Storage.
 */
export async function eliminarPublicacionAction(id: string): Promise<RespuestaPublicacion> {
  try {
    await verificarPermisoDireccionOAdmin();
    const supabase = await createClient();

    const res = await eliminarPublicacion(supabase, id);
    if (!res.ok) {
      return { ok: false, error: res.error || "No se pudo eliminar la publicación." };
    }

    revalidarRutas();
    return {
      ok: true,
      mensaje: "Publicación e imagen eliminadas correctamente.",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function revalidarRutas() {
  revalidatePath("/");
  revalidatePath("/dashboard/noticias");
}

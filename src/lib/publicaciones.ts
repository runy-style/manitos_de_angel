import type { SupabaseClient } from "@supabase/supabase-js";
import type { Publicacion } from "@/lib/types";

export const BUCKET_NOTICIAS = "noticias-imagenes";

/**
 * Sanitiza un nombre de archivo para evitar caracteres inválidos o problemas de codificación.
 */
export function sanitizarNombreArchivo(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9.-]/g, "-") // reemplaza símbolos y espacios por guión
    .replace(/-+/g, "-") // evita guiones repetidos
    .replace(/^-|-$/g, ""); // quita guiones en extremos
}

/**
 * Extrae la ruta interna del archivo dentro del bucket a partir de una publicUrl de Supabase.
 */
export function extraerPathStorage(urlOPath: string, bucket = BUCKET_NOTICIAS): string | null {
  if (!urlOPath) return null;
  const urlLimpia = urlOPath.trim();

  // Si ya es una ruta relativa (sin http)
  if (!urlLimpia.startsWith("http://") && !urlLimpia.startsWith("https://")) {
    return urlLimpia;
  }

  // Si es una URL completa de Supabase Storage:
  // e.g. https://xyz.supabase.co/storage/v1/object/public/noticias-imagenes/123456-foto.jpg
  const patron = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`);
  const match = urlLimpia.match(patron);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // Intento alternativo por split
  const partes = urlLimpia.split(`/${bucket}/`);
  if (partes.length > 1) {
    return decodeURIComponent(partes[1].split("?")[0]);
  }

  return null;
}

/**
 * Sube una imagen al bucket de Supabase Storage y obtiene su URL pública.
 * Genera un nombre único con timestamp + sanitización para evitar sobrescrituras.
 */
export async function subirImagenNoticia(
  supabase: SupabaseClient,
  file: File | Blob,
  nombreOriginal?: string,
): Promise<{ ok: boolean; url?: string; path?: string; error?: string }> {
  try {
    const rawName = nombreOriginal || (file instanceof File ? file.name : "imagen.jpg");
    const extension = rawName.includes(".") ? rawName.split(".").pop()?.toLowerCase() : "jpg";
    const nombreBase = rawName.includes(".")
      ? rawName.substring(0, rawName.lastIndexOf("."))
      : rawName;
    const nombreLimpio = sanitizarNombreArchivo(nombreBase);
    const nombreUnico = `${Date.now()}-${nombreLimpio}.${extension}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NOTICIAS)
      .upload(nombreUnico, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return { ok: false, error: `Error al subir imagen al bucket: ${error.message}` };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NOTICIAS)
      .getPublicUrl(data.path);

    return {
      ok: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado al subir la imagen.",
    };
  }
}

/**
 * Elimina un archivo del bucket a partir de su URL pública o ruta interna.
 */
export async function eliminarImagenNoticia(
  supabase: SupabaseClient,
  urlOPath: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const path = extraerPathStorage(urlOPath, BUCKET_NOTICIAS);
    if (!path) {
      return { ok: true }; // Nada que eliminar
    }

    const { error } = await supabase.storage.from(BUCKET_NOTICIAS).remove([path]);
    if (error) {
      console.warn(`[Storage] No se pudo purgar la imagen ${path}:`, error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar la imagen del bucket.",
    };
  }
}

/**
 * Crea una nueva publicación en la base de datos.
 */
export async function crearPublicacion(
  supabase: SupabaseClient,
  datos: {
    titulo: string;
    contenido: string;
    imagen_url?: string | null;
    activo?: boolean;
    autor_id?: string | null;
  },
): Promise<{ ok: boolean; publicacion?: Publicacion; error?: string }> {
  const { data, error } = await supabase
    .from("publicaciones")
    .insert({
      titulo: datos.titulo.trim(),
      contenido: datos.contenido.trim(),
      imagen_url: datos.imagen_url ?? null,
      activo: datos.activo ?? true,
      autor_id: datos.autor_id ?? null,
    })
    .select(`
      id,
      titulo,
      contenido,
      imagen_url,
      autor_id,
      activo,
      created_at,
      updated_at,
      autor:perfiles(id, nombre_completo, email, rol)
    `)
    .single<Publicacion>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, publicacion: data };
}

/**
 * Edita una publicación existente.
 * Si se especifica una imagen previa a eliminar, se purga del bucket.
 */
export async function editarPublicacion(
  supabase: SupabaseClient,
  id: string,
  datos: {
    titulo?: string;
    contenido?: string;
    imagen_url?: string | null;
    activo?: boolean;
  },
  imagenPreviaAEliminar?: string | null,
): Promise<{ ok: boolean; publicacion?: Publicacion; error?: string }> {
  // Purgar imagen previa si fue reemplazada o removida
  if (imagenPreviaAEliminar) {
    await eliminarImagenNoticia(supabase, imagenPreviaAEliminar);
  }

  const payload: Record<string, unknown> = {};
  if (datos.titulo !== undefined) payload.titulo = datos.titulo.trim();
  if (datos.contenido !== undefined) payload.contenido = datos.contenido.trim();
  if (datos.imagen_url !== undefined) payload.imagen_url = datos.imagen_url;
  if (datos.activo !== undefined) payload.activo = datos.activo;

  const { data, error } = await supabase
    .from("publicaciones")
    .update(payload)
    .eq("id", id)
    .select(`
      id,
      titulo,
      contenido,
      imagen_url,
      autor_id,
      activo,
      created_at,
      updated_at,
      autor:perfiles(id, nombre_completo, email, rol)
    `)
    .single<Publicacion>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, publicacion: data };
}

/**
 * Elimina una publicación y purga automáticamente su imagen del bucket si tenía una.
 */
export async function eliminarPublicacion(
  supabase: SupabaseClient,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Obtener publicación para conocer la imagen_url asociada
  const { data: pub, error: errorSelect } = await supabase
    .from("publicaciones")
    .select("id, imagen_url")
    .eq("id", id)
    .single<{ id: string; imagen_url: string | null }>();

  if (errorSelect) {
    return { ok: false, error: errorSelect.message };
  }

  // 2. Si tenía imagen, purgarla del bucket
  if (pub?.imagen_url) {
    await eliminarImagenNoticia(supabase, pub.imagen_url);
  }

  // 3. Eliminar registro de la base de datos
  const { error: errorDelete } = await supabase
    .from("publicaciones")
    .delete()
    .eq("id", id);

  if (errorDelete) {
    return { ok: false, error: errorDelete.message };
  }

  return { ok: true };
}

/**
 * Consulta las publicaciones activas para la página principal (Home).
 */
export async function obtenerPublicacionesActivas(
  supabase: SupabaseClient,
): Promise<Publicacion[]> {
  const { data, error } = await supabase
    .from("publicaciones")
    .select(`
      id,
      titulo,
      contenido,
      imagen_url,
      autor_id,
      activo,
      created_at,
      updated_at,
      autor:perfiles(id, nombre_completo, rol)
    `)
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .returns<Publicacion[]>();

  if (error) {
    console.error("[Publicaciones] Error al cargar publicaciones activas:", error.message);
    return [];
  }

  return data ?? [];
}

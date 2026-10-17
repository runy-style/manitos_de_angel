import type { Perfil } from "./types";

/**
 * Regla central de edición del sistema:
 * solo la educadora asignada a un nivel puede crear/editar dentro de ese nivel.
 * Organización y educadoras de otros niveles quedan en modo solo lectura.
 */
export function puedeEditarNivel(
  perfil:
    | (Pick<Perfil, "rol" | "nivel_id"> & {
        niveles?: { id: string }[];
        niveles_ids?: string[];
      })
    | null
    | undefined,
  nivelId: string | null | undefined,
): boolean {
  if (!perfil) return false;
  // El Administrador tiene acceso total a crear y editar en todos los niveles
  if (perfil.rol === "admin") return true;
  // La educadora solo puede editar si es uno de sus niveles asignados
  if (!nivelId) return false;
  if (perfil.rol !== "educadora") return false;

  // 1. Coincidencia con su nivel principal
  if (perfil.nivel_id === nivelId) return true;

  // 2. Coincidencia con cualquiera de sus múltiples niveles a cargo
  if (perfil.niveles && perfil.niveles.some((n) => n.id === nivelId)) return true;
  if (perfil.niveles_ids && perfil.niveles_ids.includes(nivelId)) return true;

  return false;
}

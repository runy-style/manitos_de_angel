import type { Perfil } from "./types";

/**
 * Regla central de edición del sistema:
 * solo la educadora asignada a un nivel puede crear/editar dentro de ese nivel.
 * Organización y educadoras de otros niveles quedan en modo solo lectura.
 */
export function puedeEditarNivel(
  perfil: Pick<Perfil, "rol" | "nivel_id"> | null | undefined,
  nivelId: string | null | undefined,
): boolean {
  if (!perfil) return false;
  // El Administrador tiene acceso total a crear y editar en todos los niveles
  if (perfil.rol === "admin") return true;
  // La educadora solo puede editar si es su nivel asignado
  if (!nivelId) return false;
  return perfil.rol === "educadora" && perfil.nivel_id === nivelId;
}

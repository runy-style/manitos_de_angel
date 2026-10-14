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
  if (!perfil || !nivelId) return false;
  return perfil.rol === "educadora" && perfil.nivel_id === nivelId;
}

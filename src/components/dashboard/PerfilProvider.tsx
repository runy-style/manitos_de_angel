"use client";

import { createContext, useContext, type ReactNode } from "react";
import { puedeEditarNivel } from "@/lib/permisos";
import type { PerfilConNivel } from "@/lib/types";

const PerfilContext = createContext<PerfilConNivel | null>(null);

/** Expone el perfil autenticado a todos los Client Components del dashboard. */
export function PerfilProvider({
  perfil,
  children,
}: {
  perfil: PerfilConNivel;
  children: ReactNode;
}) {
  return <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>;
}

export function usePerfil(): PerfilConNivel {
  const perfil = useContext(PerfilContext);
  if (!perfil) throw new Error("usePerfil debe usarse dentro de <PerfilProvider>.");
  return perfil;
}

/** true solo si el usuario es la educadora asignada al nivel indicado. */
export function usePuedeEditar(nivelId: string | null | undefined): boolean {
  return puedeEditarNivel(usePerfil(), nivelId);
}

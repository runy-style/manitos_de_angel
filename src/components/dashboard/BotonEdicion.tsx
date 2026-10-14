"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePuedeEditar } from "./PerfilProvider";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Nivel al que pertenece la acción. Solo su educadora a cargo puede ejecutarla. */
  nivelId: string | null | undefined;
  children: ReactNode;
};

/**
 * Botón de edición protegido por rol.
 * Si el usuario no es la educadora del nivel, se muestra bloqueado con un candado
 * y un mensaje de "solo lectura". (La seguridad real la aplican las políticas RLS.)
 */
export default function BotonEdicion({ nivelId, children, className = "", disabled, title, ...resto }: Props) {
  const puedeEditar = usePuedeEditar(nivelId);
  const bloqueado = !puedeEditar;

  return (
    <button
      type="button"
      {...resto}
      disabled={bloqueado || disabled}
      aria-disabled={bloqueado || disabled}
      title={bloqueado ? "Solo lectura: solo la educadora a cargo de este nivel puede editar." : title}
      className={`${className} ${bloqueado ? "grayscale" : ""}`}
    >
      {bloqueado && <Lock className="size-4" />}
      {children}
    </button>
  );
}

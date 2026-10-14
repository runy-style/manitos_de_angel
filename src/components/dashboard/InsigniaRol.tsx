import type { Rol } from "@/lib/types";
import { ETIQUETA_ROL } from "@/lib/types";

const ESTILO_ROL: Record<Rol, string> = {
  educadora: "bg-menta-100 text-menta-700",
  organizacion: "bg-cielo-100 text-cielo-700",
  admin: "bg-lavanda-100 text-lavanda-500",
};

export default function InsigniaRol({ rol, className = "" }: { rol: Rol; className?: string }) {
  return <span className={`insignia ${ESTILO_ROL[rol]} ${className}`}>{ETIQUETA_ROL[rol]}</span>;
}

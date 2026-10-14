"use client";

import { useState } from "react";
import {
  Calendar,
  Edit3,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Trash2,
  User,
} from "lucide-react";
import { eliminarEntradaBitacora } from "@/app/actions/bitacoras";
import type { EntradaBitacora } from "@/lib/types";

interface Props {
  entrada: EntradaBitacora;
  puedeEditar: boolean;
  onEditar: (entrada: EntradaBitacora) => void;
  onFiltrarParvulo?: (parvuloId: string) => void;
}

const ESTILOS_AREA: Record<string, { bg: string; texto: string; borde: string }> = {
  "Autonomía y Convivencia": {
    bg: "bg-menta-100/80",
    texto: "text-menta-700",
    borde: "border-menta-200",
  },
  "Comunicación y Lenguaje": {
    bg: "bg-cielo-100/80",
    texto: "text-cielo-700",
    borde: "border-cielo-200",
  },
  "Motricidad y Corporalidad": {
    bg: "bg-sol-100/80",
    texto: "text-sol-700",
    borde: "border-sol-200",
  },
  "Alimentación y Rutina": {
    bg: "bg-coral-100/80",
    texto: "text-coral-700",
    borde: "border-coral-200",
  },
  "Pensamiento Matemático": {
    bg: "bg-lavanda-100/80",
    texto: "text-lavanda-700",
    borde: "border-lavanda-200",
  },
  "Exploración del Entorno": {
    bg: "bg-emerald-100/80",
    texto: "text-emerald-700",
    borde: "border-emerald-200",
  },
  "Observación General": {
    bg: "bg-slate-100",
    texto: "text-slate-700",
    borde: "border-slate-200",
  },
};

export default function TarjetaBitacora({
  entrada,
  puedeEditar,
  onEditar,
  onFiltrarParvulo,
}: Props) {
  const [eliminando, setEliminando] = useState(false);
  const estilo =
    ESTILOS_AREA[entrada.area_avance] ?? ESTILOS_AREA["Observación General"];

  async function handleEliminar() {
    if (
      !confirm(
        `¿Eliminar esta observación pedagógica de ${entrada.parvulo?.nombres ?? "el párvulo"}?`,
      )
    ) {
      return;
    }

    setEliminando(true);
    try {
      await eliminarEntradaBitacora(entrada.id, entrada.nivel_id);
    } finally {
      setEliminando(false);
    }
  }

  const fechaFormateada = new Date(`${entrada.fecha}T12:00:00`).toLocaleDateString(
    "es-CL",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  return (
    <article className="group relative flex flex-col rounded-3xl border border-white/80 bg-white/95 p-5 shadow-suave transition hover:shadow-flotante sm:p-6">
      {/* Cabecera de la tarjeta */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cielo-50 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`insignia border text-xs font-bold ${estilo.bg} ${estilo.texto} ${estilo.borde}`}
            >
              {entrada.area_avance}
            </span>
            {entrada.visible_apoderado ? (
              <span className="insignia bg-menta-50 text-menta-700 border border-menta-200/60 text-[0.7rem]">
                <Eye className="size-3" /> Visible para apoderado
              </span>
            ) : (
              <span className="insignia bg-coral-50 text-coral-600 border border-coral-200/60 text-[0.7rem]">
                <EyeOff className="size-3" /> Solo interno
              </span>
            )}
          </div>

          {entrada.parvulo && (
            <button
              type="button"
              onClick={() => onFiltrarParvulo?.(entrada.parvulo_id)}
              className="group/p flex items-center gap-1.5 text-left font-display text-lg font-bold text-tinta transition hover:text-cielo-600"
            >
              <Heart className="size-4 text-coral-400 group-hover/p:scale-125 transition-transform" />
              <span>
                {entrada.parvulo.nombres} {entrada.parvulo.apellidos}
              </span>
              <span className="text-xs font-normal text-tinta-suave">
                ({entrada.parvulo.rut})
              </span>
            </button>
          )}
        </div>

        {/* Acciones de edición */}
        {puedeEditar && (
          <div className="flex items-center gap-1.5 opacity-90 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEditar(entrada)}
              className="grid size-8 cursor-pointer place-items-center rounded-xl text-tinta-suave hover:bg-cielo-50 hover:text-cielo-600 transition"
              title="Editar observación"
              aria-label="Editar observación"
            >
              <Edit3 className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleEliminar}
              disabled={eliminando}
              className="grid size-8 cursor-pointer place-items-center rounded-xl text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition disabled:opacity-50"
              title="Eliminar observación"
              aria-label="Eliminar observación"
            >
              {eliminando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Cuerpo: Texto de la observación */}
      <div className="my-4 flex-1">
        <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-tinta/90 font-normal">
          {entrada.observacion}
        </p>
      </div>

      {/* Pie de tarjeta con fecha y educadora */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-cielo-50 pt-3 text-xs text-tinta-suave">
        <span className="flex items-center gap-1.5 font-medium">
          <Calendar className="size-3.5 text-cielo-500" />
          {fechaFormateada}
        </span>
        {entrada.educadora && (
          <span className="flex items-center gap-1.5 font-semibold text-tinta/80">
            <User className="size-3.5 text-menta-500" />
            {entrada.educadora.nombre_completo}
          </span>
        )}
      </footer>
    </article>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Megaphone,
  Pin,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react";
import { crearComunicadoAction, type EstadoAccionComunicado } from "@/app/actions/comunicados";
import type { CategoriaComunicado, Nivel, PerfilConNivel } from "@/lib/types";

interface Props {
  niveles: Nivel[];
  nivelSeleccionadoId?: string;
  perfil: PerfilConNivel;
  onCerrar: () => void;
  onExito?: () => void;
}

export default function ModalCrearComunicado({
  niveles,
  nivelSeleccionadoId,
  perfil,
  onCerrar,
  onExito,
}: Props) {
  const [state, formAction, isPending] = useActionState(crearComunicadoAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      const timer = setTimeout(() => {
        onExito?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state, onExito]);

  // Si la educadora tiene nivel asignado, sugerirlo por defecto
  const nivelInicial =
    nivelSeleccionadoId && nivelSeleccionadoId !== "todos"
      ? nivelSeleccionadoId
      : perfil.nivel_id ?? "todos";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-5 my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-cielo-50 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-sol-100 text-sol-600 shadow-xs">
              <Megaphone className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-tinta">
                Publicar Comunicado
              </h3>
              <p className="text-xs text-tinta-suave">
                Aviso para el cuaderno digital del nivel o todo el jardín
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="grid size-8 place-items-center rounded-full text-tinta-suave hover:bg-slate-100 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Notificaciones de estado */}
        {state?.ok && (
          <div className="flex items-center gap-2 rounded-2xl bg-menta-100 p-4 text-xs font-semibold text-menta-800">
            <CheckCircle2 className="size-4 shrink-0 text-menta-600" />
            <span>{state.mensaje ?? "Comunicado publicado con éxito."}</span>
          </div>
        )}

        {state?.error && (
          <div className="flex items-center gap-2 rounded-2xl bg-coral-100 p-4 text-xs font-semibold text-coral-800">
            <AlertCircle className="size-4 shrink-0 text-coral-600" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tinta flex items-center gap-1.5">
              <span>Título del Comunicado *</span>
            </label>
            <input
              type="text"
              name="titulo"
              required
              placeholder="Ej: Mañana taller sensorial - Traer muda de ropa"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
            />
          </div>

          {/* Destinatario (Nivel o Todo el Jardín) y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-tinta flex items-center gap-1.5">
                <Users className="size-3.5 text-cielo-500" /> Destinatarios *
              </label>
              <select
                name="nivel_id"
                defaultValue={nivelInicial}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
              >
                <option value="todos">🌟 Todo el Jardín Infantil</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-tinta flex items-center gap-1.5">
                <Tag className="size-3.5 text-sol-500" /> Tipo de Aviso *
              </label>
              <select
                name="categoria"
                defaultValue="informativo"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
              >
                <option value="informativo">📢 Informativo General</option>
                <option value="actividad">🎨 Actividad / Taller</option>
                <option value="urgente">⚠️ Urgente / Importante</option>
                <option value="materiales">🎒 Materiales / Útiles</option>
                <option value="celebracion">🎉 Celebración / Efeméride</option>
              </select>
            </div>
          </div>

          {/* Fecha del evento / plazo (opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tinta flex items-center gap-1.5">
              <Calendar className="size-3.5 text-coral-500" /> Fecha del Evento o Plazo (Opcional)
            </label>
            <input
              type="date"
              name="fecha_evento"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs font-semibold text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
            />
          </div>

          {/* Contenido / Mensaje */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tinta">
              Detalle del Comunicado *
            </label>
            <textarea
              name="contenido"
              required
              rows={4}
              placeholder="Escribe el mensaje claro y detallado para los apoderados..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition resize-none leading-relaxed"
            />
          </div>

          {/* Adjunto o Link de Drive (opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tinta flex items-center gap-1.5">
              <ExternalLink className="size-3.5 text-menta-600" /> Enlace a Documento o Circular (Opcional)
            </label>
            <input
              type="url"
              name="adjunto_url"
              placeholder="https://drive.google.com/..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs font-medium text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
            />
          </div>

          {/* Checkbox Fijado */}
          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 cursor-pointer">
            <input
              type="checkbox"
              name="fijado"
              className="size-4 rounded text-sol-600 focus:ring-sol-400"
            />
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Pin className="size-3.5 text-sol-600" />
              <span>Fijar comunicado en la parte superior del mural</span>
            </div>
          </label>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCerrar}
              disabled={isPending}
              className="boton-suave px-4 py-2 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="boton-sol px-5 py-2.5 text-xs font-bold shadow-xs inline-flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Publicando...
                </>
              ) : (
                <>
                  <Megaphone className="size-4" /> Publicar en Mural
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

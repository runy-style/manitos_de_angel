"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Video,
  X,
} from "lucide-react";
import { solicitarEntrevistaApoderadoAction, type EstadoAccionEntrevista } from "@/app/actions/entrevistas";

interface Props {
  rutParvulo: string;
  nombreParvulo: string;
  nombreNivel: string;
  onExito?: () => void;
  onCerrar: () => void;
}

export default function ModalSolicitarEntrevista({
  rutParvulo,
  nombreParvulo,
  nombreNivel,
  onExito,
  onCerrar,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    solicitarEntrevistaApoderadoAction,
    undefined,
  );

  const hoyStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  useEffect(() => {
    if (state?.ok && onExito) {
      const timer = setTimeout(() => {
        onExito();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state?.ok, onExito]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCerrar}
          disabled={isPending}
          className="absolute right-5 top-5 grid size-9 cursor-pointer place-items-center rounded-2xl bg-cielo-50 text-tinta-suave transition hover:bg-cielo-100 disabled:opacity-50"
        >
          <X className="size-5" />
        </button>

        <header className="mb-6 flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cielo-100 text-cielo-600 shadow-xs">
            <CalendarPlus className="size-6" />
          </span>
          <div className="min-w-0 pr-8">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-cielo-600">
              Portal de Familias
            </span>
            <h2 className="font-display text-xl font-bold text-tinta">
              Solicitar Entrevista con la Educadora
            </h2>
            <p className="truncate text-xs font-medium text-tinta-suave">
              {nombreParvulo} · {nombreNivel}
            </p>
          </div>
        </header>

        {state?.ok ? (
          <div className="py-6 text-center space-y-4 animate-aparecer">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-menta-100 text-menta-600">
              <CheckCircle2 className="size-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta">
                ¡Solicitud de Entrevista Enviada!
              </h3>
              <p className="text-sm text-tinta-suave leading-relaxed">
                {state.mensaje}
              </p>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              className="boton-primario mt-4 px-6 py-2.5 text-sm"
            >
              Entendido, volver a la ficha
            </button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="rut" value={rutParvulo} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  Fecha Propuesta
                </label>
                <input
                  name="fecha"
                  type="date"
                  required
                  min={hoyStr}
                  defaultValue={hoyStr}
                  className="campo text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  Hora Preferente
                </label>
                <input
                  name="hora"
                  type="time"
                  required
                  defaultValue="10:00"
                  className="campo text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-tinta mb-1">
                Modalidad Preferida
              </label>
              <select name="modalidad" defaultValue="presencial" className="campo text-sm">
                <option value="presencial">Presencial en el Jardín</option>
                <option value="online">Videollamada Online</option>
                <option value="telefonica">Llamada Telefónica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-tinta mb-1">
                Motivo o Temas que te gustaría conversar
              </label>
              <textarea
                name="motivo"
                required
                rows={3}
                placeholder="Ej. Me gustaría consultar sobre la adaptación en la siesta y cómo reforzar el lenguaje en casa."
                className="campo text-sm leading-relaxed"
              />
            </div>

            {state?.error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-2xl bg-coral-50 p-3 text-xs font-semibold text-coral-600 animate-sacudir"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {state.error}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="boton-primario w-full py-3 text-sm font-bold shadow-suave disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando solicitud a la educadora…
                  </>
                ) : (
                  <>
                    <CalendarPlus className="size-4" />
                    Enviar Solicitud de Reunión
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

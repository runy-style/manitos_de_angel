"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FilePlus,
  FileText,
  HeartPulse,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import {
  subirLicenciaMedicaApoderado,
  type EstadoSubidaLicencia,
} from "@/app/actions/licencias";

interface Props {
  rutParvulo: string;
  nombreParvulo: string;
  nombreNivel: string;
  onExito?: () => void;
  onCerrar: () => void;
}

const DIAS_RAPIDOS = [1, 2, 3, 5, 7, 10, 14];

export default function ModalSubirLicencia({
  rutParvulo,
  nombreParvulo,
  nombreNivel,
  onExito,
  onCerrar,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    subirLicenciaMedicaApoderado,
    undefined,
  );

  const hoyStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [diasReposo, setDiasReposo] = useState(3);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

  // Calcular fecha de término estimada
  const fechaTerminoTexto = useMemo(() => {
    if (!fechaInicio) return "";
    const [y, m, d] = fechaInicio.split("-").map(Number);
    if (!y || !m || !d) return "";
    const fin = new Date(y, m - 1, d + diasReposo - 1);
    return fin.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [fechaInicio, diasReposo]);

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
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onCerrar}
          disabled={isPending}
          className="absolute right-5 top-5 grid size-9 cursor-pointer place-items-center rounded-2xl bg-cielo-50 text-tinta-suave transition hover:bg-cielo-100 hover:text-tinta disabled:opacity-50"
          aria-label="Cerrar ventana"
        >
          <X className="size-5" />
        </button>

        {/* Encabezado */}
        <header className="mb-6 flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-coral-100 text-coral-600 shadow-xs">
            <HeartPulse className="size-6" />
          </span>
          <div className="min-w-0 pr-8">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-coral-600">
              Portal de Apoderados
            </span>
            <h2 className="font-display text-xl font-bold text-tinta">
              Subir Licencia Médica
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
                ¡Licencia médica recibida!
              </h3>
              <p className="text-sm text-tinta-suave leading-relaxed">
                {state.mensaje}
              </p>
            </div>
            <p className="text-xs text-tinta-suave/80">
              La educadora podrá revisarla en su panel y justificar los días de asistencia automáticamente.
            </p>
            <button
              type="button"
              onClick={onCerrar}
              className="boton-primario mt-4 px-6 py-2.5 text-sm"
            >
              Cerrar y volver a la ficha
            </button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="rut" value={rutParvulo} />

            {/* Fecha inicio */}
            <div>
              <label
                htmlFor="fecha_inicio"
                className="mb-1 block text-xs font-bold text-tinta"
              >
                Fecha de inicio del reposo
              </label>
              <input
                id="fecha_inicio"
                name="fecha_inicio"
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="campo text-sm"
              />
            </div>

            {/* Días de reposo con botones rápidos */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-tinta">
                <span>Días de reposo indicados: <b className="text-coral-600">{diasReposo} {diasReposo === 1 ? "día" : "días"}</b></span>
                {fechaTerminoTexto && (
                  <span className="text-[0.7rem] font-semibold text-tinta-suave">
                    Hasta: {fechaTerminoTexto}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_RAPIDOS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiasReposo(d)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                      diasReposo === d
                        ? "bg-coral-500 text-white shadow-xs"
                        : "bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
                    }`}
                  >
                    {d} {d === 1 ? "día" : "días"}
                  </button>
                ))}
              </div>
              <input type="hidden" name="dias_reposo" value={diasReposo} />
            </div>

            {/* Diagnóstico o motivo breve */}
            <div>
              <label
                htmlFor="diagnostico_motivo"
                className="mb-1 block text-xs font-bold text-tinta"
              >
                Motivo médico o diagnóstico <span className="font-normal text-tinta-suave">(opcional)</span>
              </label>
              <input
                id="diagnostico_motivo"
                name="diagnostico_motivo"
                type="text"
                maxLength={120}
                placeholder="Ej. Cuadro febril viral, reposo en domicilio"
                className="campo text-sm"
              />
            </div>

            {/* Selector de archivo */}
            <div>
              <label className="mb-1 block text-xs font-bold text-tinta">
                Documento de la licencia (PDF o Foto)
              </label>
              <div className="relative">
                <input
                  id="archivo"
                  name="archivo"
                  type="file"
                  required
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setArchivoSeleccionado(f);
                  }}
                  className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-cielo-200 bg-cielo-50/40 p-3.5 transition peer-hover:border-cielo-400 peer-hover:bg-cielo-50/70">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-cielo-600 shadow-xs">
                    {archivoSeleccionado?.type?.includes("pdf") ? (
                      <FileText className="size-5 text-coral-500" />
                    ) : archivoSeleccionado ? (
                      <ImageIcon className="size-5 text-menta-500" />
                    ) : (
                      <UploadCloud className="size-5 text-cielo-500" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-tinta">
                      {archivoSeleccionado ? archivoSeleccionado.name : "Seleccionar o tomar fotografía"}
                    </p>
                    <p className="text-[0.7rem] text-tinta-suave">
                      PDF, JPG o PNG · Guardado directo en la carpeta del párvulo en Drive
                    </p>
                  </div>
                </div>
              </div>
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

            {/* Botón de envío */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending || !archivoSeleccionado}
                className="boton-coral w-full py-3 text-sm font-bold shadow-suave disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Subiendo a Google Drive y notificando…
                  </>
                ) : (
                  <>
                    <FileCheck2 className="size-4" />
                    Enviar Licencia a la Educadora
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

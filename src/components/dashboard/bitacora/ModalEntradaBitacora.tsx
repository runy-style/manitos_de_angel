"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  NotebookPen,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import {
  crearEntradaBitacora,
  actualizarEntradaBitacora,
  type EstadoAccionBitacora,
} from "@/app/actions/bitacoras";
import {
  AREAS_AVANCE,
  type EntradaBitacora,
  type Parvulo,
} from "@/lib/types";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  nivelId: string;
  parvulos: Parvulo[];
  parvuloPreseleccionado?: Parvulo | null;
  entradaEditar?: EntradaBitacora | null;
}

export default function ModalEntradaBitacora({
  abierto,
  onCerrar,
  nivelId,
  parvulos,
  parvuloPreseleccionado,
  entradaEditar,
}: Props) {
  const esEdicion = !!entradaEditar;
  const hoy = new Date().toISOString().split("T")[0];

  const [parvuloId, setParvuloId] = useState(
    entradaEditar?.parvulo_id ?? parvuloPreseleccionado?.id ?? parvulos[0]?.id ?? "",
  );
  const [fecha, setFecha] = useState(entradaEditar?.fecha ?? hoy);
  const [area, setArea] = useState<string>(
    entradaEditar?.area_avance ?? AREAS_AVANCE[0],
  );
  const [observacion, setObservacion] = useState(entradaEditar?.observacion ?? "");
  const [visibleApoderado, setVisibleApoderado] = useState(
    entradaEditar?.visible_apoderado ?? true,
  );

  const accionBase = esEdicion ? actualizarEntradaBitacora : crearEntradaBitacora;
  const [estado, accion, pendiente] = useActionState<EstadoAccionBitacora, FormData>(
    accionBase,
    undefined,
  );

  useEffect(() => {
    if (entradaEditar) {
      setParvuloId(entradaEditar.parvulo_id);
      setFecha(entradaEditar.fecha);
      setArea(entradaEditar.area_avance);
      setObservacion(entradaEditar.observacion);
      setVisibleApoderado(entradaEditar.visible_apoderado);
    } else {
      setParvuloId(parvuloPreseleccionado?.id ?? parvulos[0]?.id ?? "");
      setFecha(hoy);
      setArea(AREAS_AVANCE[0]);
      setObservacion("");
      setVisibleApoderado(true);
    }
  }, [entradaEditar, parvuloPreseleccionado, parvulos, hoy, abierto]);

  useEffect(() => {
    if (estado?.ok) {
      onCerrar();
    }
  }, [estado, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-bitacora"
    >
      <div
        className="fixed inset-0 bg-tinta/40 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />

      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-crema shadow-2xl animate-modal">
        {/* Cabecera */}
        <div className="relative overflow-hidden bg-linear-to-r from-cielo-200 via-menta-100 to-sol-100 px-6 py-6 sm:px-8">
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full bg-white/70 text-tinta transition hover:bg-white"
            aria-label="Cerrar modal"
          >
            <X className="size-5" />
          </button>
          <p className="insignia mb-2 bg-white/80 text-cielo-700">
            <NotebookPen className="size-3.5" /> Bitácora Pedagógica
          </p>
          <h2 id="titulo-modal-bitacora" className="text-2xl font-bold text-tinta">
            {esEdicion ? "Editar Observación" : "Nueva Observación de Avance"}
          </h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Registra los logros, desarrollo y situaciones pedagógicas del párvulo.
          </p>
        </div>

        {/* Formulario */}
        <form action={accion} className="space-y-5 p-6 sm:p-8">
          {esEdicion && <input type="hidden" name="id" value={entradaEditar.id} />}
          <input type="hidden" name="nivel_id" value={nivelId} />

          {/* Selector de Párvulo (bloqueado en edición) */}
          <div>
            <label htmlFor="bitacora-parvulo" className="etiqueta">
              Párvulo *
            </label>
            {esEdicion ? (
              <div className="campo flex items-center gap-2 bg-cielo-50/60 font-bold">
                <Heart className="size-4 text-coral-400" />
                {entradaEditar.parvulo?.nombres} {entradaEditar.parvulo?.apellidos} (
                {entradaEditar.parvulo?.rut})
                <input type="hidden" name="parvulo_id" value={parvuloId} />
              </div>
            ) : (
              <select
                id="bitacora-parvulo"
                name="parvulo_id"
                value={parvuloId}
                onChange={(e) => setParvuloId(e.target.value)}
                required
                className="campo font-bold"
              >
                {parvulos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombres} {p.apellidos} ({p.rut})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Fecha */}
            <div>
              <label htmlFor="bitacora-fecha" className="etiqueta">
                Fecha del registro *
              </label>
              <input
                id="bitacora-fecha"
                name="fecha"
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="campo"
              />
            </div>

            {/* Área de Avance */}
            <div>
              <label htmlFor="bitacora-area" className="etiqueta">
                Área de avance *
              </label>
              <select
                id="bitacora-area"
                name="area_avance"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
                className="campo font-semibold"
              >
                {AREAS_AVANCE.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observación */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="bitacora-obs" className="etiqueta mb-0">
                Detalle de la observación pedagógica *
              </label>
              <span className="text-xs text-tinta-suave">
                {observacion.length} caracteres
              </span>
            </div>
            <textarea
              id="bitacora-obs"
              name="observacion"
              rows={4}
              required
              placeholder="Ejemplo: Hoy demostró gran autonomía al guardar sus materiales y compartió espontáneamente con sus compañeros durante la actividad de modelado..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="campo resize-none leading-relaxed"
            />
          </div>

          {/* Toggle de visibilidad para el apoderado */}
          <div className="flex items-center justify-between rounded-2xl border border-cielo-100 bg-white p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl transition ${
                  visibleApoderado
                    ? "bg-menta-100 text-menta-600"
                    : "bg-coral-100 text-coral-600"
                }`}
              >
                {visibleApoderado ? (
                  <Eye className="size-5" />
                ) : (
                  <EyeOff className="size-5" />
                )}
              </span>
              <div>
                <p className="font-bold text-tinta">Visible para el Apoderado</p>
                <p className="text-xs text-tinta-suave">
                  {visibleApoderado
                    ? "La familia podrá leer esta observación en su portal ingresando el RUT."
                    : "Solo visible de manera interna para la educadora y la dirección."}
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                name="visible_apoderado"
                checked={visibleApoderado}
                onChange={(e) => setVisibleApoderado(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-7 w-13 rounded-full bg-slate-200 peer-checked:bg-menta-500 after:absolute after:left-[3px] after:top-[3px] after:h-5.5 after:w-5.5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-6 peer-focus:outline-hidden" />
            </label>
          </div>

          {estado?.error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-coral-50 p-4 text-sm font-semibold text-coral-600"
            >
              <AlertCircle className="size-5 shrink-0" />
              {estado.error}
            </p>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={pendiente}
              className="boton-suave px-5 py-2.5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className="boton-primario px-6 py-2.5 text-sm font-bold"
            >
              {pendiente ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Guardando…
                </>
              ) : (
                <>
                  {esEdicion ? <Save className="size-4" /> : <Sparkles className="size-4" />}
                  {esEdicion ? "Guardar Cambios" : "Publicar Observación"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

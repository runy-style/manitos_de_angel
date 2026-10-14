"use client";

import { useActionState, useEffect, useState } from "react";
import {
  BookHeart,
  Calendar,
  FileCheck2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  crearDocumentoNivel,
  type EstadoAccionPlanificacion,
} from "@/app/actions/planificaciones";
import { MESES_DEL_ANIO, type Nivel, type TipoDocumentoNivel } from "@/lib/types";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  nivelId: string;
  nombreNivel: string;
  tipoInicial?: TipoDocumentoNivel;
}

export default function ModalSubirDocumento({
  abierto,
  onCerrar,
  nivelId,
  nombreNivel,
  tipoInicial = "planificacion_mensual",
}: Props) {
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoNivel>(tipoInicial);
  const [mes, setMes] = useState<number>(mesActual);
  const [anio, setAnio] = useState<number>(anioActual);
  const [titulo, setTitulo] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");

  const [estado, accion, pendiente] = useActionState<
    EstadoAccionPlanificacion,
    FormData
  >(crearDocumentoNivel, undefined);

  useEffect(() => {
    if (abierto) {
      setTipoDocumento(tipoInicial);
      setMes(mesActual);
      setAnio(anioActual);
      setTitulo("");
      setDescripcion("");
    }
  }, [abierto, tipoInicial, mesActual, anioActual]);

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
      aria-labelledby="titulo-modal-documento"
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
          <div className="flex items-center gap-2">
            <span className="insignia bg-white/80 text-cielo-700">
              <BookHeart className="size-3.5" /> Planificaciones y Evaluaciones
            </span>
            <span className="insignia bg-white/50 text-tinta-suave">{nombreNivel}</span>
          </div>
          <h2 id="titulo-modal-documento" className="mt-1 text-2xl font-bold text-tinta">
            Subir Documento Pedagógico
          </h2>
          <p className="mt-1 text-sm text-tinta-suave">
            El archivo se guardará en Google Drive y quedará accesible para todo el equipo.
          </p>
        </div>

        {/* Formulario */}
        <form action={accion} className="space-y-5 p-6 sm:p-8">
          <input type="hidden" name="nivel_id" value={nivelId} />

          {estado?.error && (
            <div className="rounded-2xl bg-coral-50 p-4 text-xs font-semibold text-coral-700 ring-1 ring-coral-200">
              {estado.error}
            </div>
          )}

          {/* Tipo de Documento */}
          <div>
            <label className="etiqueta">Tipo de Documento *</label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label
                className={`flex cursor-pointer items-center gap-2.5 rounded-2xl p-3.5 text-xs font-bold transition ring-1 ${
                  tipoDocumento === "planificacion_mensual"
                    ? "bg-cielo-50 ring-cielo-400 text-cielo-700 shadow-suave"
                    : "bg-white ring-cielo-100 text-tinta-suave hover:bg-cielo-50/40"
                }`}
              >
                <input
                  type="radio"
                  name="tipo_documento"
                  value="planificacion_mensual"
                  checked={tipoDocumento === "planificacion_mensual"}
                  onChange={() => setTipoDocumento("planificacion_mensual")}
                  className="sr-only"
                />
                <FileText className="size-4 shrink-0 text-cielo-500" />
                <span>Planificación Mensual</span>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2.5 rounded-2xl p-3.5 text-xs font-bold transition ring-1 ${
                  tipoDocumento === "pauta_evaluacion"
                    ? "bg-menta-50 ring-menta-400 text-menta-700 shadow-suave"
                    : "bg-white ring-cielo-100 text-tinta-suave hover:bg-menta-50/40"
                }`}
              >
                <input
                  type="radio"
                  name="tipo_documento"
                  value="pauta_evaluacion"
                  checked={tipoDocumento === "pauta_evaluacion"}
                  onChange={() => setTipoDocumento("pauta_evaluacion")}
                  className="sr-only"
                />
                <FileCheck2 className="size-4 shrink-0 text-menta-500" />
                <span>Pauta de Evaluación</span>
              </label>
            </div>
          </div>

          {/* Período (Mes y Año) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="selector-mes" className="etiqueta">
                Mes *
              </label>
              <select
                id="selector-mes"
                name="mes"
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="campo font-bold"
              >
                {MESES_DEL_ANIO.map((m) => (
                  <option key={m.numero} value={m.numero}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="selector-anio" className="etiqueta">
                Año *
              </label>
              <input
                id="selector-anio"
                name="anio"
                type="number"
                min="2020"
                max="2050"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                required
                className="campo font-bold"
              />
            </div>
          </div>

          {/* Título */}
          <div>
            <label htmlFor="titulo-documento" className="etiqueta">
              Título del Documento *
            </label>
            <input
              id="titulo-documento"
              name="titulo"
              type="text"
              placeholder={
                tipoDocumento === "planificacion_mensual"
                  ? "Ej: Planificación Marzo - Unidad El Cuerpo y la Naturaleza"
                  : "Ej: Pauta de Evaluación Diagnóstica Primer Semestre"
              }
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="campo"
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="desc-documento" className="etiqueta">
              Descripción o Notas adicionales (opcional)
            </label>
            <textarea
              id="desc-documento"
              name="descripcion"
              rows={2}
              placeholder="Objetivos de aprendizaje priorizados, orientaciones o recursos..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="campo resize-none"
            />
          </div>

          {/* Selector de Archivo Físico */}
          <div>
            <label htmlFor="archivo-doc" className="etiqueta">
              Archivo Digital (Word, PDF, Excel) *
            </label>
            <input
              id="archivo-doc"
              name="archivo"
              type="file"
              accept=".pdf, .doc, .docx, .xlsx, .xls, .ppt, .pptx, image/*"
              className="campo text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-cielo-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-cielo-700 hover:file:bg-cielo-200"
            />
            <p className="mt-1 text-[0.7rem] text-tinta-suave">
              Formatos recomendados: PDF o Word (.docx). Máximo 15 MB.
            </p>
          </div>

          {/* Enlace alternativo */}
          <div>
            <label htmlFor="enlace-alt" className="etiqueta">
              O Enlace directo de Google Drive (opcional)
            </label>
            <input
              id="enlace-alt"
              name="enlace_directo"
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              className="campo text-xs"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={pendiente}
              className="boton-suave text-sm py-2.5 px-4"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={pendiente}
              className="boton-menta text-sm py-2.5 px-6 shadow-flotante"
            >
              {pendiente ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Guardando en Drive…
                </>
              ) : (
                <>
                  <Upload className="size-4" /> Subir y Publicar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

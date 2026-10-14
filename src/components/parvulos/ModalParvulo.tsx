"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Folder, Loader2, Sparkles, User, X } from "lucide-react";
import { guardarParvulo, type RespuestaAccion } from "@/app/actions/parvulos";
import { formatearRut, limpiarRut, validarRut } from "@/lib/rut";
import type { Nivel, Parvulo } from "@/lib/types";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  niveles: Nivel[];
  nivelSeleccionadoId: string;
  parvuloEditar?: Parvulo | null;
}

export default function ModalParvulo({
  abierto,
  onCerrar,
  niveles,
  nivelSeleccionadoId,
  parvuloEditar,
}: Props) {
  const [rut, setRut] = useState(parvuloEditar?.rut ? formatearRut(parvuloEditar.rut) : "");
  const [tocado, setTocado] = useState(false);
  const inputRutRef = useRef<HTMLInputElement>(null);

  const [estado, accion, pendiente] = useActionState<RespuestaAccion | undefined, FormData>(
    guardarParvulo,
    undefined,
  );

  // Sincronizar estado cuando cambia el párvulo a editar
  useEffect(() => {
    setRut(parvuloEditar?.rut ? formatearRut(parvuloEditar.rut) : "");
    setTocado(false);
  }, [parvuloEditar]);

  // Si se guardó con éxito, cerrar modal
  useEffect(() => {
    if (estado?.ok) {
      onCerrar();
    }
  }, [estado, onCerrar]);

  // Manejo de tecla Escape y bloqueo de scroll
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRutRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const rutValido = validarRut(rut);
  const rutLimpio = limpiarRut(rut);
  const mostrarErrorRut = (tocado || rutLimpio.length >= 8) && rut.length > 0 && !rutValido;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-parvulo-titulo"
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onCerrar}
        className="absolute inset-0 cursor-default bg-tinta/40 backdrop-blur-sm"
      />

      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-crema shadow-2xl animate-modal sm:rounded-[2rem]">
        {/* Cabecera */}
        <div className="relative overflow-hidden bg-linear-to-br from-cielo-200 via-cielo-100 to-menta-100 px-6 pb-6 pt-7">
          <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-white/40" />
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full bg-white/70 text-tinta transition hover:bg-white"
            aria-label="Cerrar modal"
          >
            <X className="size-5" />
          </button>
          <span className="insignia mb-2 bg-white/70 text-cielo-700">
            <User className="size-3.5" /> {parvuloEditar ? "Edición de Alumno" : "Nuevo Ingreso"}
          </span>
          <h2 id="modal-parvulo-titulo" className="text-2xl font-semibold text-tinta">
            {parvuloEditar ? `Editar ficha de ${parvuloEditar.nombres}` : "Inscribir nuevo párvulo"}
          </h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Ingresa los datos personales y de contacto del apoderado.
          </p>
        </div>

        {/* Formulario */}
        <form action={accion} className="space-y-4 p-6" noValidate>
          {parvuloEditar && <input type="hidden" name="id" value={parvuloEditar.id} />}

          {/* Selección de Nivel */}
          <div>
            <label htmlFor="modal-nivel" className="etiqueta">
              Nivel asignado
            </label>
            <select
              id="modal-nivel"
              name="nivel_id"
              defaultValue={parvuloEditar?.nivel_id || nivelSeleccionadoId}
              required
              className="campo font-semibold text-tinta"
            >
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* RUT */}
          <div>
            <label htmlFor="modal-rut" className="etiqueta">
              RUT del párvulo
            </label>
            <div className="relative">
              <input
                ref={inputRutRef}
                id="modal-rut"
                name="rut"
                type="text"
                required
                placeholder="24.123.456-7"
                value={rut}
                onChange={(e) => {
                  setRut(formatearRut(e.target.value));
                }}
                onBlur={() => setTocado(true)}
                aria-invalid={mostrarErrorRut}
                className={`campo pr-12 font-bold tracking-wider ${mostrarErrorRut ? "campo-error" : ""}`}
              />
              {rutValido && (
                <CheckCircle2 className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-menta-500" />
              )}
            </div>
            {mostrarErrorRut && (
              <p className="mt-1 text-xs font-semibold text-coral-500">
                RUT inválido. Verifica los números y el dígito verificador.
              </p>
            )}
          </div>

          {/* Nombres y Apellidos */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="modal-nombres" className="etiqueta">
                Nombres
              </label>
              <input
                id="modal-nombres"
                name="nombres"
                type="text"
                required
                defaultValue={parvuloEditar?.nombres || ""}
                placeholder="Ej. Lucas Matías"
                className="campo"
              />
            </div>
            <div>
              <label htmlFor="modal-apellidos" className="etiqueta">
                Apellidos
              </label>
              <input
                id="modal-apellidos"
                name="apellidos"
                type="text"
                required
                defaultValue={parvuloEditar?.apellidos || ""}
                placeholder="Ej. Silva Soto"
                className="campo"
              />
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label htmlFor="modal-nacimiento" className="etiqueta">
              Fecha de nacimiento <span className="font-normal text-tinta-suave">(opcional)</span>
            </label>
            <input
              id="modal-nacimiento"
              name="fecha_nacimiento"
              type="date"
              defaultValue={parvuloEditar?.fecha_nacimiento || ""}
              className="campo"
            />
          </div>

          {/* Datos del Apoderado */}
          <div className="rounded-2xl border border-cielo-100 bg-cielo-50/50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cielo-700">
              Información del Apoderado / Contacto
            </p>
            <div>
              <label htmlFor="modal-apoderado" className="etiqueta">
                Nombre completo del apoderado/a
              </label>
              <input
                id="modal-apoderado"
                name="nombre_apoderado"
                type="text"
                defaultValue={parvuloEditar?.nombre_apoderado || ""}
                placeholder="Ej. Carmen Soto Gómez"
                className="campo bg-white"
              />
            </div>
            <div>
              <label htmlFor="modal-telefono" className="etiqueta">
                Teléfono de contacto
              </label>
              <input
                id="modal-telefono"
                name="telefono_apoderado"
                type="tel"
                defaultValue={parvuloEditar?.telefono_apoderado || ""}
                placeholder="+56 9 1234 5678"
                className="campo bg-white"
              />
            </div>
          </div>

          {/* Enlace carpeta Google Drive */}
          <div>
            <label htmlFor="modal-drive" className="etiqueta">
              Enlace de carpeta Google Drive <span className="font-normal text-tinta-suave">(opcional)</span>
            </label>
            <div className="relative">
              <Folder className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-sol-500" />
              <input
                id="modal-drive"
                name="drive_folder_url"
                type="url"
                defaultValue={parvuloEditar?.drive_folder_url || ""}
                placeholder="https://drive.google.com/drive/folders/..."
                className="campo pl-12 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-tinta-suave">
              En la Etapa 4, el sistema creará esta carpeta automáticamente en Google Drive.
            </p>
          </div>

          {/* Alerta de Error */}
          {estado?.error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-coral-50 p-3 text-sm font-semibold text-coral-600 animate-sacudir"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {estado.error}
            </p>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={pendiente}
              className="boton-suave px-4 py-2.5 text-sm"
            >
              Cancelar
            </button>
            <button
              id="guardar-parvulo-btn"
              type="submit"
              disabled={pendiente || !rutValido}
              className="boton-primario px-6 py-2.5 text-sm"
            >
              {pendiente ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Guardando…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> {parvuloEditar ? "Actualizar" : "Guardar Párvulo"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

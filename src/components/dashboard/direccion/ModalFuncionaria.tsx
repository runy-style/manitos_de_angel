"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, UserCheck, X } from "lucide-react";
import { guardarFuncionaria, type RespuestaAccion } from "@/app/actions/personal-direccion";
import { formatearRut } from "@/lib/rut";
import {
  ETIQUETAS_CONTRATO,
  ETIQUETAS_ESTAMENTO,
  type EstamentoPersonal,
  type Funcionaria,
  type TipoContratoPersonal,
} from "@/lib/types";

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  funcionariaEditar: Funcionaria | null;
}

export default function ModalFuncionaria({ abierto, alCerrar, funcionariaEditar }: Props) {
  const [estado, accion, pendiente] = useActionState<RespuestaAccion | undefined, FormData>(
    guardarFuncionaria,
    undefined,
  );

  const [rut, setRut] = useState("");

  useEffect(() => {
    if (funcionariaEditar) {
      setRut(formatearRut(funcionariaEditar.rut));
    } else {
      setRut("");
    }
  }, [funcionariaEditar, abierto]);

  useEffect(() => {
    if (estado?.ok) {
      alCerrar();
    }
  }, [estado, alCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-xs animate-aparecer">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-cielo-100 overflow-hidden">
        {/* Encabezado */}
        <header className="flex items-center justify-between border-b border-cielo-100 bg-cielo-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-cielo-500 text-white shadow-sm">
              <UserCheck className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-tinta">
                {funcionariaEditar ? "Editar Funcionaria" : "Registrar en Dotación"}
              </h2>
              <p className="text-xs text-tinta-suave">
                Gestión de personal de Dirección y Recursos Humanos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-tinta-suave hover:bg-white hover:text-tinta transition"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Formulario */}
        <form action={accion} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {funcionariaEditar && <input type="hidden" name="id" value={funcionariaEditar.id} />}

          {estado?.error && (
            <div className="p-3.5 rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 text-xs font-semibold">
              {estado.error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="func-rut" className="etiqueta">
                RUT de la funcionaria *
              </label>
              <input
                id="func-rut"
                name="rut"
                type="text"
                required
                value={rut}
                onChange={(e) => setRut(formatearRut(e.target.value))}
                placeholder="12.345.678-9"
                className="entrada font-mono text-sm uppercase mt-1"
              />
            </div>

            <div>
              <label htmlFor="func-ingreso" className="etiqueta">
                Fecha de ingreso *
              </label>
              <input
                id="func-ingreso"
                name="fecha_ingreso"
                type="date"
                required
                defaultValue={funcionariaEditar?.fecha_ingreso ?? new Date().toISOString().slice(0, 10)}
                className="entrada text-sm mt-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="func-nombres" className="etiqueta">
                Nombres *
              </label>
              <input
                id="func-nombres"
                name="nombres"
                type="text"
                required
                defaultValue={funcionariaEditar?.nombres ?? ""}
                placeholder="Ej. Marcela Andrea"
                className="entrada text-sm mt-1"
              />
            </div>

            <div>
              <label htmlFor="func-apellidos" className="etiqueta">
                Apellidos *
              </label>
              <input
                id="func-apellidos"
                name="apellidos"
                type="text"
                required
                defaultValue={funcionariaEditar?.apellidos ?? ""}
                placeholder="Ej. Gómez Silva"
                className="entrada text-sm mt-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="func-estamento" className="etiqueta">
                Estamento / Función *
              </label>
              <select
                id="func-estamento"
                name="estamento_rol"
                defaultValue={funcionariaEditar?.estamento_rol ?? "educadora"}
                className="entrada text-sm mt-1"
              >
                {(Object.keys(ETIQUETAS_ESTAMENTO) as EstamentoPersonal[]).map((k) => (
                  <option key={k} value={k}>
                    {ETIQUETAS_ESTAMENTO[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="func-contrato" className="etiqueta">
                Tipo de contrato *
              </label>
              <select
                id="func-contrato"
                name="tipo_contrato"
                defaultValue={funcionariaEditar?.tipo_contrato ?? "planta"}
                className="entrada text-sm mt-1"
              >
                {(Object.keys(ETIQUETAS_CONTRATO) as TipoContratoPersonal[]).map((k) => (
                  <option key={k} value={k}>
                    {ETIQUETAS_CONTRATO[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="func-dias" className="etiqueta">
                Días de permiso anual *
              </label>
              <input
                id="func-dias"
                name="dias_permiso_anual"
                type="number"
                step="0.5"
                min="0"
                max="30"
                required
                defaultValue={funcionariaEditar?.dias_permiso_anual ?? 6.0}
                className="entrada text-sm mt-1"
              />
              <span className="text-[0.65rem] text-tinta-suave mt-0.5 block">
                Definido por ley o reglamento (normalmente 6.0 días)
              </span>
            </div>

            <div>
              <label htmlFor="func-activo" className="etiqueta">
                Estado laboral
              </label>
              <select
                id="func-activo"
                name="activo"
                defaultValue={funcionariaEditar?.activo !== false ? "true" : "false"}
                className="entrada text-sm mt-1"
              >
                <option value="true">Activa (Vigente en Dotación)</option>
                <option value="false">Inactiva (Desvinculada / Salida)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="func-correo" className="etiqueta">
                Correo electrónico
              </label>
              <input
                id="func-correo"
                name="correo"
                type="email"
                defaultValue={funcionariaEditar?.correo ?? ""}
                placeholder="funcionaria@manitos.cl"
                className="entrada text-sm mt-1"
              />
            </div>

            <div>
              <label htmlFor="func-telefono" className="etiqueta">
                Teléfono de contacto
              </label>
              <input
                id="func-telefono"
                name="telefono"
                type="tel"
                defaultValue={funcionariaEditar?.telefono ?? ""}
                placeholder="+56 9 1234 5678"
                className="entrada text-sm mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="func-obs" className="etiqueta">
              Observaciones o antecedentes
            </label>
            <textarea
              id="func-obs"
              name="observaciones"
              rows={2}
              defaultValue={funcionariaEditar?.observaciones ?? ""}
              placeholder="Notas internas de dirección, título profesional, horario, etc."
              className="entrada text-sm mt-1"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t border-cielo-100">
            <button
              type="button"
              onClick={alCerrar}
              className="boton-suave text-xs px-4 py-2"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={pendiente}
              className="boton-primario text-xs px-5 py-2.5 flex items-center gap-2"
            >
              {pendiente ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Guardando…
                </>
              ) : funcionariaEditar ? (
                "Actualizar Datos"
              ) : (
                "Guardar en Dotación"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Users2, X } from "lucide-react";
import { registrarReemplazo, type RespuestaAccion } from "@/app/actions/personal-direccion";
import type { Funcionaria, ReemplazoPersonal } from "@/lib/types";

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  dotacion: Funcionaria[];
  reemplazoEditar?: ReemplazoPersonal | null;
}

const MOTIVOS_REEMPLAZO = [
  "Licencia médica",
  "Permiso administrativo",
  "Feriado legal / Vacaciones",
  "Permiso sin goce de sueldo",
  "Capacitación o comisión de servicio",
  "Fuerza mayor / Emergencia",
  "Otro motivo",
];

export default function ModalRegistrarReemplazo({
  abierto,
  alCerrar,
  dotacion,
  reemplazoEditar,
}: Props) {
  const [estado, accion, pendiente] = useActionState<RespuestaAccion | undefined, FormData>(
    registrarReemplazo,
    undefined,
  );

  const [fechaInicio, setFechaInicio] = useState(
    reemplazoEditar?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
  );
  const [fechaTermino, setFechaTermino] = useState(
    reemplazoEditar?.fecha_termino ?? new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (estado?.ok) {
      alCerrar();
    }
  }, [estado, alCerrar]);

  useEffect(() => {
    if (reemplazoEditar) {
      setFechaInicio(reemplazoEditar.fecha_inicio);
      setFechaTermino(reemplazoEditar.fecha_termino);
    }
  }, [reemplazoEditar, abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-xs animate-aparecer">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-cielo-100 overflow-hidden">
        {/* Cabecera */}
        <header className="flex items-center justify-between border-b border-cielo-100 bg-cielo-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-indigo-500 text-white shadow-sm">
              <Users2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-tinta">
                {reemplazoEditar ? "Editar Reemplazo" : "Registrar Reemplazo"}
              </h2>
              <p className="text-xs text-tinta-suave">
                Cobertura de ausencias de funcionarias en sala y dependencias
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
        <form action={accion} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {reemplazoEditar && <input type="hidden" name="id" value={reemplazoEditar.id} />}

          {estado?.error && (
            <div className="p-3.5 rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{estado.error}</span>
            </div>
          )}

          {/* Funcionaria Titular Ausente */}
          <div>
            <label htmlFor="reemp-titular" className="etiqueta">
              Funcionaria titular ausente *
            </label>
            <select
              id="reemp-titular"
              name="titular_id"
              required
              defaultValue={reemplazoEditar?.titular_id ?? dotacion[0]?.id ?? ""}
              className="entrada text-sm mt-1"
            >
              {dotacion
                .filter((f) => f.activo)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.apellidos}, {f.nombres} ({f.estamento_rol.replace("_", " ").toUpperCase()})
                  </option>
                ))}
            </select>
          </div>

          {/* Nombre de la Reemplazante */}
          <div>
            <label htmlFor="reemp-nombre" className="etiqueta">
              Nombre de la persona reemplazante *
            </label>
            <input
              id="reemp-nombre"
              name="reemplazante_nombre"
              type="text"
              required
              defaultValue={reemplazoEditar?.reemplazante_nombre ?? ""}
              placeholder="Ej. Francisca Andrea Morales Rivas"
              className="entrada text-sm mt-1"
            />
          </div>

          {/* Motivo del Reemplazo */}
          <div>
            <label htmlFor="reemp-motivo" className="etiqueta">
              Motivo de la ausencia / reemplazo *
            </label>
            <select
              id="reemp-motivo"
              name="motivo"
              required
              defaultValue={reemplazoEditar?.motivo ?? MOTIVOS_REEMPLAZO[0]}
              className="entrada text-sm mt-1"
            >
              {MOTIVOS_REEMPLAZO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas de Inicio y Término */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reemp-inicio" className="etiqueta">
                Fecha inicio *
              </label>
              <input
                id="reemp-inicio"
                name="fecha_inicio"
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="entrada text-sm mt-1"
              />
            </div>

            <div>
              <label htmlFor="reemp-termino" className="etiqueta">
                Fecha término estimativa *
              </label>
              <input
                id="reemp-termino"
                name="fecha_termino"
                type="date"
                required
                value={fechaTermino}
                onChange={(e) => setFechaTermino(e.target.value)}
                min={fechaInicio}
                className="entrada text-sm mt-1"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label htmlFor="reemp-obs" className="etiqueta">
              Observaciones (Nivel asignado, horario, etc.)
            </label>
            <textarea
              id="reemp-obs"
              name="observaciones"
              rows={2}
              defaultValue={reemplazoEditar?.observaciones ?? ""}
              placeholder="Ej. Cubre funciones en Nivel Medio Menor durante turno de mañana..."
              className="entrada text-sm mt-1"
            />
          </div>

          {/* Estado de Cobertura */}
          <div>
            <label htmlFor="reemp-activo" className="etiqueta">
              Estado del reemplazo
            </label>
            <select
              id="reemp-activo"
              name="activo"
              defaultValue={reemplazoEditar?.activo !== false ? "true" : "false"}
              className="entrada text-sm mt-1"
            >
              <option value="true">Activo / Vigente en el jardín</option>
              <option value="false">Finalizado / Concluido</option>
            </select>
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
              ) : (
                <>
                  <CheckCircle2 className="size-4" />{" "}
                  {reemplazoEditar ? "Actualizar Reemplazo" : "Confirmar Reemplazo"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

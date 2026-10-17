"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Clock, Loader2, Sparkles, X } from "lucide-react";
import { registrarPermisoAdministrativo, type RespuestaAccion } from "@/app/actions/personal-direccion";
import type { FuncionariaConSaldo } from "@/lib/types";

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  dotacion: FuncionariaConSaldo[];
  funcionariaSeleccionada?: FuncionariaConSaldo | null;
}

export default function ModalRegistrarPermiso({
  abierto,
  alCerrar,
  dotacion,
  funcionariaSeleccionada,
}: Props) {
  const [estado, accion, pendiente] = useActionState<RespuestaAccion | undefined, FormData>(
    registrarPermisoAdministrativo,
    undefined,
  );

  const [idSeleccionado, setIdSeleccionado] = useState<string>(
    funcionariaSeleccionada?.id ?? dotacion[0]?.id ?? "",
  );
  const [dias, setDias] = useState<number>(1.0);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (funcionariaSeleccionada) {
      setIdSeleccionado(funcionariaSeleccionada.id);
    } else if (dotacion.length > 0 && !idSeleccionado) {
      setIdSeleccionado(dotacion[0].id);
    }
  }, [funcionariaSeleccionada, dotacion, idSeleccionado]);

  useEffect(() => {
    if (estado?.ok) {
      alCerrar();
    }
  }, [estado, alCerrar]);

  const funcionariaActual = useMemo(() => {
    return dotacion.find((f) => f.id === idSeleccionado) ?? null;
  }, [dotacion, idSeleccionado]);

  const saldoRestante = Number(funcionariaActual?.dias_restantes ?? 0);
  const saldoUtilizado = Number(funcionariaActual?.dias_utilizados ?? 0);
  const saldoTotal = Number(funcionariaActual?.total_dias_asignados ?? 6.0);

  const esSaldoInsuficiente = dias > saldoRestante;

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-xs animate-aparecer">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-cielo-100 overflow-hidden">
        {/* Cabecera */}
        <header className="flex items-center justify-between border-b border-cielo-100 bg-cielo-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-500 text-white shadow-sm">
              <Calendar className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-tinta">Registrar Permiso Administrativo</h2>
              <p className="text-xs text-tinta-suave">
                Descuento oficial del saldo anual de días hábiles
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
          {estado?.error && (
            <div className="p-3.5 rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{estado.error}</span>
            </div>
          )}

          {/* Selector de Funcionaria */}
          <div>
            <label htmlFor="perm-func" className="etiqueta">
              Funcionaria solicitante *
            </label>
            <select
              id="perm-func"
              name="funcionaria_id"
              value={idSeleccionado}
              onChange={(e) => setIdSeleccionado(e.target.value)}
              className="entrada text-sm mt-1"
              required
            >
              {dotacion
                .filter((f) => f.activo)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.apellidos}, {f.nombres} ({f.rut}) — Saldo: {f.dias_restantes} días
                  </option>
                ))}
            </select>
          </div>

          {/* Semáforo Visual de Saldo Actual */}
          {funcionariaActual && (
            <div className="p-4 rounded-2xl border border-cielo-100 bg-cielo-50/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-tinta">
                  Estado de saldo año {new Date().getFullYear()}:
                </span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded-full text-[0.7rem] ${
                    saldoRestante >= 3
                      ? "bg-menta-100 text-menta-800 border border-menta-200"
                      : saldoRestante > 0.5
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-coral-100 text-coral-800 border border-coral-200"
                  }`}
                >
                  {saldoRestante.toFixed(1)} días disponibles
                </span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border border-cielo-200">
                <div
                  className={`h-full transition-all duration-500 ${
                    saldoRestante >= 3 ? "bg-menta-500" : saldoRestante > 0.5 ? "bg-amber-500" : "bg-coral-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (saldoUtilizado / saldoTotal) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[0.7rem] text-tinta-suave">
                <span>Gastados: <b>{saldoUtilizado.toFixed(1)} días</b></span>
                <span>Tope Anual: <b>{saldoTotal.toFixed(1)} días</b></span>
              </div>
            </div>
          )}

          {/* Fecha del Permiso */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="perm-fecha" className="etiqueta">
                Fecha del permiso *
              </label>
              <input
                id="perm-fecha"
                name="fecha_solicitada"
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="entrada text-sm mt-1"
              />
            </div>

            <div>
              <label htmlFor="perm-estado" className="etiqueta">
                Estado de la resolución *
              </label>
              <select
                id="perm-estado"
                name="estado"
                defaultValue="aprobado"
                className="entrada text-sm mt-1"
              >
                <option value="aprobado">Aprobado (Descontar de inmediato)</option>
                <option value="pendiente">Pendiente (Por autorizar)</option>
                <option value="rechazado">Rechazado (No descuenta)</option>
              </select>
            </div>
          </div>

          {/* Duración / Días Solicitados */}
          <div>
            <label className="etiqueta block mb-1.5">Duración a descontar *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDias(1.0)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5 ${
                  dias === 1.0
                    ? "bg-cielo-500 text-white border-cielo-500 shadow-sm"
                    : "bg-white text-tinta border-cielo-200 hover:bg-cielo-50"
                }`}
              >
                <Clock className="size-3.5" /> 1 Día completo
              </button>

              <button
                type="button"
                onClick={() => setDias(0.5)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5 ${
                  dias === 0.5
                    ? "bg-cielo-500 text-white border-cielo-500 shadow-sm"
                    : "bg-white text-tinta border-cielo-200 hover:bg-cielo-50"
                }`}
              >
                <Clock className="size-3.5" /> Medio día (0.5)
              </button>

              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="entrada text-xs py-2 text-center"
                  placeholder="Otro"
                />
              </div>
            </div>
            <input type="hidden" name="dias_solicitados" value={dias} />
          </div>

          {/* Alerta si excede el saldo */}
          {esSaldoInsuficiente && (
            <div className="p-3.5 rounded-2xl bg-coral-50 border border-coral-200 text-coral-800 text-xs flex items-start gap-2 animate-aparecer">
              <AlertCircle className="size-4 shrink-0 text-coral-600 mt-0.5" />
              <div>
                <p className="font-bold">¡Atención! Saldo insuficiente</p>
                <p>
                  La funcionaria solo tiene <b>{saldoRestante.toFixed(1)} días</b> disponibles.
                  No es posible aprobar una solicitud de <b>{dias.toFixed(1)} días</b> sin exceder el cupo anual.
                </p>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label htmlFor="perm-obs" className="etiqueta">
              Motivo u observaciones
            </label>
            <textarea
              id="perm-obs"
              name="observaciones"
              rows={2}
              placeholder="Ej. Trámite bancario, cita médica personal, asuntos familiares..."
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
              disabled={pendiente || esSaldoInsuficiente}
              className="boton-primario text-xs px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              {pendiente ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Registrando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> Confirmar Permiso ({dias.toFixed(1)} día)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

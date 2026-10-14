"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { establecerPinApoderadoAction } from "@/app/actions/parvulos";

interface Props {
  rutParvulo: string;
  nombreParvulo: string;
  tienePinActual: boolean;
  onCerrar: () => void;
  onExito?: () => void;
}

export default function ModalCambiarPinApoderado({
  rutParvulo,
  nombreParvulo,
  tienePinActual,
  onCerrar,
  onExito,
}: Props) {
  const [pinActual, setPinActual] = useState("");
  const [nuevoPin, setNuevoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [mostrarPin, setMostrarPin] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensajeError(null);

    if (tienePinActual && pinActual.length !== 4) {
      setMensajeError("Debes ingresar tu PIN actual de 4 dígitos.");
      return;
    }

    if (nuevoPin.length !== 4 || !/^[0-9]{4}$/.test(nuevoPin)) {
      setMensajeError("El nuevo PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    if (nuevoPin !== confirmarPin) {
      setMensajeError("La confirmación del nuevo PIN no coincide.");
      return;
    }

    startTransition(async () => {
      const res = await establecerPinApoderadoAction(rutParvulo, pinActual, nuevoPin);
      if (res.ok) {
        setMensajeExito("¡PIN guardado exitosamente!");
        setTimeout(() => {
          onExito?.();
        }, 1200);
      } else {
        setMensajeError(res.error || "No se pudo actualizar el PIN.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
      <div className="relative w-full max-w-md rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-5">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-cielo-50 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-sol-100 text-sol-600 shadow-xs">
              <Lock className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-tinta">
                {tienePinActual ? "Cambiar PIN de Seguridad" : "Proteger Ficha con PIN"}
              </h3>
              <p className="text-xs text-tinta-suave">
                {nombreParvulo}
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

        {/* Notificaciones */}
        {mensajeExito && (
          <div className="flex items-center gap-2 rounded-2xl bg-menta-100 p-4 text-xs font-semibold text-menta-800">
            <CheckCircle2 className="size-4 shrink-0 text-menta-600" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {mensajeError && (
          <div className="flex items-center gap-2 rounded-2xl bg-coral-100 p-4 text-xs font-semibold text-coral-800">
            <AlertCircle className="size-4 shrink-0 text-coral-600" />
            <span>{mensajeError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setMostrarPin(!mostrarPin)}
              className="text-xs font-semibold text-cielo-600 hover:underline inline-flex items-center gap-1"
            >
              {mostrarPin ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              {mostrarPin ? "Ocultar dígitos" : "Mostrar dígitos"}
            </button>
          </div>

          {/* PIN Actual (si ya tenía uno) */}
          {tienePinActual && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-tinta">
                PIN Actual (4 dígitos) *
              </label>
              <input
                type={mostrarPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                required
                value={pinActual}
                onChange={(e) => setPinActual(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-2.5 text-center text-lg font-mono tracking-widest text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
              />
            </div>
          )}

          {/* Nuevo PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tinta">
              {tienePinActual ? "Nuevo PIN (4 dígitos) *" : "Crear PIN de 4 dígitos *"}
            </label>
            <input
              type={mostrarPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              required
              value={nuevoPin}
              onChange={(e) => setNuevoPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-2.5 text-center text-lg font-mono tracking-widest text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
            />
          </div>

          {/* Confirmar Nuevo PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-tinta">
              Confirmar Nuevo PIN *
            </label>
            <input
              type={mostrarPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              required
              value={confirmarPin}
              onChange={(e) => setConfirmarPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-2.5 text-center text-lg font-mono tracking-widest text-tinta outline-hidden focus:border-cielo-400 focus:bg-white transition"
            />
          </div>

          <div className="rounded-2xl bg-cielo-50/70 border border-cielo-100 p-3 text-[11px] text-cielo-800 flex items-start gap-2">
            <ShieldCheck className="size-4 shrink-0 text-cielo-600 mt-0.5" />
            <span>
              Este PIN será solicitado cada vez que consultes la ficha de tu hijo/a. Guárdalo en un lugar seguro.
            </span>
          </div>

          {/* Botones */}
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
              disabled={isPending || nuevoPin.length !== 4 || confirmarPin.length !== 4}
              className="boton-sol px-5 py-2 text-xs font-bold shadow-xs inline-flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <KeyRound className="size-4" /> Guardar PIN
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Search } from "lucide-react";
import { formatearRut, limpiarRut, validarRut } from "@/lib/rut";

interface Props {
  rutInicial?: string;
  errorInicial?: string | null;
}

export default function FormularioConsultaApoderado({
  rutInicial = "",
  errorInicial = null,
}: Props) {
  const router = useRouter();
  const [rut, setRut] = useState(formatearRut(rutInicial));
  const [tocado, setTocado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(errorInicial);

  const rutValido = validarRut(rut);
  const rutCompleto = limpiarRut(rut).length >= 8;
  const mostrarErrorRut = (tocado || rutCompleto) && rut.length > 0 && !rutValido;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTocado(true);
    setError(null);

    if (!rutValido) {
      setError("Por favor ingresa un RUT chileno válido antes de consultar.");
      return;
    }

    setCargando(true);
    router.push(`/apoderado?rut=${encodeURIComponent(rut)}`);
  }

  return (
    <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-flotante sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="rut-apoderado-portal" className="etiqueta text-sm font-bold">
            RUT del párvulo
          </label>
          <div className="relative">
            <input
              id="rut-apoderado-portal"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="12.345.678-9"
              value={rut}
              onChange={(e) => {
                setRut(formatearRut(e.target.value));
                setError(null);
              }}
              onBlur={() => setTocado(true)}
              className={`campo pr-12 text-lg font-bold tracking-wider ${
                mostrarErrorRut ? "campo-error" : ""
              }`}
            />
            {rutValido && (
              <CheckCircle2 className="absolute right-4 top-1/2 size-6 -translate-y-1/2 text-menta-500" />
            )}
          </div>
          <p
            className={`mt-1.5 text-xs font-semibold ${
              mostrarErrorRut ? "text-coral-500" : "text-tinta-suave"
            }`}
          >
            {mostrarErrorRut
              ? "El RUT ingresado no es válido. Verifica el número y dígito verificador."
              : "Formato automático con puntos y guion. Ej: 24.123.456-7"}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl bg-coral-50 p-4 text-sm font-semibold text-coral-600 animate-sacudir"
          >
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}

        <button
          id="btn-consultar-apoderado"
          type="submit"
          disabled={cargando || !rutValido}
          className="boton-sol w-full py-4 text-lg font-bold shadow-md"
        >
          {cargando ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Buscando información…
            </>
          ) : (
            <>
              <Search className="size-5" /> Consultar Ficha del Párvulo
            </>
          )}
        </button>
      </form>
    </div>
  );
}

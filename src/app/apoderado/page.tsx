import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { normalizarRut, validarRut } from "@/lib/rut";
import FormularioConsultaApoderado from "@/components/apoderado/FormularioConsultaApoderado";
import FichaCompletaApoderado from "@/components/apoderado/FichaCompletaApoderado";
import type { FichaApoderado } from "@/lib/types";

export const metadata: Metadata = {
  title: "Portal de Familias y Apoderados",
  description:
    "Consulta de asistencia, bitácoras de avances pedagógicos y archivos compartidos del párvulo.",
};

interface PaginaProps {
  searchParams?: Promise<{ rut?: string }>;
}

export default async function PaginaApoderado(props: PaginaProps) {
  const searchParams = (await props.searchParams) ?? {};
  const rutParam = searchParams.rut?.trim();

  let ficha: FichaApoderado | null = null;
  let mensajeError: string | null = null;

  if (rutParam) {
    if (!validarRut(rutParam)) {
      mensajeError = "El RUT ingresado no es válido. Verifica el número y su dígito verificador.";
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("consultar_ficha_apoderado", {
        p_rut: normalizarRut(rutParam),
      });

      if (error) {
        mensajeError = "Ocurrió un error al consultar los datos. Por favor intenta más tarde.";
      } else {
        const resultado = data as FichaApoderado;
        if (!resultado?.encontrado) {
          mensajeError =
            resultado?.mensaje ?? "No se encontró un párvulo activo con el RUT indicado.";
        } else {
          ficha = resultado;
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-cielo-50 via-crema to-menta-50 text-tinta flex flex-col">
      {/* Barra superior de navegación */}
      <header className="print:hidden border-b border-cielo-100 bg-white/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/img/logo-manitos.jpg"
              alt="Logo Jardín Infantil Manitos de Ángel"
              width={48}
              height={48}
              className="size-11 rounded-2xl object-cover shadow-suave"
            />
            <span className="leading-tight">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-cielo-600">
                Jardín Infantil
              </span>
              <span className="block font-display text-lg font-semibold text-tinta">
                Manitos de Ángel
              </span>
            </span>
          </Link>

          <Link href="/" className="boton-suave px-4 py-2 text-xs font-bold">
            <ArrowLeft className="size-4" /> Volver al Inicio
          </Link>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Cabecera institucional imprimible */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-cielo-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/img/logo-manitos.jpg"
              alt="Logo Jardín Infantil Manitos de Ángel"
              width={56}
              height={56}
              className="size-14 rounded-xl object-cover"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cielo-600">
                Jardín Infantil Manitos de Ángel
              </p>
              <h1 className="text-xl font-bold font-display text-tinta">
                Informe Pedagógico y de Asistencia
              </h1>
            </div>
          </div>
          <div className="text-right text-xs text-tinta-suave">
            <p>Fecha de emisión:</p>
            <p className="font-bold text-tinta">
              {new Date().toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {ficha ? (
          <FichaCompletaApoderado ficha={ficha} />
        ) : (
          <div className="space-y-8 animate-aparecer">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-sol-100 px-4 py-2 text-xs font-bold text-sol-700 shadow-xs">
                <HeartHandshake className="size-4 text-sol-600" />
                Portal Oficial de Familias
              </span>
              <h1 className="font-display text-3xl font-bold text-tinta sm:text-4xl">
                Consulta el avance de tu hijo/a
              </h1>
              <p className="text-sm text-tinta-suave leading-relaxed">
                Ingresa el RUT chileno de tu párvulo para revisar su asistencia actualizada,
                la bitácora de observaciones pedagógicas y las fotografías de sus actividades.
              </p>
            </div>

            <div className="mx-auto max-w-lg">
              <FormularioConsultaApoderado
                rutInicial={rutParam}
                errorInicial={mensajeError}
              />
            </div>

            <div className="mx-auto max-w-md rounded-2xl border border-menta-200 bg-white/70 p-4 text-center text-xs text-tinta-suave backdrop-blur-xs flex items-center justify-center gap-2">
              <ShieldCheck className="size-4 text-menta-500 shrink-0" />
              <span>
                Acceso protegido mediante clave única por RUT. Solo las familias autorizadas pueden consultar.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Pie de página */}
      <footer className="print:hidden border-t border-cielo-100 bg-white/60 py-6 text-center text-xs text-tinta-suave">
        <p>© {new Date().getFullYear()} Jardín Infantil Manitos de Ángel · Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

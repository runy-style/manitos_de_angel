import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeartPulse, Users } from "lucide-react";
import SelectorNivel from "@/components/dashboard/SelectorNivel";
import PanelLicenciasEducadora from "@/components/licencias/PanelLicenciasEducadora";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { LicenciaMedica, Nivel } from "@/lib/types";

export const metadata: Metadata = {
  title: "Gestión de Licencias Médicas",
};

interface PaginaLicenciasProps {
  searchParams?: Promise<{ nivel?: string }>;
}

export default async function PaginaLicencias(props: PaginaLicenciasProps) {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const supabase = await createClient();

  // 1. Cargar niveles
  const { data: niveles } = await supabase
    .from("niveles")
    .select("id, nombre, descripcion")
    .order("created_at")
    .returns<Nivel[]>();

  if (!niveles || niveles.length === 0) {
    return (
      <div className="tarjeta-vidrio p-12 text-center text-tinta-suave">
        <Users className="mx-auto mb-3 size-12 text-cielo-300" />
        <h2 className="text-xl font-bold text-tinta">No hay niveles registrados</h2>
        <p className="mt-2 text-sm">Ejecuta el script SQL en Supabase para crear los niveles.</p>
      </div>
    );
  }

  // 2. Determinar nivel seleccionado
  const nivelParam = typeof searchParams.nivel === "string" ? searchParams.nivel : undefined;
  const nivelSeleccionadoId =
    nivelParam && niveles.some((n) => n.id === nivelParam)
      ? nivelParam
      : sesion.perfil.nivel_id && niveles.some((n) => n.id === sesion.perfil.nivel_id)
      ? sesion.perfil.nivel_id
      : niveles[0].id;

  const nivelSeleccionado = niveles.find((n) => n.id === nivelSeleccionadoId)!;

  // 3. Cargar licencias médicas del nivel
  const { data: licenciasRaw, error } = await supabase
    .from("licencias_medicas")
    .select(`
      id,
      parvulo_id,
      nivel_id,
      fecha_emision,
      fecha_inicio,
      fecha_termino,
      dias_reposo,
      diagnostico_motivo,
      drive_file_id,
      drive_file_url,
      nombre_archivo,
      estado,
      observacion_educadora,
      revisado_por,
      revisado_el,
      created_at,
      parvulo:parvulos(id, nombres, apellidos, rut),
      nivel:niveles(id, nombre)
    `)
    .eq("nivel_id", nivelSeleccionadoId)
    .order("fecha_inicio", { ascending: false });

  // Normalizar array para typescript
  const licencias = (licenciasRaw as unknown as LicenciaMedica[]) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta flex items-center gap-2">
            <HeartPulse className="size-8 text-coral-500" />
            Licencias Médicas y Reposo
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Revisión de certificados médicos subidos por apoderados con justificación automática en Asistencia.
          </p>
        </div>
      </div>

      {/* Selector de nivel */}
      <SelectorNivel
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionadoId}
        rutaBase="/dashboard/licencias"
      />

      {/* Panel principal */}
      <PanelLicenciasEducadora
        licencias={licencias}
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionadoId}
        perfil={sesion.perfil}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";
import SelectorNivel from "@/components/dashboard/SelectorNivel";
import PanelEntrevistasEducadora from "@/components/entrevistas/PanelEntrevistasEducadora";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { filtrarNivelesPorPerfil } from "@/lib/permisos";
import type { Entrevista, Nivel, Parvulo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Agenda de Entrevistas y Actas PDF",
  description:
    "Coordinación de entrevistas de apoderados y generación automática de actas en PDF para Google Drive.",
};

interface PaginaEntrevistasProps {
  searchParams?: Promise<{ nivel?: string }>;
}

export default async function PaginaEntrevistas(props: PaginaEntrevistasProps) {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const supabase = await createClient();

  // 1. Cargar niveles
  const { data: nivelesRaw } = await supabase
    .from("niveles")
    .select("id, nombre, descripcion")
    .order("created_at")
    .returns<Nivel[]>();

  const niveles = filtrarNivelesPorPerfil(nivelesRaw ?? [], sesion.perfil);

  if (!niveles || niveles.length === 0) {
    return (
      <div className="tarjeta-vidrio p-12 text-center text-tinta-suave">
        <Users className="mx-auto mb-3 size-12 text-cielo-300" />
        <h2 className="text-xl font-bold text-tinta">
          {sesion.perfil.rol === "educadora"
            ? "No tienes niveles asignados"
            : "No hay niveles registrados"}
        </h2>
        <p className="mt-2 text-sm">
          {sesion.perfil.rol === "educadora"
            ? "Pide a la administración que asigne tu nivel a cargo en tu perfil."
            : "Ejecuta el script SQL en Supabase para crear los niveles."}
        </p>
      </div>
    );
  }

  // 2. Determinar nivel seleccionado dentro de los visibles
  const nivelParam = typeof searchParams.nivel === "string" ? searchParams.nivel : undefined;
  const nivelSeleccionadoId =
    nivelParam && niveles.some((n) => n.id === nivelParam)
      ? nivelParam
      : niveles[0].id;

  // 3. Cargar párvulos activos del nivel
  const { data: parvulosRaw } = await supabase
    .from("parvulos")
    .select("id, rut, pin_apoderado, nombres, apellidos, fecha_nacimiento, nombre_apoderado, telefono_apoderado, nivel_id, activo, drive_folder_id, drive_folder_url")
    .eq("nivel_id", nivelSeleccionadoId)
    .eq("activo", true)
    .order("apellidos");

  const parvulos = (parvulosRaw ?? []) as Parvulo[];

  // 4. Cargar entrevistas del nivel
  const { data: entrevistasRaw } = await supabase
    .from("entrevistas")
    .select(`
      id,
      parvulo_id,
      nivel_id,
      educadora_id,
      fecha,
      hora,
      solicitado_por,
      modalidad,
      motivo,
      estado,
      asistentes,
      puntos_tratados,
      acuerdos_compromisos,
      observaciones,
      drive_file_id,
      drive_file_url,
      nombre_archivo_pdf,
      acta_firmada_o_cerrada,
      visible_apoderado,
      created_at,
      updated_at,
      parvulo:parvulos(id, nombres, apellidos, rut, nombre_apoderado, telefono_apoderado),
      nivel:niveles(id, nombre),
      educadora:perfiles(id, nombre_completo)
    `)
    .eq("nivel_id", nivelSeleccionadoId)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: true });

  const entrevistas = (entrevistasRaw as unknown as Entrevista[]) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta flex items-center gap-2">
            <CalendarDays className="size-8 text-sol-500" />
            Agenda y Actas de Entrevistas
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Agendamiento de entrevistas con apoderados, registro de acuerdos y generación automática de actas PDF en Google Drive.
          </p>
        </div>
      </div>

      {/* Selector de nivel */}
      <SelectorNivel
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionadoId}
        rutaBase="/dashboard/entrevistas"
      />

      {/* Panel principal de entrevistas */}
      <PanelEntrevistasEducadora
        entrevistas={entrevistas}
        parvulos={parvulos}
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionadoId}
        perfil={sesion.perfil}
      />
    </div>
  );
}

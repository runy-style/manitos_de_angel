import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import VistaPlanificaciones from "@/components/dashboard/planificaciones/VistaPlanificaciones";
import type { DocumentoNivel, Nivel } from "@/lib/types";

export const metadata: Metadata = {
  title: "Planificaciones y Pautas",
  description:
    "Gestión y consulta de planificaciones mensuales y pautas de evaluación del jardín con Google Drive.",
};

interface PaginaProps {
  searchParams?: Promise<{ nivelId?: string }>;
}

export default async function PaginaPlanificaciones(props: PaginaProps) {
  const searchParams = (await props.searchParams) ?? {};
  const sesion = await obtenerSesion();
  const supabase = await createClient();

  // 1. Obtener todos los niveles
  const { data: nivelesRaw } = await supabase
    .from("niveles")
    .select("id, nombre, descripcion")
    .order("nombre");
  const niveles = (nivelesRaw ?? []) as Nivel[];

  if (niveles.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-tinta">
        <p className="font-bold">No hay niveles registrados en la base de datos.</p>
      </div>
    );
  }

  // 2. Determinar el nivel seleccionado
  const nivelSeleccionadoId =
    searchParams.nivelId ||
    (sesion.tipo === "ok" && sesion.perfil.rol === "educadora" && sesion.perfil.nivel_id
      ? sesion.perfil.nivel_id
      : niveles[0].id);

  const nivelActual =
    niveles.find((n) => n.id === nivelSeleccionadoId) ?? niveles[0];

  // 3. Permisos
  const esAdmin = sesion.tipo === "ok" && sesion.perfil.rol === "admin";
  const puedeEditar =
    esAdmin ||
    (sesion.tipo === "ok" &&
      sesion.perfil.rol === "educadora" &&
      sesion.perfil.nivel_id === nivelActual.id);

  // 4. Obtener documentos del nivel
  const { data: documentosRaw } = await supabase
    .from("documentos_nivel")
    .select(`
      id,
      nivel_id,
      educadora_id,
      tipo_documento,
      mes,
      anio,
      titulo,
      descripcion,
      drive_file_id,
      drive_file_url,
      nombre_archivo,
      created_at,
      educadora:perfiles(id, nombre_completo),
      nivel:niveles(id, nombre)
    `)
    .eq("nivel_id", nivelActual.id)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .order("created_at", { ascending: false });

  const documentos = ((documentosRaw ?? []) as unknown as DocumentoNivel[]).map((d) => ({
    ...d,
    educadora: Array.isArray(d.educadora) ? d.educadora[0] ?? null : d.educadora,
    nivel: Array.isArray(d.nivel) ? d.nivel[0] ?? null : d.nivel,
  }));

  return (
    <VistaPlanificaciones
      niveles={niveles}
      nivelActual={nivelActual}
      documentos={documentos}
      puedeEditar={puedeEditar}
      esAdmin={esAdmin}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone, Users } from "lucide-react";
import SelectorNivel from "@/components/dashboard/SelectorNivel";
import PanelComunicadosEducadora from "@/components/comunicados/PanelComunicadosEducadora";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { Comunicado, Nivel } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mural de Comunicados y Circulares",
  description:
    "Cuaderno digital de avisos, actividades y circulares para los niveles y apoderados.",
};

interface PaginaComunicadosProps {
  searchParams?: Promise<{ nivel?: string }>;
}

export default async function PaginaComunicados(props: PaginaComunicadosProps) {
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

  // 3. Cargar comunicados del nivel seleccionado + los comunicados generales del jardín
  const { data: comunicadosRaw } = await supabase
    .from("comunicados")
    .select(`
      id,
      nivel_id,
      autor_id,
      titulo,
      contenido,
      categoria,
      fijado,
      fecha_evento,
      adjunto_url,
      activo,
      created_at,
      updated_at,
      nivel:niveles(id, nombre),
      autor:perfiles(id, nombre_completo, rol)
    `)
    .or(`nivel_id.eq.${nivelSeleccionadoId},nivel_id.is.null`)
    .eq("activo", true)
    .order("fijado", { ascending: false })
    .order("created_at", { ascending: false });

  const comunicados = (comunicadosRaw as unknown as Comunicado[]) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta flex items-center gap-2">
            <Megaphone className="size-8 text-sol-500" />
            Mural de Comunicados y Circulares
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Cuaderno digital oficial: publica avisos de actividades, materiales y recordatorios con opción de compartir por WhatsApp a los grupos de apoderados.
          </p>
        </div>
      </div>

      {/* Selector de nivel */}
      <SelectorNivel
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionadoId}
        rutaBase="/dashboard/comunicados"
      />

      {/* Panel de comunicados */}
      <PanelComunicadosEducadora
        comunicados={comunicados}
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionadoId}
        perfil={sesion.perfil}
      />
    </div>
  );
}

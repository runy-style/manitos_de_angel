import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { filtrarNivelesPorPerfil } from "@/lib/permisos";
import VistaBitacora from "@/components/dashboard/bitacora/VistaBitacora";
import type { EntradaBitacora, Nivel, Parvulo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Bitácora Pedagógica",
  description:
    "Seguimiento pedagógico, observaciones y avances individuales de los párvulos.",
};

interface PaginaProps {
  searchParams?: Promise<{ nivelId?: string; parvuloId?: string }>;
}

export default async function PaginaBitacora(props: PaginaProps) {
  const searchParams = (await props.searchParams) ?? {};
  const sesion = await obtenerSesion();
  const supabase = await createClient();

  // 1. Obtener niveles y filtrar por perfil
  const { data: nivelesRaw } = await supabase
    .from("niveles")
    .select("id, nombre, descripcion")
    .order("nombre");
  const todosLosNiveles = (nivelesRaw ?? []) as Nivel[];
  const niveles = sesion.tipo === "ok" ? filtrarNivelesPorPerfil(todosLosNiveles, sesion.perfil) : todosLosNiveles;

  if (niveles.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-tinta">
        <p className="font-bold">
          {sesion.tipo === "ok" && sesion.perfil.rol === "educadora"
            ? "No tienes niveles asignados a tu cargo actualmente."
            : "No hay niveles registrados en la base de datos."}
        </p>
      </div>
    );
  }

  // 2. Determinar el nivel seleccionado dentro de los visibles
  const nivelSeleccionadoId =
    searchParams.nivelId && niveles.some((n) => n.id === searchParams.nivelId)
      ? searchParams.nivelId
      : niveles[0].id;

  const nivelActual =
    niveles.find((n) => n.id === nivelSeleccionadoId) ?? niveles[0];

  // 3. Obtener párvulos del nivel
  const { data: parvulosRaw } = await supabase
    .from("parvulos")
    .select("*")
    .eq("nivel_id", nivelActual.id)
    .eq("activo", true)
    .order("apellidos");
  const parvulos = (parvulosRaw ?? []) as Parvulo[];

  // 4. Obtener las entradas de bitácora del nivel
  const { data: bitacorasRaw } = await supabase
    .from("bitacoras")
    .select(`
      id,
      parvulo_id,
      nivel_id,
      educadora_id,
      fecha,
      area_avance,
      observacion,
      visible_apoderado,
      created_at,
      educadora:perfiles(id, nombre_completo),
      parvulo:parvulos(id, nombres, apellidos, rut)
    `)
    .eq("nivel_id", nivelActual.id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  // Normalizar datos de relaciones
  const bitacoras = ((bitacorasRaw ?? []) as unknown as EntradaBitacora[]).map((b) => ({
    ...b,
    educadora: Array.isArray(b.educadora) ? b.educadora[0] ?? null : b.educadora,
    parvulo: Array.isArray(b.parvulo) ? b.parvulo[0] ?? null : b.parvulo,
  }));

  return (
    <VistaBitacora
      niveles={niveles}
      nivelActual={nivelActual}
      parvulos={parvulos}
      bitacoras={bitacoras}
      parvuloInicialId={searchParams.parvuloId}
    />
  );
}

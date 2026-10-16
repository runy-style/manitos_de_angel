import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Newspaper, ShieldAlert, Sparkles } from "lucide-react";
import PanelGestionNoticias from "@/components/noticias/PanelGestionNoticias";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { Publicacion } from "@/lib/types";

export const metadata: Metadata = {
  title: "Gestión de Noticias Web",
};

export default async function PaginaNoticiasDashboard() {
  const sesion = await obtenerSesion();

  if (sesion.tipo !== "ok") {
    redirect("/dashboard");
  }

  // Verificación estricta: Solo Dirección u Organización o Administración
  const rol = sesion.perfil.rol;
  const tieneAcceso = rol === "admin" || rol === "organizacion";

  if (!tieneAcceso) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center animate-aparecer">
        <div className="tarjeta-vidrio p-10 space-y-4">
          <div className="grid size-16 mx-auto place-items-center rounded-3xl bg-coral-100 text-coral-600 shadow-xs">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-tinta">Acceso Restringido a Dirección</h2>
          <p className="text-sm text-tinta-suave max-w-md mx-auto">
            El módulo de publicaciones para la página web principal del jardín está reservado
            exclusivamente para la Dirección y Administración del establecimiento.
          </p>
          <div className="pt-2">
            <Link href="/dashboard" className="boton-primario px-5 py-2.5 text-xs font-bold inline-flex">
              Volver al panel general
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: publicacionesRaw } = await supabase
    .from("publicaciones")
    .select(`
      id,
      titulo,
      contenido,
      imagen_url,
      autor_id,
      activo,
      created_at,
      updated_at,
      autor:perfiles(id, nombre_completo, email, rol)
    `)
    .order("created_at", { ascending: false })
    .returns<Publicacion[]>();

  const publicaciones = publicacionesRaw ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta flex items-center gap-2.5">
            <Newspaper className="size-8 text-cielo-500" />
            Noticias y Publicaciones Web
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Crea y administra los comunicados, avisos y fotografías que se muestran a la comunidad en la página de inicio.
          </p>
        </div>
      </div>

      {/* Panel interactivo */}
      <PanelGestionNoticias
        publicacionesIniciales={publicaciones}
        perfil={sesion.perfil}
      />
    </div>
  );
}

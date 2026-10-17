import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import PanelAdministrador from "@/components/admin/PanelAdministrador";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { Nivel, Perfil } from "@/lib/types";

export const metadata: Metadata = {
  title: "Administración de Cuentas y Niveles",
};

interface PerfilConNivelData extends Perfil {
  nivel?: { id: string; nombre: string } | null;
}

interface NivelConConteo extends Nivel {
  total_parvulos?: number;
}

export default async function PaginaAdmin() {
  const sesion = await obtenerSesion();

  // Solo accesible para usuarios con rol 'admin'
  if (sesion.tipo !== "ok" || sesion.perfil.rol !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // 1. Cargar todos los perfiles de usuario
  const { data: usuariosRaw } = await supabase
    .from("perfiles")
    .select(`
      id,
      nombre_completo,
      email,
      rol,
      nivel_id,
      nivel:niveles(id, nombre)
    `)
    .order("nombre_completo");

  // Cargar asignaciones de educadoras_niveles
  const asignacionesMap = new Map<string, { id: string; nombre: string }[]>();
  try {
    const { data: asignacionesRaw } = await supabase
      .from("educadoras_niveles")
      .select("educadora_id, nivel:niveles(id, nombre)");

    asignacionesRaw?.forEach((item: any) => {
      const eId = item?.educadora_id;
      const n = item?.nivel;
      if (eId && n && typeof n.id === "string") {
        const lista = asignacionesMap.get(eId) ?? [];
        if (!lista.some((existente) => existente.id === n.id)) {
          lista.push({ id: n.id, nombre: n.nombre });
        }
        asignacionesMap.set(eId, lista);
      }
    });
  } catch {
    // Respaldo silencioso si la migración de múltiples niveles aún no se corre
  }

  const usuarios: PerfilConNivelData[] = ((usuariosRaw as unknown as PerfilConNivelData[]) ?? []).map((u) => {
    const listaNiveles: { id: string; nombre: string }[] = [];
    if (u.nivel) {
      listaNiveles.push(u.nivel);
    }
    const extras = asignacionesMap.get(u.id) ?? [];
    extras.forEach((ex) => {
      if (!listaNiveles.some((l) => l.id === ex.id)) {
        listaNiveles.push(ex);
      }
    });

    return {
      ...u,
      niveles: listaNiveles,
      niveles_ids: listaNiveles.map((n) => n.id),
    };
  });

  // 2. Cargar todos los niveles con conteo de párvulos
  const { data: nivelesRaw } = await supabase
    .from("niveles")
    .select("id, nombre, descripcion")
    .order("nombre");

  const nivelesBase = (nivelesRaw as Nivel[]) ?? [];

  // Conteo de párvulos por nivel
  const nivelesConConteo: NivelConConteo[] = await Promise.all(
    nivelesBase.map(async (n) => {
      const { count } = await supabase
        .from("parvulos")
        .select("*", { count: "exact", head: true })
        .eq("nivel_id", n.id)
        .eq("activo", true);
      return {
        ...n,
        total_parvulos: count ?? 0,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta flex items-center gap-2">
            <ShieldCheck className="size-8 text-sol-500" />
            Administración del Sistema
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Gestión exclusiva de credenciales, contraseñas de educadoras, permisos y niveles del jardín.
          </p>
        </div>
      </div>

      {/* Panel interactivo */}
      <PanelAdministrador
        usuarios={usuarios}
        niveles={nivelesConConteo}
        usuarioActualId={sesion.perfil.id}
      />
    </div>
  );
}

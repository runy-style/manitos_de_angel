import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DatabaseZap, LogOut, UserX } from "lucide-react";
import { obtenerSesion } from "@/lib/sesion";
import { cerrarSesion } from "@/app/actions/auth";
import AvisoPanel from "@/components/dashboard/AvisoPanel";
import MenuLateral from "@/components/dashboard/MenuLateral";
import { PerfilProvider } from "@/components/dashboard/PerfilProvider";

export const metadata: Metadata = {
  title: "Panel interno",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const sesion = await obtenerSesion();

  if (sesion.tipo === "sin-configurar") {
    return (
      <AvisoPanel icono={DatabaseZap} titulo="Conecta el sistema a Supabase">
        <p>Para usar el panel interno falta configurar la base de datos:</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Ejecuta el script SQL de la Parte 1 y luego <code className="font-bold">supabase/politicas_rls.sql</code>.</li>
          <li>
            Copia la <b>Project URL</b> y la <b>anon key</b> (Supabase → Project Settings → API) en{" "}
            <code className="font-bold">.env.local</code>.
          </li>
          <li>Reinicia el servidor de desarrollo (<code className="font-bold">npm run dev</code>).</li>
        </ol>
      </AvisoPanel>
    );
  }

  if (sesion.tipo === "sin-sesion") {
    redirect("/?acceso=requerido#acceso");
  }

  if (sesion.tipo === "sin-perfil") {
    return (
      <AvisoPanel
        icono={UserX}
        titulo="Tu cuenta aún no tiene perfil"
        acciones={
          <form action={cerrarSesion}>
            <button type="submit" className="boton-primario">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        }
      >
        <p>
          Iniciaste sesión como <b className="text-tinta">{sesion.email}</b>, pero la dirección todavía no
          te asignó un rol ni un nivel en la tabla <code className="font-bold">perfiles</code>.
        </p>
        <p className="text-sm">Pide a la administración del jardín que complete tu perfil.</p>
      </AvisoPanel>
    );
  }

  return (
    <PerfilProvider perfil={sesion.perfil}>
      <div className="relative isolate flex min-h-screen flex-col bg-linear-to-br from-cielo-50 via-crema to-menta-50 lg:flex-row">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute right-0 top-0 size-[30rem] rounded-full bg-sol-100/60 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 size-[26rem] rounded-full bg-cielo-100/70 blur-3xl" />
        </div>
        <MenuLateral />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">{children}</div>
      </div>
    </PerfilProvider>
  );
}

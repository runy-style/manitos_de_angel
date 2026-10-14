import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/** Pantalla de aviso a pantalla completa (configuración pendiente, perfil faltante, etc.). */
export default function AvisoPanel({
  icono: Icono,
  titulo,
  children,
  acciones,
}: {
  icono: LucideIcon;
  titulo: string;
  children: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <main className="relative isolate grid flex-1 place-items-center overflow-hidden px-5 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 size-96 rounded-full bg-cielo-200/50 blur-3xl" />
        <div className="absolute -right-24 bottom-10 size-96 rounded-full bg-sol-200/50 blur-3xl" />
      </div>
      <section className="tarjeta-vidrio w-full max-w-xl p-8 text-center animate-aparecer">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-sol-100 text-sol-600">
          <Icono className="size-8" />
        </span>
        <h1 className="text-2xl font-semibold sm:text-3xl">{titulo}</h1>
        <div className="mt-3 space-y-3 text-left text-tinta-suave">{children}</div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {acciones}
          <Link href="/" className="boton-suave">
            <ArrowLeft className="size-4" /> Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}

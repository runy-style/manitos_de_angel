"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import type { Nivel } from "@/lib/types";

interface Props {
  niveles: Nivel[];
  nivelSeleccionadoId: string;
  rutaBase?: string;
}

export default function SelectorNivel({
  niveles,
  nivelSeleccionadoId,
  rutaBase,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = rutaBase || pathname;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-tinta-suave mr-1">
        <Layers className="size-4 text-cielo-500" />
        Nivel:
      </span>
      {niveles.map((n) => {
        const activo = n.id === nivelSeleccionadoId;
        const params = new URLSearchParams(searchParams.toString());
        params.set("nivel", n.id);

        return (
          <Link
            key={n.id}
            href={`${base}?${params.toString()}`}
            className={`rounded-2xl px-4 py-2 text-sm font-bold transition duration-200 ${
              activo
                ? "bg-linear-to-r from-cielo-500 to-cielo-400 text-white shadow-suave"
                : "border border-cielo-100 bg-white/80 text-tinta hover:border-cielo-300 hover:bg-cielo-50"
            }`}
          >
            {n.nombre}
          </Link>
        );
      })}
    </div>
  );
}

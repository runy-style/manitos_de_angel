"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

interface Props {
  mesSeleccionado: number;
  anioSeleccionado: number;
}

const MESES = [
  { num: 1, nombre: "Enero" },
  { num: 2, nombre: "Febrero" },
  { num: 3, nombre: "Marzo" },
  { num: 4, nombre: "Abril" },
  { num: 5, nombre: "Mayo" },
  { num: 6, nombre: "Junio" },
  { num: 7, nombre: "Julio" },
  { num: 8, nombre: "Agosto" },
  { num: 9, nombre: "Septiembre" },
  { num: 10, nombre: "Octubre" },
  { num: 11, nombre: "Noviembre" },
  { num: 12, nombre: "Diciembre" },
];

export default function FiltroMesAnio({ mesSeleccionado, anioSeleccionado }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const anioActual = new Date().getFullYear();
  const anios = [anioActual - 2, anioActual - 1, anioActual, anioActual + 1];

  function actualizarFiltro(nuevoMes: number, nuevoAnio: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", String(nuevoMes));
    params.set("anio", String(nuevoAnio));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-2xl border border-cielo-100 bg-white p-1.5 shadow-xs">
        <Calendar className="size-4 text-cielo-500 ml-2" />

        {/* Selector de Mes */}
        <select
          value={mesSeleccionado}
          onChange={(e) => actualizarFiltro(Number(e.target.value), anioSeleccionado)}
          className="cursor-pointer border-none bg-transparent font-bold text-tinta text-sm outline-none px-2 py-1"
        >
          {MESES.map((m) => (
            <option key={m.num} value={m.num}>
              {m.nombre}
            </option>
          ))}
        </select>

        {/* Selector de Año */}
        <select
          value={anioSeleccionado}
          onChange={(e) => actualizarFiltro(mesSeleccionado, Number(e.target.value))}
          className="cursor-pointer border-none bg-transparent font-bold text-tinta text-sm outline-none px-2 py-1"
        >
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

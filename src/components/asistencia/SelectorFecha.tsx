"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  fechaSeleccionada: string; // formato AAAA-MM-DD
}

export default function SelectorFecha({ fechaSeleccionada }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiarFecha(nuevaFecha: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("fecha", nuevaFecha);
    router.push(`${pathname}?${params.toString()}`);
  }

  function desplazarDias(offset: number) {
    const [y, m, d] = fechaSeleccionada.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + offset);
    const nuevaStr = date.toISOString().split("T")[0];
    cambiarFecha(nuevaStr);
  }

  const hoyStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const esHoy = fechaSeleccionada === hoyStr;

  // Formato legible en español
  const [y, m, d] = fechaSeleccionada.split("-").map(Number);
  const fechaObj = new Date(y, m - 1, d, 12, 0, 0);
  const fechaFormateada = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fechaObj);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-2xl border border-cielo-100 bg-white p-1 shadow-xs">
        <button
          type="button"
          onClick={() => desplazarDias(-1)}
          className="grid size-9 place-items-center rounded-xl text-tinta-suave hover:bg-cielo-50 hover:text-cielo-600 transition"
          aria-label="Día anterior"
          title="Día anterior"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="flex items-center gap-2 px-3">
          <Calendar className="size-4 text-cielo-500" />
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => e.target.value && cambiarFecha(e.target.value)}
            className="cursor-pointer border-none bg-transparent font-bold text-tinta text-sm outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => desplazarDias(1)}
          className="grid size-9 place-items-center rounded-xl text-tinta-suave hover:bg-cielo-50 hover:text-cielo-600 transition"
          aria-label="Día siguiente"
          title="Día siguiente"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {!esHoy && (
        <button
          type="button"
          onClick={() => cambiarFecha(hoyStr)}
          className="boton-suave text-xs py-2 px-3 font-bold"
        >
          Ir a hoy
        </button>
      )}

      <span className="text-xs font-semibold text-tinta-suave capitalize hidden md:inline-block">
        ({fechaFormateada})
      </span>
    </div>
  );
}

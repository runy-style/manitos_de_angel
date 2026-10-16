"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Calendar,
  ChevronRight,
  Heart,
  Megaphone,
  Newspaper,
  Sparkles,
  X,
} from "lucide-react";
import type { Publicacion } from "@/lib/types";

interface Props {
  publicaciones: Publicacion[];
}

export default function SeccionNoticiasPublicas({ publicaciones }: Props) {
  const [noticiaSeleccionada, setNoticiaSeleccionada] = useState<Publicacion | null>(null);

  if (!publicaciones || publicaciones.length === 0) {
    return null;
  }

  function formatearFecha(fechaIso: string): string {
    try {
      const fecha = new Date(fechaIso);
      return fecha.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return fechaIso;
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
      {/* Encabezado de la sección */}
      <div className="mb-10 text-center animate-aparecer">
        <span className="insignia mb-3 bg-sol-100 text-sol-800 shadow-xs">
          <Sparkles className="size-3.5 text-sol-600" /> Novedades y Mural Escolar
        </span>
        <h2 className="text-3xl font-semibold text-tinta sm:text-4xl">
          Noticias de Nuestro Jardín
        </h2>
        <p className="mt-2 text-tinta-suave max-w-xl mx-auto text-sm sm:text-base">
          Conoce las actividades, eventos, celebraciones y comunicados destacados que compartimos con nuestras familias.
        </p>
      </div>

      {/* Grid responsivo de tarjetas */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {publicaciones.map((pub) => {
          const tieneImagen = Boolean(pub.imagen_url);

          return (
            <article
              key={pub.id}
              onClick={() => setNoticiaSeleccionada(pub)}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-suave backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-flotante cursor-pointer"
            >
              <div>
                {/* Cabecera visual de la tarjeta */}
                {tieneImagen ? (
                  <div className="relative aspect-video w-full overflow-hidden bg-cielo-100/50">
                    <Image
                      src={pub.imagen_url!}
                      alt={pub.titulo}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    <span className="absolute bottom-3 left-3 rounded-xl bg-white/90 px-2.5 py-1 text-[0.7rem] font-bold text-tinta shadow-xs backdrop-blur">
                      Fotografía
                    </span>
                  </div>
                ) : (
                  // Maquetación adaptativa cuando NO tiene imagen:
                  // Banner cálido y lúdico con degradado suave e icono infantil
                  <div className="relative flex items-center justify-between bg-linear-to-br from-sol-100 via-cielo-50 to-menta-100 px-6 py-5 border-b border-cielo-100/60">
                    <div className="flex items-center gap-2">
                      <span className="grid size-10 place-items-center rounded-2xl bg-white/90 shadow-xs text-sol-600">
                        <Megaphone className="size-5" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-sol-800">
                        Comunicado
                      </span>
                    </div>
                    <Heart className="size-4 text-coral-400 fill-coral-300/40" />
                  </div>
                )}

                {/* Contenido textual */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-tinta-suave">
                    <Calendar className="size-3.5 text-cielo-500" />
                    <time dateTime={pub.created_at}>{formatearFecha(pub.created_at)}</time>
                  </div>

                  <h3 className="font-display text-lg font-bold text-tinta leading-snug group-hover:text-cielo-600 transition">
                    {pub.titulo}
                  </h3>

                  <p className="text-sm text-tinta-suave line-clamp-3 leading-relaxed whitespace-pre-line">
                    {pub.contenido}
                  </p>
                </div>
              </div>

              {/* Pie de la tarjeta */}
              <div className="flex items-center justify-between border-t border-cielo-50 bg-cielo-50/20 px-6 py-3.5 text-xs font-bold text-cielo-600">
                <span>Leer noticia completa</span>
                <ChevronRight className="size-4 transition group-hover:translate-x-1" />
              </div>
            </article>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* MODAL PARA LEER NOTICIA COMPLETA */}
      {/* ================================================================= */}
      {noticiaSeleccionada && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/50 backdrop-blur-sm animate-aparecer"
          onClick={() => setNoticiaSeleccionada(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/90 bg-white p-6 sm:p-8 shadow-2xl space-y-5 animate-aparecer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setNoticiaSeleccionada(null)}
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-2xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100 hover:text-tinta transition cursor-pointer"
              aria-label="Cerrar ventana"
            >
              <X className="size-5" />
            </button>

            {/* Fotografía en el modal si tiene */}
            {noticiaSeleccionada.imagen_url && (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-cielo-50 shadow-suave">
                <Image
                  src={noticiaSeleccionada.imagen_url}
                  alt={noticiaSeleccionada.titulo}
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            )}

            {/* Cabecera y fecha */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cielo-600">
                <Calendar className="size-4" />
                <span>{formatearFecha(noticiaSeleccionada.created_at)}</span>
                {noticiaSeleccionada.autor?.nombre_completo && (
                  <>
                    <span>•</span>
                    <span className="text-tinta-suave">
                      Publicado por {noticiaSeleccionada.autor.nombre_completo}
                    </span>
                  </>
                )}
              </div>

              <h3 className="font-display text-2xl font-bold text-tinta leading-snug sm:text-3xl">
                {noticiaSeleccionada.titulo}
              </h3>
            </div>

            {/* Texto de la noticia */}
            <div className="text-sm sm:text-base text-tinta leading-relaxed whitespace-pre-line space-y-4 border-t border-cielo-100 pt-4">
              <p>{noticiaSeleccionada.contenido}</p>
            </div>

            <div className="pt-3 border-t border-cielo-50 flex justify-end">
              <button
                type="button"
                onClick={() => setNoticiaSeleccionada(null)}
                className="boton-primario px-5 py-2.5 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

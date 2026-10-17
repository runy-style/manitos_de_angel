"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ListPlus,
  Loader2,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import { importarParvulosEnBloque, parsearLineaParvulo } from "@/app/actions/parvulos";
import { formatearRut } from "@/lib/rut";
import type { Nivel } from "@/lib/types";

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  niveles: Nivel[];
  nivelSeleccionado: Nivel;
}

const LISTA_PREDEFINIDA_MEDIOS = `28159063-4  Baez Bustamante , Matilde Antonela
28198063-7  BRICEÑO ACEVEDO, MATEO IGNACIO
28175505-6  Clavería Oliva, Monserrat Isabel
27884266-5  GALLARDO PIZARRO, AMPARO VICTORIA
27784229-7  NAVIA DELGADO, ROCÍO MEL
28314237-K  OGAZ VIVANCO, JESÚS IGNACIO
27784047-2  PIZARRO ESTAY, SOFÍA EMILIA
28300452-k  PIZARRO TAPIA, MAURA AURORA
27950570-0  PONCE BUSTAMANTE, RENATA AGUSTINA
27874625-9  REYES OSSES, BRUNO IGNACIO
28351534-6  VALDIVIA BUSTAMANTE, PAOLO IGNACIO
28130987-0  Vilches Sanhueza, Catalina Belen`;

export default function ModalCargaMasivaParvulos({
  abierto,
  alCerrar,
  niveles,
  nivelSeleccionado,
}: Props) {
  const [nivelId, setNivelId] = useState(nivelSeleccionado.id);
  const [texto, setTexto] = useState(LISTA_PREDEFINIDA_MEDIOS);
  const [isPending, startTransition] = useTransition();
  const [mensajeResultado, setMensajeResultado] = useState<{
    tipo: "exito" | "error";
    texto: string;
    fallidos?: { linea: string; motivo: string }[];
  } | null>(null);

  // Parsear en tiempo real para mostrar vista previa
  const vistaPrevia = useMemo(() => {
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    return lineas.map((linea) => {
      const res = parsearLineaParvulo(linea);
      return {
        lineaOriginal: linea,
        valido: res.ok,
        dato: res.ok ? res.dato : null,
        error: !res.ok ? res.error : null,
      };
    });
  }, [texto]);

  const totalValidos = vistaPrevia.filter((v) => v.valido).length;
  const totalInvalidos = vistaPrevia.filter((v) => !v.valido).length;

  if (!abierto) return null;

  function manejarImportar() {
    if (totalValidos === 0) return;

    startTransition(async () => {
      setMensajeResultado(null);
      const res = await importarParvulosEnBloque(nivelId, texto);

      if (res.ok) {
        setMensajeResultado({
          tipo: "exito",
          texto: `¡Excelente! Se han importado exitosamente ${res.insertados} párvulos al nivel seleccionado.`,
          fallidos: res.fallidos,
        });
      } else {
        setMensajeResultado({
          tipo: "error",
          texto: res.error || "Ocurrió un error al procesar la nómina.",
          fallidos: res.fallidos,
        });
      }
    });
  }

  function cargarListaMedios() {
    setTexto(LISTA_PREDEFINIDA_MEDIOS);
    setMensajeResultado(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-xs animate-aparecer">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-cielo-100 overflow-hidden">
        {/* Cabecera del Modal */}
        <header className="flex items-center justify-between border-b border-cielo-100 bg-cielo-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-cielo-500 text-white shadow-sm">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-tinta">Carga en Bloque de Párvulos</h2>
              <p className="text-xs text-tinta-suave">
                Importa listas completas desde texto, Excel o nóminas escolares
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-tinta-suave hover:bg-white hover:text-tinta transition"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Selector de Nivel */}
          <div>
            <label className="etiqueta flex items-center justify-between">
              <span>Nivel al que se asignarán los alumnos:</span>
              <button
                type="button"
                onClick={cargarListaMedios}
                className="text-xs font-semibold text-cielo-600 hover:text-cielo-700 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="size-3" /> Restaurar nómina de 12 párvulos
              </button>
            </label>
            <select
              value={nivelId}
              onChange={(e) => setNivelId(e.target.value)}
              className="entrada mt-1.5"
            >
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre} {n.descripcion ? `(${n.descripcion})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Área de Texto */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="area-nomina" className="etiqueta">
                Pega aquí la lista de alumnos (un alumno por línea):
              </label>
              <span className="text-xs text-tinta-suave">
                Formato: <code className="bg-cielo-50 px-1 py-0.5 rounded text-cielo-700">RUT Apellidos, Nombres</code>
              </span>
            </div>
            <textarea
              id="area-nomina"
              rows={6}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setMensajeResultado(null);
              }}
              placeholder="Ejemplo:&#10;28159063-4  Baez Bustamante, Matilde Antonela&#10;28198063-7  BRICEÑO ACEVEDO, MATEO IGNACIO"
              className="entrada font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Resultado de la Importación */}
          {mensajeResultado && (
            <div
              className={`p-4 rounded-2xl flex items-start gap-3 text-sm animate-aparecer ${
                mensajeResultado.tipo === "exito"
                  ? "bg-menta-50 text-menta-800 border border-menta-200"
                  : "bg-coral-50 text-coral-800 border border-coral-200"
              }`}
            >
              {mensajeResultado.tipo === "exito" ? (
                <CheckCircle2 className="size-5 shrink-0 text-menta-600 mt-0.5" />
              ) : (
                <AlertCircle className="size-5 shrink-0 text-coral-600 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{mensajeResultado.texto}</p>
                {mensajeResultado.fallidos && mensajeResultado.fallidos.length > 0 && (
                  <div className="text-xs mt-2 space-y-0.5 opacity-90">
                    <p className="font-bold">Líneas con observación:</p>
                    {mensajeResultado.fallidos.map((f, i) => (
                      <p key={i}>
                        • {f.linea}: <i>{f.motivo}</i>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vista previa detectada */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-tinta flex items-center gap-2">
                <Users className="size-4 text-cielo-500" /> Vista Previa Detectada (
                {totalValidos} válidos{totalInvalidos > 0 ? `, ${totalInvalidos} con error` : ""})
              </h3>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-2xl border border-cielo-100 bg-cielo-50/30 text-xs">
              <table className="w-full text-left">
                <thead className="bg-cielo-100/60 text-tinta font-bold text-[0.7rem] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">RUT</th>
                    <th className="py-2 px-3">Apellidos</th>
                    <th className="py-2 px-3">Nombres</th>
                    <th className="py-2 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cielo-100/60 bg-white">
                  {vistaPrevia.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.valido ? "hover:bg-cielo-50/40" : "bg-red-50/50"}
                    >
                      <td className="py-2 px-3 text-tinta-suave font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-medium text-tinta">
                        {item.valido ? formatearRut(item.dato!.rut) : "—"}
                      </td>
                      <td className="py-2 px-3 font-semibold text-tinta">
                        {item.valido ? item.dato!.apellidos : item.lineaOriginal}
                      </td>
                      <td className="py-2 px-3 text-tinta-suave">
                        {item.valido ? item.dato!.nombres : item.error}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.valido ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-menta-100 text-menta-700">
                            Listo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-coral-100 text-coral-700">
                            Inválido
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {vistaPrevia.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-tinta-suave">
                        No hay texto ingresado aún. Pega la nómina de alumnos arriba.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Barra de Acciones inferior */}
        <footer className="flex items-center justify-between border-t border-cielo-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={alCerrar}
            className="boton-suave text-xs px-4 py-2"
          >
            {mensajeResultado?.tipo === "exito" ? "Cerrar" : "Cancelar"}
          </button>

          <button
            type="button"
            onClick={manejarImportar}
            disabled={isPending || totalValidos === 0}
            className="boton-primario text-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Importando párvulos…
              </>
            ) : (
              <>
                <ListPlus className="size-4" /> Importar {totalValidos} Párvulo(s) a la Nómina
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import {
  asegurarCarpetaParvuloDrive,
  subirArchivoParvuloDrive,
  subirDocumentoNivelDrive,
} from "@/lib/drive";

export async function POST(req: NextRequest) {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    return NextResponse.json(
      { ok: false, error: "No autorizado. Inicia sesión para subir archivos." },
      { status: 401 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const accion = body.accion;

      if (accion === "asegurar_carpeta_parvulo") {
        const { rutParvulo, nombreParvulo, nombreNivel } = body;
        const res = await asegurarCarpetaParvuloDrive({
          rutParvulo,
          nombreParvulo,
          nombreNivel,
        });
        return NextResponse.json(res);
      }

      return NextResponse.json({ ok: false, error: "Acción no soportada en JSON." }, { status: 400 });
    }

    // Procesar FormData (archivos binarios)
    const formData = await req.formData();
    const accion = String(formData.get("accion") ?? "");
    const archivo = formData.get("archivo") as File | null;

    if (accion === "subir_archivo_parvulo") {
      const rutParvulo = String(formData.get("rutParvulo") ?? "");
      const nombreParvulo = String(formData.get("nombreParvulo") ?? "");
      const nombreNivel = String(formData.get("nombreNivel") ?? "General");

      if (!archivo || archivo.size === 0) {
        // Solo asegurar/crear carpeta del párvulo
        const res = await asegurarCarpetaParvuloDrive({
          rutParvulo,
          nombreParvulo,
          nombreNivel,
        });
        return NextResponse.json(res);
      }

      const buffer = Buffer.from(await archivo.arrayBuffer());
      const base64Data = buffer.toString("base64");
      const mimeType = archivo.type || "application/octet-stream";
      const nombreArchivo = archivo.name || "archivo";

      const res = await subirArchivoParvuloDrive({
        rutParvulo,
        nombreParvulo,
        nombreNivel,
        nombreArchivo,
        mimeType,
        base64Data,
      });

      return NextResponse.json(res);
    }

    if (accion === "subir_documento_nivel") {
      const nombreNivel = String(formData.get("nombreNivel") ?? "General");
      const tipoDocumento = (formData.get("tipoDocumento") ?? "planificacion_mensual") as
        | "planificacion_mensual"
        | "pauta_evaluacion";

      if (!archivo || archivo.size === 0) {
        return NextResponse.json(
          { ok: false, error: "Debes seleccionar un archivo para subir." },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await archivo.arrayBuffer());
      const base64Data = buffer.toString("base64");
      const mimeType = archivo.type || "application/octet-stream";
      const nombreArchivo = archivo.name || "documento";

      const res = await subirDocumentoNivelDrive({
        nombreNivel,
        tipoDocumento,
        nombreArchivo,
        mimeType,
        base64Data,
      });

      return NextResponse.json(res);
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida." }, { status: 400 });
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido al procesar archivo.";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

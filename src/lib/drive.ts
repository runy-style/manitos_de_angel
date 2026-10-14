/**
 * Servicio cliente para el puente de Google Drive mediante Google Apps Script.
 * Lee la variable GOOGLE_SCRIPT_WEBHOOK_URL y maneja la comunicación con Drive.
 */

export interface RespuestaDriveCarpeta {
  ok: boolean;
  folderId?: string;
  folderUrl?: string;
  error?: string;
}

export interface RespuestaDriveArchivo {
  ok: boolean;
  folderId?: string;
  folderUrl?: string;
  fileId?: string;
  fileUrl?: string;
  error?: string;
}

export function driveConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_SCRIPT_WEBHOOK_URL?.trim());
}

/**
 * Asegura o crea la carpeta individual del párvulo en Google Drive.
 */
export async function asegurarCarpetaParvuloDrive(params: {
  rutParvulo: string;
  nombreParvulo: string;
  nombreNivel: string;
}): Promise<RespuestaDriveCarpeta> {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return {
      ok: false,
      error: "La variable GOOGLE_SCRIPT_WEBHOOK_URL no está configurada.",
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "subir_archivo_parvulo",
        rutParvulo: params.rutParvulo,
        nombreParvulo: params.nombreParvulo,
        nombreNivel: params.nombreNivel,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Error HTTP ${res.status} desde el webhook de Drive.` };
    }

    const data = await res.json();
    return data as RespuestaDriveCarpeta;
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sube un archivo a la carpeta individual del párvulo en Google Drive.
 */
export async function subirArchivoParvuloDrive(params: {
  rutParvulo: string;
  nombreParvulo: string;
  nombreNivel: string;
  nombreArchivo: string;
  mimeType: string;
  base64Data: string;
  subCarpeta?: string;
}): Promise<RespuestaDriveArchivo> {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return {
      ok: false,
      error: "La variable GOOGLE_SCRIPT_WEBHOOK_URL no está configurada.",
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "subir_archivo_parvulo",
        rutParvulo: params.rutParvulo,
        nombreParvulo: params.nombreParvulo,
        nombreNivel: params.nombreNivel,
        nombreArchivo: params.nombreArchivo,
        mimeType: params.mimeType,
        base64Data: params.base64Data,
        subCarpeta: params.subCarpeta,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Error HTTP ${res.status} desde el webhook de Drive.` };
    }

    const data = await res.json();
    return data as RespuestaDriveArchivo;
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sube una Planificación Mensual o Pauta de Evaluación del Nivel a Google Drive.
 */
export async function subirDocumentoNivelDrive(params: {
  nombreNivel: string;
  tipoDocumento: "planificacion_mensual" | "pauta_evaluacion";
  nombreArchivo: string;
  mimeType: string;
  base64Data: string;
}): Promise<RespuestaDriveArchivo> {
  const webhookUrl = process.env.GOOGLE_SCRIPT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return {
      ok: false,
      error: "La variable GOOGLE_SCRIPT_WEBHOOK_URL no está configurada.",
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "subir_documento_nivel",
        nombreNivel: params.nombreNivel,
        tipoDocumento: params.tipoDocumento,
        nombreArchivo: params.nombreArchivo,
        mimeType: params.mimeType,
        base64Data: params.base64Data,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Error HTTP ${res.status} desde el webhook de Drive.` };
    }

    const data = await res.json();
    return data as RespuestaDriveArchivo;
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { obtenerLogoBytes } from "./logo-institucional";

export interface DatosActaEntrevista {
  nombreParvulo: string;
  rutParvulo: string;
  nombreNivel: string;
  nombreApoderado: string;
  nombreEducadora: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  modalidad: string;
  motivo: string;
  asistentes: string;
  puntosTratados: string;
  acuerdosCompromisos: string;
  observaciones?: string;
}

function dividirTextoEnLineas(
  texto: string,
  maxWidth: number,
  font: any,
  fontSize: number,
): string[] {
  const lineas: string[] = [];
  const parrafos = (texto || "").split("\n");

  for (const parrafo of parrafos) {
    if (!parrafo.trim()) {
      lineas.push("");
      continue;
    }

    const palabras = parrafo.split(" ");
    let lineaActual = "";

    for (const palabra of palabras) {
      const intento = lineaActual ? `${lineaActual} ${palabra}` : palabra;
      const width = font.widthOfTextAtSize(intento, fontSize);

      if (width <= maxWidth) {
        lineaActual = intento;
      } else {
        if (lineaActual) lineas.push(lineaActual);
        lineaActual = palabra;
      }
    }

    if (lineaActual) {
      lineas.push(lineaActual);
    }
  }

  return lineas;
}

export async function generarPdfActaEntrevistaBytes(
  datos: DatosActaEntrevista,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]); // A4 (ancho x alto en puntos)
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const azulPrincipal = rgb(0.12, 0.44, 0.65); // #1e70a6
  const azulOscuro = rgb(0.08, 0.28, 0.45);
  const azulClaro = rgb(0.94, 0.97, 1.0); // #f0f7fd
  const grisTexto = rgb(0.2, 0.2, 0.2);
  const grisBorde = rgb(0.8, 0.85, 0.9);

  let y = height - 45;

  // Intentar incrustar el logo oficial del jardín
  let logoPdfImage = null;
  try {
    const bytesLogo = obtenerLogoBytes();
    if (bytesLogo && bytesLogo.length > 0) {
      logoPdfImage = await doc.embedJpg(bytesLogo);
    }
  } catch (err) {
    console.warn("No se pudo cargar el logo oficial para el PDF del acta:", err);
  }

  // 1. Encabezado institucional con diseño oficial
  const headerHeight = 74;
  page.drawRectangle({
    x: 40,
    y: y - headerHeight,
    width: width - 80,
    height: headerHeight,
    color: azulClaro,
    borderColor: grisBorde,
    borderWidth: 1,
  });

  // Si el logo está presente, dibujarlo en el costado izquierdo con fondo blanco circular/limpio
  let textoInicioX = 55;
  if (logoPdfImage) {
    const logoSize = 60;
    const logoX = 48;
    const logoY = y - headerHeight + 7;

    // Fondo blanco del logo
    page.drawRectangle({
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.88, 0.92, 0.96),
      borderWidth: 1,
    });

    page.drawImage(logoPdfImage, {
      x: logoX + 1,
      y: logoY + 1,
      width: logoSize - 2,
      height: logoSize - 2,
    });

    textoInicioX = 118;
  }

  page.drawText("JARDÍN INFANTIL Y SALA CUNA", {
    x: textoInicioX,
    y: y - 18,
    size: 8.5,
    font: fontBold,
    color: azulPrincipal,
  });

  page.drawText("MANITOS DE ÁNGEL", {
    x: textoInicioX,
    y: y - 32,
    size: 13.5,
    font: fontBold,
    color: azulOscuro,
  });

  page.drawText("ACTA OFICIAL DE ENTREVISTA CON APODERADO", {
    x: textoInicioX,
    y: y - 48,
    size: 10,
    font: fontBold,
    color: rgb(0.25, 0.25, 0.25),
  });

  page.drawText(
    `Fecha: ${datos.fecha}   |   Hora: ${datos.hora} hrs   |   Modalidad: ${datos.modalidad.toUpperCase()}`,
    {
      x: textoInicioX,
      y: y - 62,
      size: 8,
      font: fontRegular,
      color: rgb(0.42, 0.42, 0.42),
    },
  );

  // Insignia / sello de documento oficial a la derecha
  page.drawRectangle({
    x: width - 150,
    y: y - 32,
    width: 95,
    height: 18,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.75, 0.83, 0.9),
    borderWidth: 1,
  });
  page.drawText("FOLIO OFICIAL", {
    x: width - 136,
    y: y - 25,
    size: 7,
    font: fontBold,
    color: azulPrincipal,
  });

  y -= headerHeight + 20;

  // 2. Tarjeta Identificación del Párvulo
  const datosParvulo = [
    `Párvulo: ${datos.nombreParvulo}`,
    `RUT: ${datos.rutParvulo}`,
    `Nivel: ${datos.nombreNivel}`,
    `Apoderado Asistente: ${datos.nombreApoderado || "No especificado"}`,
    `Educadora a Cargo: ${datos.nombreEducadora}`,
    `Otros Asistentes: ${datos.asistentes || "Educadora y Apoderado"}`,
  ];

  page.drawText("I. ANTECEDENTES DE LA REUNIÓN", {
    x: 40,
    y,
    size: 10,
    font: fontBold,
    color: azulPrincipal,
  });
  y -= 14;

  for (const item of datosParvulo) {
    page.drawText(`• ${item}`, {
      x: 50,
      y,
      size: 9,
      font: fontRegular,
      color: grisTexto,
    });
    y -= 13;
  }

  y -= 8;

  // 3. Motivo
  page.drawText("II. MOTIVO DE LA ENTREVISTA", {
    x: 40,
    y,
    size: 10,
    font: fontBold,
    color: azulPrincipal,
  });
  y -= 14;

  const lineasMotivo = dividirTextoEnLineas(datos.motivo, width - 100, fontRegular, 9);
  for (const linea of lineasMotivo) {
    page.drawText(linea, { x: 50, y, size: 9, font: fontRegular, color: grisTexto });
    y -= 12;
  }

  y -= 10;

  // 4. Puntos Tratados
  page.drawText("III. TEMAS Y PUNTOS TRATADOS", {
    x: 40,
    y,
    size: 10,
    font: fontBold,
    color: azulPrincipal,
  });
  y -= 14;

  const lineasPuntos = dividirTextoEnLineas(datos.puntosTratados, width - 100, fontRegular, 9);
  for (const linea of lineasPuntos) {
    if (y < 120) {
      page = doc.addPage([595.28, 841.89]);
      y = height - 50;
    }
    page.drawText(linea, { x: 50, y, size: 9, font: fontRegular, color: grisTexto });
    y -= 12;
  }

  y -= 10;

  // 5. Acuerdos y Compromisos
  if (y < 160) {
    page = doc.addPage([595.28, 841.89]);
    y = height - 50;
  }

  page.drawText("IV. ACUERDOS Y COMPROMISOS ADQUIRIDOS", {
    x: 40,
    y,
    size: 10,
    font: fontBold,
    color: azulPrincipal,
  });
  y -= 14;

  const lineasAcuerdos = dividirTextoEnLineas(
    datos.acuerdosCompromisos,
    width - 100,
    fontRegular,
    9,
  );
  for (const linea of lineasAcuerdos) {
    if (y < 120) {
      page = doc.addPage([595.28, 841.89]);
      y = height - 50;
    }
    page.drawText(linea, { x: 50, y, size: 9, font: fontRegular, color: grisTexto });
    y -= 12;
  }

  // 6. Observaciones adicionales si las hay
  if (datos.observaciones?.trim()) {
    y -= 10;
    if (y < 120) {
      page = doc.addPage([595.28, 841.89]);
      y = height - 50;
    }

    page.drawText("V. OBSERVACIONES GENERALES", {
      x: 40,
      y,
      size: 10,
      font: fontBold,
      color: azulPrincipal,
    });
    y -= 14;

    const lineasObs = dividirTextoEnLineas(datos.observaciones, width - 100, fontRegular, 9);
    for (const linea of lineasObs) {
      if (y < 100) {
        page = doc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      page.drawText(linea, { x: 50, y, size: 9, font: fontRegular, color: grisTexto });
      y -= 12;
    }
  }

  // 7. Área de firmas al final
  if (y < 130) {
    page = doc.addPage([595.28, 841.89]);
    y = height - 70;
  } else {
    y -= 30;
  }

  // Línea firma educadora
  page.drawLine({
    start: { x: 70, y },
    end: { x: 250, y },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText("Firma y Timbre Educadora", {
    x: 85,
    y: y - 13,
    size: 8,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText(datos.nombreEducadora, {
    x: 85,
    y: y - 24,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Línea firma apoderado
  page.drawLine({
    start: { x: 340, y },
    end: { x: 520, y },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText("Firma del Apoderado / Tutor", {
    x: 355,
    y: y - 13,
    size: 8,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText(datos.nombreApoderado || datos.nombreParvulo, {
    x: 355,
    y: y - 24,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Pie de página
  page.drawText(
    "Acta generada por la Plataforma Digital · Jardín Infantil y Sala Cuna Manitos de Ángel · Registro oficial en Google Drive",
    {
      x: 75,
      y: 25,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  return await doc.save();
}

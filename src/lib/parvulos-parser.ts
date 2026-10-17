import { normalizarRut, validarRut } from "./rut";

export interface DetalleParvuloParseado {
  rut: string;
  nombres: string;
  apellidos: string;
}

export function capitalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function parsearLineaParvulo(
  linea: string,
): { ok: true; dato: DetalleParvuloParseado } | { ok: false; error: string } {
  const l = linea.trim();
  if (!l) return { ok: false, error: "Línea vacía" };

  const matchRut = l.match(/(\d{1,3}\.?\d{3}\.?\d{3}-?[0-9kK])/i);
  if (!matchRut) {
    return { ok: false, error: "No se encontró un RUT chileno en la línea" };
  }

  const rutEncontrado = matchRut[1];
  if (!validarRut(rutEncontrado)) {
    return {
      ok: false,
      error: `El RUT ${rutEncontrado} no es válido según el algoritmo chileno (Módulo 11)`,
    };
  }

  const rutNormalizado = normalizarRut(rutEncontrado);
  const resto = l.replace(matchRut[0], "").trim();

  let apellidos = "";
  let nombres = "";

  if (resto.includes(",")) {
    const [p1, ...p2] = resto.split(",");
    apellidos = capitalizarTexto(p1.trim());
    nombres = capitalizarTexto(p2.join(" ").trim());
  } else if (resto.includes(";")) {
    const [p1, ...p2] = resto.split(";");
    apellidos = capitalizarTexto(p1.trim());
    nombres = capitalizarTexto(p2.join(" ").trim());
  } else if (resto.includes("\t")) {
    const partes = resto.split("\t").filter(Boolean);
    if (partes.length >= 2) {
      apellidos = capitalizarTexto(partes[0].trim());
      nombres = capitalizarTexto(partes.slice(1).join(" ").trim());
    } else {
      const palabras = resto.split(/\s+/).filter(Boolean);
      apellidos = capitalizarTexto(palabras.slice(0, 2).join(" "));
      nombres = capitalizarTexto(palabras.slice(2).join(" "));
    }
  } else {
    const palabras = resto.split(/\s+/).filter(Boolean);
    if (palabras.length >= 4) {
      apellidos = capitalizarTexto(palabras.slice(0, 2).join(" "));
      nombres = capitalizarTexto(palabras.slice(2).join(" "));
    } else if (palabras.length === 3) {
      apellidos = capitalizarTexto(palabras.slice(0, 2).join(" "));
      nombres = capitalizarTexto(palabras[2]);
    } else if (palabras.length === 2) {
      apellidos = capitalizarTexto(palabras[0]);
      nombres = capitalizarTexto(palabras[1]);
    } else {
      nombres = capitalizarTexto(resto);
      apellidos = "Por Definir";
    }
  }

  if (!nombres) {
    return { ok: false, error: "No se pudieron identificar los nombres del alumno" };
  }

  return {
    ok: true,
    dato: {
      rut: rutNormalizado,
      nombres,
      apellidos: apellidos || "Por Definir",
    },
  };
}

/**
 * Utilidades para RUT chileno.
 * - limpiarRut: quita puntos, guiones y espacios, y pasa a mayúsculas ("24.123.456-k" -> "24123456K").
 * - formatearRut: aplica el formato visual XX.XXX.XXX-X mientras se escribe.
 * - normalizarRut: formato de almacenamiento en BD, sin puntos y con guion ("24123456-K").
 * - validarRut: verifica el dígito verificador con el algoritmo módulo 11.
 */

export function limpiarRut(valor: string): string {
  return valor.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

export function validarRut(valor: string): boolean {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  if (cuerpo.length < 7 || cuerpo.length > 9) return false;
  return calcularDv(cuerpo) === dv;
}

export function formatearRut(valor: string): string {
  // La K solo es válida como último carácter (dígito verificador).
  let limpio = limpiarRut(valor);
  limpio = limpio.slice(0, -1).replace(/K/g, "") + limpio.slice(-1);
  limpio = limpio.slice(0, 10);
  if (limpio.length <= 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoConPuntos}-${dv}`;
}

export function normalizarRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

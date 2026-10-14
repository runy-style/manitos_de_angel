/**
 * Lectura centralizada de las variables de entorno de Supabase.
 * Permite que la app arranque con valores de ejemplo y muestre un aviso
 * amigable en vez de fallar mientras aún no se configuran las llaves reales.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigurado(): boolean {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("tu-proyecto") &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.startsWith("tu-llave")
  );
}

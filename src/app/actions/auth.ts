"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";

export type EstadoLogin = { error?: string; email?: string } | undefined;

export async function iniciarSesion(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña.", email };
  }

  if (!supabaseConfigurado()) {
    return {
      error:
        "El sistema aún no está conectado a Supabase. Configura las llaves en .env.local.",
      email,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : "No pudimos iniciar sesión. Intenta nuevamente en unos minutos.",
      email,
    };
  }

  redirect("/dashboard");
}

export async function cerrarSesion() {
  if (supabaseConfigurado()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

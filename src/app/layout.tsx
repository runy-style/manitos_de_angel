import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Jardín Infantil Manitos de Ángel",
    template: "%s · Manitos de Ángel",
  },
  description:
    "Plataforma del Jardín Infantil Manitos de Ángel: asistencia, bitácoras de avance, planificaciones y portal de consulta para apoderados.",
  icons: { icon: "/img/logo-manitos.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#8ccbf5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

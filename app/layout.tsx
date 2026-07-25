import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horario Espiritual",
  description: "Cuaderno digital de seguimiento del Horario Espiritual",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

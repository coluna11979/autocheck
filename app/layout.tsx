import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AutoCheck — Diagnóstico com clareza",
  description:
    "Inspeção automotiva, relatório digital e planejamento de manutenção.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

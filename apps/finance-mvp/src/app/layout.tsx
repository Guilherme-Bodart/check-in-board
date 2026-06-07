import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Financeiro MVP",
  description: "Controle financeiro simples por cliente e apartamento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

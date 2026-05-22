import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Check-In Board",
  description: "Painel operacional para reservas, tarefas e sincronizacao iCal.",
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

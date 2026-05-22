import { cssVariables } from "@check-in-board/design-system";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

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
    <html lang="pt-BR" style={cssVariables as CSSProperties}>
      <body>{children}</body>
    </html>
  );
}

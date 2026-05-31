import type { Metadata } from "next";

import { messages } from "../i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: messages.metadata.title,
  description: messages.metadata.description,
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

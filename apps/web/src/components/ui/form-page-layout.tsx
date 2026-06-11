import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Panel } from "./panel";

export function FormPageLayout({
  backHref,
  backLabel = "Voltar",
  children,
  description,
  title,
}: {
  backHref: string;
  backLabel?: string;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <Link
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-text-secondary transition hover:text-primary"
        href={backHref}
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {backLabel}
      </Link>
      <Panel>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
          ) : null}
        </div>
        {children}
      </Panel>
    </div>
  );
}

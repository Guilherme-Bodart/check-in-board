"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  clearStoredSession,
  readStoredSession,
  type Session,
} from "../../lib/session-storage";
import { messages } from "../../i18n";
import { Sidebar } from "./sidebar";

const pageTitles: Record<string, { eyebrow: string; title: string }> = {
  "/apartamentos": messages.shell.routes.apartments,
  "/calendario": messages.shell.routes.calendar,
  "/clientes": messages.shell.routes.clients,
  "/configuracoes": messages.shell.routes.settings,
  "/dashboard": messages.shell.routes.dashboard,
  "/financeiro": messages.shell.routes.finance,
  "/reservas": messages.shell.routes.reservations,
};

export function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedSession = readStoredSession();

    if (!storedSession) {
      router.replace("/login");
      return;
    }

    setSession(storedSession);
    setIsReady(true);
  }, [router]);

  const pageTitle = useMemo(
    () =>
      pageTitles[pathname] ?? {
        eyebrow: messages.shell.fallbackEyebrow,
        title: messages.shell.fallbackTitle,
      },
    [pathname],
  );

  function signOut() {
    clearStoredSession();
    setSession(null);
    router.replace("/login");
  }

  if (!isReady || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm font-medium text-text-secondary shadow-sm">
          {messages.common.loadingEnvironment}
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-background text-text-primary lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar currentPath={pathname} onSignOut={signOut} />
      <section className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {pageTitle.eyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
                {pageTitle.title}
              </h1>
            </div>
            <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary">
              {session.user.email}
            </div>
          </div>
        </header>
        <div className="px-5 py-6 md:px-8 lg:py-8">{children}</div>
      </section>
    </main>
  );
}

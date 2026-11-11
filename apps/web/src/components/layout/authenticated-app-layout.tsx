"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  clearStoredSession,
  readStoredSession,
  type Session,
} from "../../lib/session-storage";
import { messages } from "../../i18n";
import { MobileNavigation } from "./mobile-navigation";
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
    () => {
      const matchingPath = Object.keys(pageTitles)
        .sort((left, right) => right.length - left.length)
        .find((item) => pathname === item || pathname.startsWith(`${item}/`));

      return matchingPath
        ? pageTitles[matchingPath]
        : {
        eyebrow: messages.shell.fallbackEyebrow,
        title: messages.shell.fallbackTitle,
      };
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
    <main className="min-h-screen bg-background text-text-primary lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar currentPath={pathname} onSignOut={signOut} />
      <section className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted md:text-xs">
                {pageTitle.eyebrow}
              </p>
              <h1 className="text-xl font-bold tracking-tight text-text-primary md:text-2xl">
                {pageTitle.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary sm:block">
                {session.user.email}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary sm:hidden">
                {session.user.email.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <div className="px-4 py-5 md:px-8 lg:py-8 pb-28 lg:pb-8">{children}</div>
      </section>
      <MobileNavigation
        currentPath={pathname}
        onSignOut={signOut}
        userEmail={session.user.email}
      />
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, RefreshCw, UserRound, X } from "lucide-react";

import { abortNavigationRequests, apiRequest, type AuthRole } from "../../api";
import { clearMeCache, fetchMe } from "../../features/auth/auth-api";
import {
  clearStoredSession,
  readStoredSession,
  type Session,
} from "../../lib/session-storage";
import { messages } from "../../i18n";
import { MobileNavigation } from "./mobile-navigation";
import { Sidebar } from "./sidebar";

const LAST_AUTO_SYNC_KEY = "cib-last-auto-sync-at";
const READ_SYNC_NOTIFICATIONS_KEY = "cib-read-sync-notifications";
const AUTO_SYNC_INTERVAL_MS = 3600_000;

let autoSyncInFlight = false;

type AutoSyncApiResponse = {
  sourcesChecked: number;
  sourcesSynced: number;
  notableRuns: Array<{
    id: string;
    status: string;
    reservationsCreated: number;
    reservationsCancelled: number;
  }>;
};

type SyncNotificationsListResponse = {
  notifications: Array<{ id: string }>;
};

function readReadNotificationIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(READ_SYNC_NOTIFICATIONS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

const pageTitles: Record<string, { eyebrow: string; title: string }> = {
  "/apartamentos": messages.shell.routes.apartments,
  "/calendario": messages.shell.routes.calendar,
  "/clientes": messages.shell.routes.clients,
  "/configuracoes": messages.shell.routes.settings,
  "/dashboard": messages.shell.routes.dashboard,
  "/financeiro": messages.shell.routes.finance,
  "/notificacoes": messages.shell.routes.notifications,
  "/reservas": messages.shell.routes.reservations,
};

export function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AuthRole | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [notificationIds, setNotificationIds] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAutoSyncBanner, setShowAutoSyncBanner] = useState(false);

  const recomputeUnreadCount = useCallback((ids: string[]) => {
    const readIds = readReadNotificationIds();
    const unread = ids.filter((id) => !readIds.has(id)).length;
    setUnreadCount(unread);
  }, []);

  useEffect(
    () => () => {
      abortNavigationRequests();
    },
    [pathname],
  );

  useEffect(() => {
    const storedSession = readStoredSession();

    if (!storedSession) {
      router.replace("/login");
      return;
    }

    setSession(storedSession);
    setIsReady(true);
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const token = session.token;

    function triggerBackgroundAutoSync() {
      if (autoSyncInFlight) {
        return;
      }

      const lastSyncRaw = window.localStorage.getItem(LAST_AUTO_SYNC_KEY);
      const lastSyncAt = lastSyncRaw ? Number(lastSyncRaw) : NaN;
      const isDue =
        !lastSyncRaw ||
        Number.isNaN(lastSyncAt) ||
        Date.now() - lastSyncAt >= AUTO_SYNC_INTERVAL_MS;

      if (!isDue) {
        return;
      }

      autoSyncInFlight = true;
      window.localStorage.setItem(LAST_AUTO_SYNC_KEY, String(Date.now()));

      void apiRequest<AutoSyncApiResponse>("/ical-sources/auto-sync", {
        method: "POST",
        token,
        cancelOnNavigate: false,
      })
        .then((autoSyncResult) => {
          if (!cancelled && autoSyncResult.notableRuns?.length > 0) {
            setShowAutoSyncBanner(true);
          }
        })
        .catch(() => {
          // Silent catch so auto-sync failures never break the layout
        })
        .finally(() => {
          autoSyncInFlight = false;
        });
    }

    async function loadRoleAndRunAutoSync() {
      triggerBackgroundAutoSync();

      const [meResult, notifResult] = await Promise.allSettled([
        fetchMe(token),
        apiRequest<SyncNotificationsListResponse>("/notifications/sync", {
          token,
          signal: controller.signal,
          cancelOnNavigate: false,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (meResult.status === "fulfilled") {
        const activeMembership =
          meResult.value.memberships.find((membership) => membership.isActive) ??
          meResult.value.memberships[0];
        setUserRole(activeMembership?.role ?? null);
      }

      if (notifResult.status === "fulfilled") {
        const ids = (notifResult.value.notifications ?? []).map((item) => item.id);
        setNotificationIds(ids);
        recomputeUnreadCount(ids);
      }
    }

    void loadRoleAndRunAutoSync();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [recomputeUnreadCount, session]);

  useEffect(() => {
    if (notificationIds.length > 0) {
      recomputeUnreadCount(notificationIds);
    }
  }, [notificationIds, pathname, recomputeUnreadCount]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === READ_SYNC_NOTIFICATIONS_KEY) {
        recomputeUnreadCount(notificationIds);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [notificationIds, recomputeUnreadCount]);

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
    clearMeCache(session?.token);
    abortNavigationRequests();
    clearStoredSession();
    setSession(null);
    setUserRole(null);
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
    <main className="min-h-screen max-w-full overflow-x-clip bg-background text-text-primary lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar currentPath={pathname} onSignOut={signOut} userRole={userRole} />
      <section className="min-w-0 max-w-full overflow-x-clip">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted md:text-xs">
                {pageTitle.eyebrow}
              </p>
              <h1 className="truncate text-xl font-bold tracking-tight text-text-primary md:text-2xl">
                {pageTitle.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                aria-label={
                  unreadCount > 0
                    ? `Notificações (${unreadCount} não lidas)`
                    : "Notificações"
                }
                className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition hover:border-primary/60 hover:text-primary active:scale-[0.98]"
                href="/notificacoes"
                title="Notificações"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white shadow-2xs">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted/70 px-3 py-1 text-xs font-medium text-text-secondary">
                <UserRound className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <span className="max-w-[120px] sm:max-w-[220px] truncate">
                  {session.user.email}
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className="min-w-0 max-w-full px-4 py-5 md:px-8 lg:py-8 pb-28 lg:pb-8">
          {showAutoSyncBanner ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft/60 px-3.5 py-2.5 text-xs text-text-primary">
              <div className="flex min-w-0 items-center gap-2">
                <RefreshCw aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="min-w-0">
                  <span className="font-medium">
                    Sincronização automática concluída com novidades nas reservas.{" "}
                  </span>
                  <Link
                    className="font-bold text-primary underline-offset-2 hover:underline whitespace-nowrap"
                    href="/notificacoes"
                    onClick={() => setShowAutoSyncBanner(false)}
                  >
                    Ver notificações →
                  </Link>
                </p>
              </div>
              <button
                aria-label="Fechar aviso de sincronização"
                className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-text-secondary transition hover:bg-surface/70 hover:text-text-primary active:scale-[0.98]"
                onClick={() => setShowAutoSyncBanner(false)}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </section>
      <MobileNavigation
        currentPath={pathname}
        onSignOut={signOut}
        userEmail={session.user.email}
        userRole={userRole}
      />
    </main>
  );
}

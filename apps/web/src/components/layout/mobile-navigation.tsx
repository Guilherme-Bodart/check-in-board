"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

import type { AuthRole } from "../../api";
import { messages } from "../../i18n";
import { cn } from "../../lib/utils";

const mainTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Hoje" },
  { href: "/calendario", icon: CalendarDays, label: "Calendário" },
  { href: "/apartamentos", icon: Building2, label: "Imóveis" },
  { href: "/financeiro", icon: CircleDollarSign, label: "Financeiro" },
];

const secondaryNavItems = [
  { href: "/clientes", icon: UsersRound, label: "Clientes / Proprietários" },
  { href: "/reservas", icon: ClipboardList, label: "Todas as Reservas" },
  { href: "/notificacoes", icon: Bell, label: messages.shell.routes.notifications.navLabel },
  { href: "/configuracoes", icon: Settings, label: "Configurações da Conta" },
  { href: "/configuracoes/seguranca", icon: ShieldCheck, label: "Segurança & Acessos" },
];

export function MobileNavigation({
  currentPath,
  userEmail,
  userRole,
  onSignOut,
}: {
  currentPath: string;
  userEmail: string;
  userRole?: AuthRole | null;
  onSignOut: () => void;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const visibleSecondaryNavItems = secondaryNavItems.filter(
    (item) => item.href !== "/clientes" || userRole === "host_admin",
  );

  return (
    <>
      {/* Bottom Bar for Mobile Viewports */}
      <nav
        aria-label="Navegação mobile"
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-border bg-surface/95 px-2 py-1.5 backdrop-blur-md shadow-lg lg:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {mainTabs.map((tab) => {
          const isActive =
            currentPath === tab.href ||
            (tab.href !== "/dashboard" && currentPath.startsWith(`${tab.href}/`));

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors touch-manipulation",
                isActive
                  ? "text-primary font-bold"
                  : "text-text-muted hover:text-text-primary",
              )}
              href={tab.href}
              key={tab.href}
            >
              <div
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-all",
                  isActive ? "bg-primary-soft text-primary" : "text-text-muted",
                )}
              >
                <tab.icon className="h-5 w-5" />
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu Trigger */}
        <button
          aria-label="Abrir menu de opções"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors touch-manipulation",
            isDrawerOpen
              ? "text-primary font-bold"
              : "text-text-muted hover:text-text-primary",
          )}
          onClick={() => setIsDrawerOpen(true)}
          type="button"
        >
          <div
            className={cn(
              "flex h-8 w-12 items-center justify-center rounded-full transition-all",
              isDrawerOpen ? "bg-primary-soft text-primary" : "text-text-muted",
            )}
          >
            <Menu className="h-5 w-5" />
          </div>
          <span className="mt-0.5 text-[10px] tracking-tight">Menu</span>
        </button>
      </nav>

      {/* Drawer Overlay for Mobile */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="flex max-h-[85vh] flex-col rounded-t-3xl border-t border-border bg-surface p-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary font-bold">
                  CB
                </div>
                <div>
                  <strong className="block text-sm font-bold text-text-primary">
                    {messages.common.appName}
                  </strong>
                  <span className="block text-[11px] text-text-muted truncate max-w-[200px]">
                    {userEmail}
                  </span>
                </div>
              </div>

              <button
                aria-label="Fechar menu"
                className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted text-text-secondary transition hover:bg-border"
                onClick={() => setIsDrawerOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Links List */}
            <div className="mt-4 flex flex-col gap-1 overflow-y-auto py-2">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Navegação
              </p>

              {mainTabs.map((tab) => {
                const isActive =
                  currentPath === tab.href ||
                  (tab.href !== "/dashboard" && currentPath.startsWith(`${tab.href}/`));

                return (
                  <Link
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-primary-soft text-primary font-bold"
                        : "text-text-secondary hover:bg-surface-muted",
                    )}
                    href={tab.href}
                    key={tab.href}
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    <tab.icon className="h-5 w-5" />
                    {tab.label}
                  </Link>
                );
              })}

              <p className="mt-4 px-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Gerenciamento & Ajustes
              </p>

              {visibleSecondaryNavItems.map((item) => {
                const isActive =
                  currentPath === item.href || currentPath.startsWith(`${item.href}/`);

                return (
                  <Link
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-primary-soft text-primary font-bold"
                        : "text-text-secondary hover:bg-surface-muted",
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Logout button */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/60 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onSignOut();
                }}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                {messages.common.signOut}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

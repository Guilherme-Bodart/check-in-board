import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  UsersRound,
} from "lucide-react";

import { messages } from "../../i18n";
import { cn } from "../../lib/utils";

const navigationItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: messages.shell.routes.dashboard.navLabel },
  { href: "/apartamentos", icon: Building2, label: messages.shell.routes.apartments.navLabel },
  { href: "/clientes", icon: UsersRound, label: messages.shell.routes.clients.navLabel },
  { href: "/reservas", icon: ClipboardList, label: messages.shell.routes.reservations.navLabel },
  { href: "/calendario", icon: CalendarDays, label: messages.shell.routes.calendar.navLabel },
  { href: "/financeiro", icon: CircleDollarSign, label: messages.shell.routes.finance.navLabel },
  { href: "/configuracoes", icon: Settings, label: messages.shell.routes.settings.navLabel },
];

export function Sidebar({
  currentPath,
  onSignOut,
}: {
  currentPath: string;
  onSignOut: () => void;
}) {
  return (
    <aside
      aria-label={messages.shell.sidebarLabel}
      className="flex min-h-screen flex-col border-r border-border bg-surface px-5 py-6"
    >
      <div className="mb-8">
        <strong className="block text-lg font-semibold tracking-tight text-text-primary">
          {messages.common.appName}
        </strong>
        <span className="mt-1 block text-xs font-medium text-text-muted">
          {messages.shell.operationalManagement}
        </span>
      </div>
      <nav className="grid gap-1">
        {navigationItems.map((item) => (
          <Link
            aria-current={currentPath === item.href ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-primary-soft hover:text-primary",
              currentPath === item.href && "bg-primary-soft text-primary",
            )}
            href={item.href}
            key={item.href}
          >
            <item.icon aria-hidden className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
        onClick={onSignOut}
        type="button"
      >
        <LogOut aria-hidden className="h-4 w-4" />
        {messages.common.signOut}
      </button>
    </aside>
  );
}

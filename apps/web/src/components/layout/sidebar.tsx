const navigationItems = [
  { href: "#board", label: "Board" },
  { href: "#reservas", label: "Reservas" },
  { href: "#tarefas", label: "Tarefas" },
  { href: "#sync", label: "Sync" },
];

export function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <strong className="brand">Check-In Board</strong>
      <nav className="navList">
        {navigationItems.map((item, index) => (
          <a aria-current={index === 0 ? "page" : undefined} href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <button className="ghostButton" onClick={onSignOut} type="button">
        Sair
      </button>
    </aside>
  );
}

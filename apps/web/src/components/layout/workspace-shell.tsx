import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";

export function WorkspaceShell({
  children,
  onSignOut,
}: {
  children: ReactNode;
  onSignOut: () => void;
}) {
  return (
    <main className="appShell">
      <Sidebar onSignOut={onSignOut} />
      <section className="workspace">{children}</section>
    </main>
  );
}

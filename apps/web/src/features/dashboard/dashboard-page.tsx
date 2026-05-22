"use client";

import { AuthPanel } from "../auth/auth-panel";
import { WorkspaceShell } from "../../components/layout/workspace-shell";
import { DashboardContent } from "./components/dashboard-content";
import { useDashboard } from "./use-dashboard";

export function DashboardPage() {
  const {
    actions,
    icalMessage,
    isIcalSaving,
    loadState,
    message,
    session,
    snapshot,
  } = useDashboard();

  if (!session) {
    return <AuthPanel message={message} onSubmit={actions.submitAuth} />;
  }

  return (
    <WorkspaceShell onSignOut={actions.signOut}>
      <DashboardContent
        actions={actions}
        icalMessage={icalMessage}
        isIcalSaving={isIcalSaving}
        loadState={loadState}
        message={message}
        session={session}
        snapshot={snapshot}
      />
    </WorkspaceShell>
  );
}

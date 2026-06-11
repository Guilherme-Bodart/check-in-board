"use client";

import { DashboardContent } from "./components/dashboard-content";
import { useDashboard } from "./use-dashboard";

export function DashboardPage() {
  const {
    actions,
    loadState,
    message,
    session,
    snapshot,
  } = useDashboard();

  if (!session) {
    return null;
  }

  return (
    <DashboardContent
      actions={actions}
      loadState={loadState}
      message={message}
      session={session}
      snapshot={snapshot}
    />
  );
}

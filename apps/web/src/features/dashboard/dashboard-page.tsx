"use client";

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
    return null;
  }

  return (
    <DashboardContent
      actions={actions}
      icalMessage={icalMessage}
      isIcalSaving={isIcalSaving}
      loadState={loadState}
      message={message}
      session={session}
      snapshot={snapshot}
    />
  );
}

"use client";

import { MessageBanner } from "../../../components/ui/message-banner";
import { EmptyState } from "../../../components/ui/empty-state";
import type { Session } from "../../../lib/session-storage";
import { DashboardTopbar } from "./dashboard-topbar";
import { OperationsBoardPanel } from "./operations-board-panel";
import { OperationsMetrics } from "./operations-metrics";
import { ReservationVolumeChart } from "./reservation-volume-chart";
import { TaskListPanel } from "./task-list-panel";
import type { DashboardSnapshot, LoadState } from "../types";
import { Building2 } from "lucide-react";

type DashboardContentActions = {
  markTaskDone: (taskId: string) => Promise<void>;
  refreshWorkspace: () => void;
  setBoardDate: (date: string) => void;
  setSelectedApartmentId: (apartmentId: string) => void;
};

export function DashboardContent({
  actions,
  loadState,
  message,
  session,
  snapshot,
}: {
  actions: DashboardContentActions;
  loadState: LoadState;
  message: string;
  session: Session;
  snapshot: DashboardSnapshot;
}) {
  return (
    <div className="grid gap-6">
      <DashboardTopbar
        apartments={snapshot.apartments}
        boardDate={snapshot.boardDate}
        email={session.user.email}
        onBoardDateChange={actions.setBoardDate}
        onSelectedApartmentChange={actions.setSelectedApartmentId}
        selectedApartmentId={snapshot.selectedApartmentId}
      />

      <MessageBanner isError={loadState === "error"} message={message} />

      {snapshot.apartments.length === 0 ? (
        <EmptyState
          actionHref="/apartamentos/novo"
          actionLabel="Adicionar apartamento"
          description="Cadastre o primeiro apartamento para acompanhar reservas, tarefas e sincronizacoes."
          icon={Building2}
          title="Nenhum apartamento cadastrado"
        />
      ) : null}

      <OperationsMetrics totals={snapshot.totals} />
      <ReservationVolumeChart sections={snapshot.boardSections} />

      <section className="grid gap-6">
        <OperationsBoardPanel
          board={snapshot.board}
          boardDate={snapshot.boardDate}
          boardSections={snapshot.boardSections}
          onRefresh={actions.refreshWorkspace}
          selectedApartment={snapshot.selectedApartment}
          selectedApartmentId={snapshot.selectedApartmentId}
        />
      </section>

      <TaskListPanel onMarkDone={actions.markTaskDone} tasks={snapshot.tasks} />
    </div>
  );
}

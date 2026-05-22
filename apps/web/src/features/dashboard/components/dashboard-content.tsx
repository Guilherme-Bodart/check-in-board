"use client";

import { MessageBanner } from "../../../components/ui/message-banner";
import type { Session } from "../../../lib/session-storage";
import { CreateApartmentPanel } from "./create-apartment-panel";
import { DashboardTopbar } from "./dashboard-topbar";
import { IcalSourcesPanel } from "./ical-sources-panel";
import { OperationsBoardPanel } from "./operations-board-panel";
import { OperationsMetrics } from "./operations-metrics";
import { TaskCreateBand } from "./task-create-band";
import { TaskListPanel } from "./task-list-panel";
import type {
  CreateIcalSourceValues,
  CreateTaskValues,
  DashboardSnapshot,
  LoadState,
} from "../types";

type DashboardContentActions = {
  createApartment: (name: string) => Promise<boolean>;
  createIcalSource: (values: CreateIcalSourceValues) => Promise<boolean>;
  createTask: (values: CreateTaskValues) => Promise<boolean>;
  markTaskDone: (taskId: string) => Promise<void>;
  refreshWorkspace: () => void;
  setBoardDate: (date: string) => void;
  setSelectedApartmentId: (apartmentId: string) => void;
  syncIcalSource: (icalSourceId: string) => Promise<void>;
};

export function DashboardContent({
  actions,
  icalMessage,
  isIcalSaving,
  loadState,
  message,
  session,
  snapshot,
}: {
  actions: DashboardContentActions;
  icalMessage: string;
  isIcalSaving: boolean;
  loadState: LoadState;
  message: string;
  session: Session;
  snapshot: DashboardSnapshot;
}) {
  return (
    <>
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
        <CreateApartmentPanel onCreateApartment={actions.createApartment} />
      ) : null}

      <OperationsMetrics totals={snapshot.totals} />

      <section className="contentGrid boardContentGrid">
        <OperationsBoardPanel
          board={snapshot.board}
          boardDate={snapshot.boardDate}
          boardSections={snapshot.boardSections}
          onRefresh={actions.refreshWorkspace}
          selectedApartment={snapshot.selectedApartment}
          selectedApartmentId={snapshot.selectedApartmentId}
        />

        <IcalSourcesPanel
          icalSources={snapshot.icalSources}
          isSaving={isIcalSaving}
          message={icalMessage}
          onCreateSource={actions.createIcalSource}
          onSyncSource={actions.syncIcalSource}
          selectedApartmentId={snapshot.selectedApartmentId}
        />
      </section>

      <TaskCreateBand onCreateTask={actions.createTask} />
      <TaskListPanel onMarkDone={actions.markTaskDone} tasks={snapshot.tasks} />
    </>
  );
}

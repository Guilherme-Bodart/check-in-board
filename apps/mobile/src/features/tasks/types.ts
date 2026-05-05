export type TaskBoardItem = {
  actionLabel: string;
  apartment: string;
  apartmentId: string;
  assignee: string;
  headline: string;
  id: string;
  kind: "task";
  notes: string;
  status: "pending" | "completed" | "failed" | "overdue";
  taskStatus: "pending" | "done" | "not_done" | "cancelled";
  time: string;
};

export type OperationalTask = {
  apartmentId: string;
  apartmentName: string | null;
  assignedUserId: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  description: string | null;
  dueAt: string;
  id: string;
  reservationId: string | null;
  status: "pending" | "done" | "not_done" | "cancelled";
  title: string;
};

export type TaskFormValues = {
  title: string;
  description: string;
  dueAt: string;
};

export type TaskFieldErrors = Partial<Record<keyof TaskFormValues, string>>;

export type CreateTaskInput = {
  title: string;
  description?: string;
  dueAt: string;
};

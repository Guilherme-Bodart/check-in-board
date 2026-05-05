import type { AuthRole } from "../auth/types.js";

export type TaskStatus = "pending" | "done" | "not_done" | "cancelled";

export type TaskSummary = {
  id: string;
  apartmentId: string;
  apartmentName: string | null;
  reservationId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string;
  completedAt: string | null;
  completedByUserId: string | null;
  assignedUserId: string | null;
};

export type ApartmentTaskAccess = {
  apartmentId: string;
  role: AuthRole;
  canUpdateTaskStatus: boolean;
  canView: boolean;
};

export type CreateTaskInput = {
  apartmentId: string;
  reservationId?: string;
  title: string;
  description?: string;
  dueAt: Date;
};

export type UpdateTaskStatusInput = {
  taskId: string;
  status: Extract<TaskStatus, "done" | "not_done">;
  userId: string;
};

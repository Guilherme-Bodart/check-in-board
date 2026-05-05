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

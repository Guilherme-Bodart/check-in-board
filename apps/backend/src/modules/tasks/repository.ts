import type {
  ApartmentTaskAccess,
  CreateTaskInput,
  TaskSummary,
  UpdateTaskStatusInput,
} from "./types.js";

export interface TasksRepository {
  createTask(input: CreateTaskInput): Promise<TaskSummary>;
  getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentTaskAccess | null>;
  listAccessibleTasksForDate(
    userId: string,
    dueBefore: Date,
    dueAfter: Date,
  ): Promise<TaskSummary[]>;
  listTasks(apartmentId: string): Promise<TaskSummary[]>;
  updateTaskStatus(input: UpdateTaskStatusInput): Promise<TaskSummary>;
  getTaskAccess(
    userId: string,
    taskId: string,
  ): Promise<ApartmentTaskAccess | null>;
}

import { z } from "zod";

const taskStatusSchema = z.enum(["pending", "done", "not_done", "cancelled"]);

export const taskSchema = z.object({
  apartmentId: z.string().min(1),
  apartmentName: z.string().nullable(),
  assignedUserId: z.string().nullable(),
  completedAt: z.string().datetime().nullable(),
  completedByUserId: z.string().nullable(),
  description: z.string().nullable(),
  dueAt: z.string().datetime(),
  id: z.string().min(1),
  reservationId: z.string().nullable(),
  status: taskStatusSchema,
  title: z.string().min(1),
});

export const listTasksResponseSchema = z.object({
  tasks: z.array(taskSchema),
});

export const createTaskRequestSchema = z.object({
  description: z.string().trim().max(500).optional(),
  dueAt: z.string().datetime(),
  reservationId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(160),
});

export const createTaskResponseSchema = z.object({
  task: taskSchema,
});

export const updateTaskStatusRequestSchema = z.object({
  status: z.enum(["done", "not_done"]),
});

export const updateTaskStatusResponseSchema = z.object({
  task: taskSchema,
});

export const todayTasksResponseSchema = z.object({
  boardItems: z.array(
    z.object({
      actionLabel: z.string().min(1),
      apartment: z.string().min(1),
      apartmentId: z.string().min(1),
      assignee: z.string().min(1),
      headline: z.string().min(1),
      id: z.string().min(1),
      kind: z.literal("task"),
      notes: z.string().min(1),
      status: z.enum(["pending", "completed", "failed", "overdue"]),
      taskStatus: z.enum(["pending", "done", "not_done", "cancelled"]),
      time: z.string().min(1),
    }),
  ),
});

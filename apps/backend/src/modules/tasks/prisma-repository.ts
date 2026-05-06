import { Prisma, type PrismaClient } from "@prisma/client";

import type { TasksRepository } from "./repository.js";
import type {
  ApartmentTaskAccess,
  CreateTaskInput,
  TaskSummary,
  UpdateTaskStatusInput,
} from "./types.js";

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapTask(task: {
  apartment?: { name: string } | null;
  apartmentId: string;
  assignedUserId: string | null;
  completedAt: Date | null;
  completedByUserId: string | null;
  description: string | null;
  dueAt: Date;
  id: string;
  reservationId: string | null;
  result?: Prisma.JsonValue | null;
  status: "pending" | "done" | "not_done" | "cancelled";
  title: string;
}): TaskSummary {
  const result =
    task.result && typeof task.result === "object" && !Array.isArray(task.result)
      ? task.result
      : null;

  return {
    apartmentId: task.apartmentId,
    apartmentName: task.apartment?.name ?? null,
    assignedUserId: task.assignedUserId,
    completedAt: toIsoString(task.completedAt),
    completedByUserId: task.completedByUserId,
    description: task.description,
    dueAt: task.dueAt.toISOString(),
    id: task.id,
    reservationId: task.reservationId,
    status: task.status,
    statusNote:
      typeof result?.notDoneReason === "string"
        ? result.notDoneReason
        : null,
    title: task.title,
  };
}

export class PrismaTasksRepository implements TasksRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTask(input: CreateTaskInput): Promise<TaskSummary> {
    const task = await this.prisma.task.create({
      data: {
        apartmentId: input.apartmentId,
        description: input.description,
        dueAt: input.dueAt,
        reservationId: input.reservationId,
        title: input.title,
      },
      include: {
        apartment: true,
      },
    });

    return mapTask(task);
  }

  async getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentTaskAccess | null> {
    const membership = await this.prisma.apartmentMembership.findUnique({
      where: {
        apartmentId_userId: {
          apartmentId,
          userId,
        },
      },
    });

    return membership
      ? {
          apartmentId: membership.apartmentId,
          canUpdateTaskStatus: membership.canUpdateTaskStatus,
          canView: membership.canView,
          role: membership.role,
        }
      : null;
  }

  async getTaskAccess(
    userId: string,
    taskId: string,
  ): Promise<ApartmentTaskAccess | null> {
    const task = await this.prisma.task.findUnique({
      include: {
        apartment: {
          include: {
            memberships: {
              where: {
                userId,
              },
            },
          },
        },
      },
      where: {
        id: taskId,
      },
    });
    const membership = task?.apartment.memberships[0];

    return task && membership
      ? {
          apartmentId: task.apartmentId,
          canUpdateTaskStatus: membership.canUpdateTaskStatus,
          canView: membership.canView,
          role: membership.role,
        }
      : null;
  }

  async listAccessibleTasksForDate(
    userId: string,
    dueBefore: Date,
    dueAfter: Date,
  ): Promise<TaskSummary[]> {
    const tasks = await this.prisma.task.findMany({
      include: {
        apartment: true,
      },
      orderBy: {
        dueAt: "asc",
      },
      where: {
        apartment: {
          memberships: {
            some: {
              canView: true,
              userId,
            },
          },
        },
        dueAt: {
          gte: dueAfter,
          lt: dueBefore,
        },
      },
    });

    return tasks.map(mapTask);
  }

  async listTasks(apartmentId: string): Promise<TaskSummary[]> {
    const tasks = await this.prisma.task.findMany({
      include: {
        apartment: true,
      },
      orderBy: {
        dueAt: "asc",
      },
      where: {
        apartmentId,
      },
    });

    return tasks.map(mapTask);
  }

  async updateTaskStatus(
    input: UpdateTaskStatusInput,
  ): Promise<TaskSummary> {
    const task = await this.prisma.task.update({
      data: {
        completedAt: new Date(),
        completedByUserId: input.userId,
        result:
          input.status === "not_done"
            ? {
                notDoneReason: input.note,
              }
            : Prisma.JsonNull,
        status: input.status,
      },
      include: {
        apartment: true,
      },
      where: {
        id: input.taskId,
      },
    });

    return mapTask(task);
  }
}

import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { parseEnv } from "../../shared/env.js";
import { issueAccessToken } from "../auth/token.js";
import type { AuthUser } from "../auth/types.js";
import type { TasksRepository } from "./repository.js";
import type {
  ApartmentTaskAccess,
  CreateTaskInput,
  TaskSummary,
  UpdateTaskStatusInput,
} from "./types.js";

class InMemoryTasksRepository implements TasksRepository {
  private accessByUserAndApartment = new Map<string, ApartmentTaskAccess>();
  private taskSequence = 1;
  private tasks = new Map<string, TaskSummary>();

  setApartmentAccess(userId: string, access: ApartmentTaskAccess) {
    this.accessByUserAndApartment.set(
      `${userId}:${access.apartmentId}`,
      access,
    );
  }

  async createTask(input: CreateTaskInput): Promise<TaskSummary> {
    const task: TaskSummary = {
      apartmentId: input.apartmentId,
      apartmentName: "Apto 204",
      assignedUserId: null,
      completedAt: null,
      completedByUserId: null,
      description: input.description ?? null,
      dueAt: input.dueAt.toISOString(),
      id: `task-${this.taskSequence++}`,
      reservationId: input.reservationId ?? null,
      status: "pending",
      title: input.title,
    };

    this.tasks.set(task.id, task);

    return task;
  }

  async getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentTaskAccess | null> {
    return this.accessByUserAndApartment.get(`${userId}:${apartmentId}`) ?? null;
  }

  async getTaskAccess(
    userId: string,
    taskId: string,
  ): Promise<ApartmentTaskAccess | null> {
    const task = this.tasks.get(taskId);

    return task ? await this.getApartmentAccess(userId, task.apartmentId) : null;
  }

  async listAccessibleTasksForDate(
    userId: string,
    dueBefore: Date,
    dueAfter: Date,
  ): Promise<TaskSummary[]> {
    return [...this.tasks.values()].filter((task) => {
      const dueAt = new Date(task.dueAt);
      const access = this.accessByUserAndApartment.get(
        `${userId}:${task.apartmentId}`,
      );

      return access?.canView && dueAt >= dueAfter && dueAt < dueBefore;
    });
  }

  async listTasks(apartmentId: string): Promise<TaskSummary[]> {
    return [...this.tasks.values()].filter(
      (task) => task.apartmentId === apartmentId,
    );
  }

  async updateTaskStatus(input: UpdateTaskStatusInput): Promise<TaskSummary> {
    const task = this.tasks.get(input.taskId);

    if (!task) {
      throw new Error("Task not found.");
    }

    const updatedTask: TaskSummary = {
      ...task,
      completedAt: "2026-05-05T12:00:00.000Z",
      completedByUserId: input.userId,
      status: input.status,
    };

    this.tasks.set(updatedTask.id, updatedTask);

    return updatedTask;
  }
}

function buildTestEnv() {
  return parseEnv({
    AUTH_JWT_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
    DATABASE_URL:
      "postgresql://postgres:postgres@localhost:5432/check_in_board_test?schema=public",
    NODE_ENV: "test",
    SERVICE_NAME: "check-in-board-backend",
  });
}

async function createAccessToken(user: AuthUser) {
  return await issueAccessToken(user, buildTestEnv());
}

describe("task routes", () => {
  it("returns 401 without a bearer token", async () => {
    const app = buildApp({
      env: buildTestEnv(),
      tasksRepository: new InMemoryTasksRepository(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/apartments/apartment-1/tasks",
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("lets host admin create a task for an apartment", async () => {
    const repository = new InMemoryTasksRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };

    repository.setApartmentAccess(user.id, {
      apartmentId: "apartment-1",
      canUpdateTaskStatus: true,
      canView: true,
      role: "host_admin",
    });

    const app = buildApp({
      env: buildTestEnv(),
      tasksRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "POST",
      payload: {
        description: "Clean bathroom and replace towels.",
        dueAt: "2026-05-05T14:00:00.000Z",
        title: "Prepare apartment",
      },
      url: "/apartments/apartment-1/tasks",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().task).toMatchObject({
      apartmentId: "apartment-1",
      status: "pending",
      title: "Prepare apartment",
    });

    await app.close();
  });

  it("lets team with task permission mark a task done", async () => {
    const repository = new InMemoryTasksRepository();
    const host: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };
    const team: AuthUser = {
      email: "team@example.com",
      fullName: "Team User",
      id: "user-team",
    };

    repository.setApartmentAccess(host.id, {
      apartmentId: "apartment-1",
      canUpdateTaskStatus: true,
      canView: true,
      role: "host_admin",
    });
    repository.setApartmentAccess(team.id, {
      apartmentId: "apartment-1",
      canUpdateTaskStatus: true,
      canView: true,
      role: "team",
    });

    const task = await repository.createTask({
      apartmentId: "apartment-1",
      dueAt: new Date("2026-05-05T14:00:00.000Z"),
      title: "Prepare apartment",
    });
    const app = buildApp({
      env: buildTestEnv(),
      tasksRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(team)}`,
      },
      method: "PATCH",
      payload: {
        status: "done",
      },
      url: `/tasks/${task.id}/status`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().task).toMatchObject({
      completedByUserId: team.id,
      status: "done",
    });

    await app.close();
  });

  it("returns today task board items for accessible apartments", async () => {
    const repository = new InMemoryTasksRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };

    repository.setApartmentAccess(user.id, {
      apartmentId: "apartment-1",
      canUpdateTaskStatus: true,
      canView: true,
      role: "host_admin",
    });
    await repository.createTask({
      apartmentId: "apartment-1",
      description: "Replace towels.",
      dueAt: new Date("2026-05-05T14:00:00.000Z"),
      title: "Prepare apartment",
    });

    const app = buildApp({
      env: buildTestEnv(),
      tasksRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "GET",
      url: "/tasks/today?date=2026-05-05T12:00:00.000Z",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().boardItems[0]).toMatchObject({
      apartment: "Apto 204",
      headline: "Prepare apartment",
      kind: "task",
      status: "pending",
      taskStatus: "pending",
    });

    await app.close();
  });
});

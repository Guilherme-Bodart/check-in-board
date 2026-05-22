import {
  apiRequest,
  type Apartment,
  type AuthResponse,
  type IcalSource,
  type OperationsBoard,
  type Task,
} from "../../api";
import type {
  AuthFormValues,
  AuthMode,
  CreateIcalSourceValues,
  CreateTaskValues,
  WorkspaceData,
} from "./types";

export async function authenticate(mode: AuthMode, values: AuthFormValues) {
  return apiRequest<AuthResponse>(
    mode === "sign-in" ? "/auth/sign-in" : "/auth/sign-up",
    {
      method: "POST",
      body:
        mode === "sign-in"
          ? { email: values.email, password: values.password }
          : {
              email: values.email,
              fullName: values.fullName,
              organizationName: values.organizationName,
              password: values.password,
            },
    },
  );
}

export async function fetchApartments(token: string) {
  const response = await apiRequest<{ apartments: Apartment[] }>("/apartments", {
    token,
  });

  return response.apartments;
}

export async function fetchWorkspace(
  token: string,
  apartmentId: string,
  date: string,
): Promise<WorkspaceData> {
  const [board, taskResponse, icalResponse] = await Promise.all([
    apiRequest<OperationsBoard>(
      `/apartments/${apartmentId}/operations-board?date=${date}&days=7`,
      { token },
    ),
    apiRequest<{ tasks: Task[] }>(`/apartments/${apartmentId}/tasks`, { token }),
    apiRequest<{ icalSources: IcalSource[] }>(
      `/apartments/${apartmentId}/ical-sources`,
      { token },
    ),
  ]);

  return {
    board,
    tasks: taskResponse.tasks,
    icalSources: icalResponse.icalSources,
  };
}

export async function createApartment(token: string, name: string) {
  const response = await apiRequest<{ apartment: Apartment }>("/apartments", {
    method: "POST",
    token,
    body: {
      name,
      timezone: "America/Sao_Paulo",
    },
  });

  return response.apartment;
}

export async function createTask(
  token: string,
  apartmentId: string,
  values: CreateTaskValues,
) {
  return apiRequest<{ task: Task }>(`/apartments/${apartmentId}/tasks`, {
    method: "POST",
    token,
    body: {
      title: values.title,
      dueAt: new Date(values.dueAt).toISOString(),
    },
  });
}

export async function createIcalSource(
  token: string,
  apartmentId: string,
  values: CreateIcalSourceValues,
) {
  return apiRequest<{ icalSource: IcalSource }>(
    `/apartments/${apartmentId}/ical-sources`,
    {
      method: "POST",
      token,
      body: {
        provider: "airbnb",
        label: values.label || "Airbnb",
        icalUrl: values.url,
      },
    },
  );
}

export async function markTaskDone(token: string, taskId: string) {
  return apiRequest<{ task: Task }>(`/tasks/${taskId}/status`, {
    method: "PATCH",
    token,
    body: { status: "done" },
  });
}

export async function syncIcalSource(token: string, icalSourceId: string) {
  return apiRequest(`/ical-sources/${icalSourceId}/sync`, {
    method: "POST",
    token,
  });
}

import {
  apiRequest,
  type Apartment,
  type IcalSource,
  type OperationsBoard,
  type Task,
} from "../../api";
import type {
  CreateIcalSourceValues,
  CreateTaskValues,
  WorkspaceData,
} from "./types";

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

export async function createApartment(
  token: string,
  values:
    | string
    | {
        name: string;
        timezone?: string;
        ownerId?: string;
      },
) {
  const payload =
    typeof values === "string"
      ? { name: values, timezone: "America/Sao_Paulo" }
      : {
          name: values.name,
          timezone: values.timezone ?? "America/Sao_Paulo",
          ownerId: values.ownerId,
        };

  const response = await apiRequest<{ apartment: Apartment }>("/apartments", {
    method: "POST",
    token,
    body: payload,
  });

  return response.apartment;
}

export async function updateApartment(
  token: string,
  apartmentId: string,
  values: {
    name: string;
    timezone: string;
    ownerId?: string;
  },
) {
  const response = await apiRequest<{ apartment: Apartment }>(
    `/apartments/${apartmentId}`,
    {
      method: "PUT",
      token,
      body: values,
    },
  );

  return response.apartment;
}

export async function deleteApartment(token: string, apartmentId: string) {
  await apiRequest<void>(`/apartments/${apartmentId}`, {
    method: "DELETE",
    token,
  });
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
        provider: values.provider ?? "airbnb",
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

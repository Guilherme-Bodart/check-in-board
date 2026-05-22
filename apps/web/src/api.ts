const fallbackApiUrl = "http://localhost:3333";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? fallbackApiUrl;

export type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
  organization: {
    id: string;
    name: string;
  };
};

export type Apartment = {
  id: string;
  name: string;
  organizationId: string;
  timezone: string;
  membership: {
    id: string;
    role: "host_admin" | "co_host" | "team";
    canManageIntegrations: boolean;
    canUpdateTaskStatus: boolean;
    canView: boolean;
  };
};

export type ReservationCard = {
  id: string;
  apartmentId: string;
  icalSourceId: string;
  provider: string;
  status: string;
  startsAt: string;
  endsAt: string;
  rawSummary: string | null;
};

export type BoardSection = {
  count: number;
  reservations: ReservationCard[];
};

export type OperationsBoard = {
  apartmentId: string;
  date: string;
  days: number;
  timezone: string;
  checkIns: BoardSection;
  checkOuts: BoardSection;
  inHouse: BoardSection;
  upcoming: BoardSection;
  totals: {
    checkIns: number;
    checkOuts: number;
    inHouse: number;
    upcoming: number;
  };
};

export type IcalSource = {
  id: string;
  provider: string;
  label: string;
  syncEnabled: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

export type TaskStatus = "pending" | "done" | "not_done" | "cancelled";

export type Task = {
  id: string;
  apartmentId: string;
  apartmentName: string;
  reservationId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  statusNote: string | null;
  dueAt: string;
  completedAt: string | null;
  completedByUserId: string | null;
  assignedUserId: string | null;
};

export type SyncResponse = {
  summary: {
    eventsSeen: number;
    reservationsUpserted: number;
    syncSkipped: boolean;
    syncSkippedReason: string | null;
  };
};

type ApiOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}) {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as T & ApiError)
    : undefined;

  if (!response.ok) {
    throw new ApiClientError(
      payload?.error?.message ?? "Request failed.",
      response.status,
      payload?.error?.code,
    );
  }

  return payload as T;
}

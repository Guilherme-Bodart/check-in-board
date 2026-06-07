const fallbackApiUrl = "http://localhost:3333";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? fallbackApiUrl;

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

type ApiOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  organization: {
    id: string;
    name: string;
  };
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
      payload?.error?.message ?? "Falha na requisição.",
      response.status,
      payload?.error?.code,
    );
  }

  return payload as T;
}

export async function signIn(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/sign-in", {
    method: "POST",
    body: { email, password },
  });
}

export async function signUp(values: {
  email: string;
  fullName: string;
  organizationName: string;
  password: string;
}) {
  return apiRequest<AuthResponse>("/auth/sign-up", {
    method: "POST",
    body: {
      email: values.email,
      fullName: values.fullName,
      organizationName: values.organizationName,
      password: values.password,
    },
  });
}

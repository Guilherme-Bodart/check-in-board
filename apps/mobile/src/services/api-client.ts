import { Platform } from "react-native";

const DEFAULT_TIMEOUT_MS = 8000;

export class ApiClientError extends Error {
  retryAfterSeconds?: number;
  status: number;

  constructor(message: string, status = 500, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiClientError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.status = status;
  }
}

function getFallbackApiUrl() {
  return Platform.select({
    android: "http://10.0.2.2:3333",
    ios: "http://127.0.0.1:3333",
    default: "http://127.0.0.1:3333",
  });
}

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.trim() || getFallbackApiUrl();
}

type RequestOptions = {
  body?: unknown;
  headers?: HeadersInit;
  method?: "GET" | "PATCH" | "POST";
  timeoutMs?: number;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
      method: options.method ?? "GET",
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: {
        message?: string;
      };
    } | null;

    if (!response.ok) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader
        ? Number(retryAfterHeader)
        : undefined;

      throw new ApiClientError(
        response.status === 429
          ? "Too many attempts right now. Wait a little and try again."
          : (payload?.error?.message ?? "Request failed. Please try again."),
        response.status,
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiClientError(
        "The request took too long. Please try again.",
        408,
      );
    }

    throw new ApiClientError("Network unavailable. Check your connection.", 0);
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body" | "method">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body: unknown,
    options?: Omit<RequestOptions, "body" | "method">,
  ) => request<T>(path, { ...options, body, method: "POST" }),
  patch: <T>(
    path: string,
    body: unknown,
    options?: Omit<RequestOptions, "body" | "method">,
  ) => request<T>(path, { ...options, body, method: "PATCH" }),
};

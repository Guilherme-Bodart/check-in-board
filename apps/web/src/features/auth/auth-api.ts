import { apiRequest, type AuthResponse, type MeResponse } from "../../api";
import type { AuthFormValues, AuthMode } from "../dashboard/types";

const ME_CACHE_TTL_MS = 30_000;

type MeCacheEntry = {
  value: MeResponse;
  expiresAt: number;
};

const meCache = new Map<string, MeCacheEntry>();
const meInFlight = new Map<string, Promise<MeResponse>>();

export function clearMeCache(token?: string) {
  if (token) {
    meCache.delete(token);
    meInFlight.delete(token);
    return;
  }
  meCache.clear();
  meInFlight.clear();
}

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

export async function fetchMe(token: string): Promise<MeResponse> {
  const cached = meCache.get(token);
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached.value;
    }
    meCache.delete(token);
  }

  const existingRequest = meInFlight.get(token);
  if (existingRequest) {
    return existingRequest;
  }

  const request = apiRequest<MeResponse>("/auth/me", {
    token,
    cancelOnNavigate: false,
  })
    .then((data) => {
      if (meInFlight.get(token) === request) {
        meCache.set(token, {
          value: data,
          expiresAt: Date.now() + ME_CACHE_TTL_MS,
        });
      }
      return data;
    })
    .finally(() => {
      if (meInFlight.get(token) === request) {
        meInFlight.delete(token);
      }
    });

  meInFlight.set(token, request);
  return request;
}

export async function changePassword(
  token: string,
  values: { currentPassword: string; newPassword: string },
) {
  const result = await apiRequest<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    token,
    body: values,
  });
  clearMeCache(token);
  return result;
}

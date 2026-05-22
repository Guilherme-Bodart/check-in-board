import { apiRequest, type AuthResponse } from "../../api";
import type { AuthFormValues, AuthMode } from "../dashboard/types";

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

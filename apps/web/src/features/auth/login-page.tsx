"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { writeStoredSession } from "../../lib/session-storage";
import { messages } from "../../i18n";
import { AuthPanel } from "./auth-panel";
import { authenticate } from "./auth-api";
import type { AuthFormValues, AuthMode } from "../dashboard/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : messages.auth.errors.authFailed;
}

export function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submitAuth(mode: AuthMode, values: AuthFormValues) {
    setMessage("");

    try {
      const response = await authenticate(mode, values);

      writeStoredSession({ token: response.accessToken, user: response.user });
      router.replace("/dashboard");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return <AuthPanel message={message} onSubmit={submitAuth} />;
}

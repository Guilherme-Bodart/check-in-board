import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { AppText, Button, Screen } from "@/components";
import { theme } from "@/theme";

import { AuthModeSwitch } from "../components/AuthModeSwitch";
import { AuthStatusBanner } from "../components/AuthStatusBanner";
import { AuthTextField } from "../components/AuthTextField";
import { useAuthSession } from "../hooks/useAuthSession";
import { authRuntime } from "../services/auth-service";
import type { AuthFieldErrors, AuthFormValues, AuthMode } from "../types";
import {
  hasAuthErrors,
  toSubmitInput,
  validateAuthValues,
} from "../validation";

const initialValues: AuthFormValues = {
  email: "",
  name: "",
  organizationName: "",
};

const todayRoute = "/today" as Href;

export function AuthScreen() {
  const router = useRouter();
  const { signIn } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>("continue");
  const [values, setValues] = useState<AuthFormValues>(initialValues);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateValue(field: keyof AuthFormValues, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  async function handleSubmit() {
    const nextErrors = validateAuthValues(mode, values);
    setErrors(nextErrors);
    setSubmitError(null);

    if (hasAuthErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(toSubmitInput(mode, values));
      router.replace(todayRoute);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to continue right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.content} scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <AppText color="textMuted" variant="label">
            DEV AUTH
          </AppText>
          <AppText variant="titleLarge">Enter the board</AppText>
          <AppText color="textSecondary">
            Use Continue for an existing operator flow, or Create account to
            start a fresh local workspace.
          </AppText>
        </View>

        <View style={styles.card}>
          <AuthModeSwitch mode={mode} onChange={setMode} />

          <View style={styles.form}>
            <AuthTextField
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) => updateValue("email", value)}
              placeholder="operator@checkboard.app"
              textContentType="emailAddress"
              value={values.email}
            />
            <AuthTextField
              autoCapitalize="words"
              autoComplete="name"
              error={errors.name}
              helperText={
                mode === "create"
                  ? "Required for first account creation."
                  : "Optional. We use it when creating a new local session."
              }
              label="Name"
              onChangeText={(value) => updateValue("name", value)}
              placeholder="Guilherme"
              textContentType="name"
              value={values.name}
            />
            <AuthTextField
              autoCapitalize="words"
              autoComplete="organization"
              helperText="Optional. Useful when creating the first workspace."
              label="Operation name"
              onChangeText={(value) => updateValue("organizationName", value)}
              placeholder="Central Host Ops"
              textContentType="organizationName"
              value={values.organizationName}
            />
          </View>

          {submitError ? (
            <AuthStatusBanner message={submitError} tone="error" />
          ) : null}

          <Button
            accessibilityHint="Submits the dev auth form and opens the protected board."
            label={mode === "create" ? "Create account" : "Continue"}
            loading={isSubmitting}
            onPress={handleSubmit}
          />
        </View>

        <AuthStatusBanner
          message={
            authRuntime.mode === "api"
              ? `Using local API at ${authRuntime.apiBaseUrl}.`
              : "Using local mock auth until EXPO_PUBLIC_USE_DEV_AUTH_API=true."
          }
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[4],
    padding: theme.spacing[4],
  },
  content: {
    gap: theme.spacing[6],
    justifyContent: "center",
  },
  flex: {
    flex: 1,
    gap: theme.spacing[6],
    justifyContent: "center",
  },
  form: {
    gap: theme.spacing[4],
  },
  hero: {
    gap: theme.spacing[2],
  },
});

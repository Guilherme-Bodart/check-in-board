import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { AppText, Button, Screen } from "@/components";
import { theme } from "@/theme";

import { AuthModeSwitch } from "../components/AuthModeSwitch";
import { AuthStatusBanner } from "../components/AuthStatusBanner";
import { AuthTextField } from "../components/AuthTextField";
import { useAuthSession } from "../hooks/useAuthSession";
import {
  requestPasswordReset,
  resetPassword,
} from "../services/password-service";
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
  password: "",
};

const todayRoute = "/today" as Href;

export function AuthScreen() {
  const router = useRouter();
  const { signIn } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>("continue");
  const [values, setValues] = useState<AuthFormValues>(initialValues);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetVisible, setIsResetVisible] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
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

  async function handleRequestReset() {
    setResetError(null);
    setResetMessage(null);

    if (!resetEmail.trim()) {
      setResetError("Email is required.");
      return;
    }

    setIsResetSubmitting(true);

    try {
      const response = await requestPasswordReset(
        resetEmail.trim().toLowerCase(),
      );
      setResetMessage(
        response.resetToken
          ? `Temporary reset token: ${response.resetToken}`
          : "If this email exists, a reset token will be sent when email delivery is connected.",
      );
    } catch (error) {
      setResetError(
        error instanceof Error
          ? error.message
          : "Unable to request password reset right now.",
      );
    } finally {
      setIsResetSubmitting(false);
    }
  }

  async function handleResetPassword() {
    setResetError(null);
    setResetMessage(null);

    if (!resetToken.trim() || resetNewPassword.length < 8) {
      setResetError(
        "Token and a new password with at least 8 characters are required.",
      );
      return;
    }

    setIsResetSubmitting(true);

    try {
      await resetPassword({
        newPassword: resetNewPassword,
        token: resetToken.trim(),
      });
      setResetMessage(
        "Password updated. You can continue with the new password.",
      );
      setResetNewPassword("");
      setResetToken("");
    } catch (error) {
      setResetError(
        error instanceof Error
          ? error.message
          : "Unable to reset password right now.",
      );
    } finally {
      setIsResetSubmitting(false);
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
            SECURE AUTH
          </AppText>
          <AppText variant="titleLarge">Enter the board</AppText>
          <AppText color="textSecondary">
            Use Continue with your password, or Create account to start a fresh
            workspace.
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
              autoCapitalize="none"
              autoComplete={mode === "create" ? "new-password" : "password"}
              error={errors.password}
              helperText="Use at least 8 characters."
              label="Password"
              onChangeText={(value) => updateValue("password", value)}
              placeholder="Your password"
              secureTextEntry
              textContentType={mode === "create" ? "newPassword" : "password"}
              value={values.password}
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

          <Button
            fullWidth={false}
            label={isResetVisible ? "Hide password reset" : "Forgot password"}
            onPress={() => setIsResetVisible((current) => !current)}
            variant="ghost"
          />
        </View>

        {isResetVisible ? (
          <View style={styles.card}>
            <AppText variant="sectionTitle">Reset password</AppText>
            <AuthTextField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Account email"
              onChangeText={setResetEmail}
              placeholder="operator@checkboard.app"
              textContentType="emailAddress"
              value={resetEmail}
            />
            <Button
              label="Request reset token"
              loading={isResetSubmitting}
              onPress={handleRequestReset}
              variant="secondary"
            />
            <AuthTextField
              autoCapitalize="none"
              label="Reset token"
              onChangeText={setResetToken}
              placeholder="Paste reset token"
              value={resetToken}
            />
            <AuthTextField
              autoCapitalize="none"
              autoComplete="new-password"
              label="New password"
              onChangeText={setResetNewPassword}
              placeholder="New password"
              secureTextEntry
              textContentType="newPassword"
              value={resetNewPassword}
            />
            <Button
              label="Set new password"
              loading={isResetSubmitting}
              onPress={handleResetPassword}
            />
            {resetError ? (
              <AuthStatusBanner message={resetError} tone="error" />
            ) : null}
            {resetMessage ? <AuthStatusBanner message={resetMessage} /> : null}
          </View>
        ) : null}

        <AuthStatusBanner
          message={
            authRuntime.mode === "api"
              ? `Using API at ${authRuntime.apiBaseUrl}.`
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

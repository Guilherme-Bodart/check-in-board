import { ArrowLeft, LockKeyhole } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, Screen } from "@/components";
import { theme } from "@/theme";

import { AuthTextField } from "../components/AuthTextField";
import { useAuthSession } from "../hooks/useAuthSession";
import { changePassword } from "../services/password-service";

const todayRoute = "/today" as Href;

export function AccountSecurityScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleChangePassword() {
    setMessage(null);
    setErrorMessage(null);

    if (currentPassword.length < 8 || newPassword.length < 8) {
      setErrorMessage("Both passwords must have at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(session, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not change the password right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText color="textMuted" variant="label">
            ACCOUNT SECURITY
          </AppText>
          <AppText variant="titleLarge">Password and access</AppText>
          <AppText color="textSecondary">
            Change the password for {session?.user.email ?? "this account"}.
          </AppText>
        </View>
        <Button
          fullWidth={false}
          icon={<ArrowLeft color={theme.colors.textPrimary} size={16} />}
          label="Back"
          onPress={() => router.replace(todayRoute)}
          variant="ghost"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitle}>
          <LockKeyhole color={theme.colors.primary} size={18} />
          <AppText variant="sectionTitle">Change password</AppText>
        </View>
        <AuthTextField
          autoCapitalize="none"
          autoComplete="password"
          label="Current password"
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secureTextEntry
          textContentType="password"
          value={currentPassword}
        />
        <AuthTextField
          autoCapitalize="none"
          autoComplete="new-password"
          label="New password"
          onChangeText={setNewPassword}
          placeholder="New password"
          secureTextEntry
          textContentType="newPassword"
          value={newPassword}
        />
        {errorMessage ? (
          <AppText color="danger" variant="bodyStrong">
            {errorMessage}
          </AppText>
        ) : null}
        {message ? (
          <AppText color="success" variant="bodyStrong">
            {message}
          </AppText>
        ) : null}
        <Button
          label="Change password"
          loading={isSubmitting}
          onPress={handleChangePassword}
        />
      </View>
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
  cardTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  content: {
    gap: theme.spacing[5],
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: theme.spacing[2],
  },
});

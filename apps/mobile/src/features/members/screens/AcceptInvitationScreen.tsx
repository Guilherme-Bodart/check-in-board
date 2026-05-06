import { ArrowLeft, KeyRound } from "lucide-react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, Screen } from "@/components";
import { AuthTextField, useAuthSession } from "@/features/auth";
import { theme } from "@/theme";

import { acceptApartmentInvitation } from "../services/members-service";

const todayRoute = "/today" as Href;

export function AcceptInvitationScreen() {
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const { session } = useAuthSession();
  const [token, setToken] = useState(tokenParam ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleAccept() {
    setMessage(null);
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage("Paste the invitation token to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const invitation = await acceptApartmentInvitation(session, token.trim());
      setMessage(
        `Invitation accepted for ${invitation.email}. You can now open the apartment list.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not accept this invitation right now.",
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
            INVITATION
          </AppText>
          <AppText variant="titleLarge">Join an apartment board</AppText>
          <AppText color="textSecondary">
            Paste the token sent by the host admin. We will attach access to
            your current account.
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
          <KeyRound color={theme.colors.primary} size={18} />
          <AppText variant="sectionTitle">Invitation token</AppText>
        </View>
        <AuthTextField
          autoCapitalize="none"
          label="Token"
          onChangeText={setToken}
          placeholder="Paste invitation token"
          value={token}
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
          label="Accept invitation"
          loading={isSubmitting}
          onPress={handleAccept}
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

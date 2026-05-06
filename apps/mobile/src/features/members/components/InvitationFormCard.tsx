import { MailPlus } from "lucide-react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Button } from "@/components";
import { theme } from "@/theme";

import type { InvitationRole } from "../types";

type InvitationFormCardProps = {
  email: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onChangeEmail: (email: string) => void;
  onChangeRole: (role: InvitationRole) => void;
  onSubmit: () => void;
  role: InvitationRole;
  submitError: string | null;
};

export function InvitationFormCard({
  email,
  isSubmitting,
  onCancel,
  onChangeEmail,
  onChangeRole,
  onSubmit,
  role,
  submitError,
}: InvitationFormCardProps) {
  return (
    <View style={styles.card}>
      <AppText variant="sectionTitle">Invite member</AppText>

      <View style={styles.fieldGroup}>
        <AppText variant="label">Email</AppText>
        <TextInput
          accessibilityLabel="Invite email"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={onChangeEmail}
          placeholder="team@example.com"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={email}
        />
      </View>

      <View style={styles.roleRow}>
        <Button
          fullWidth={false}
          label="Co-host"
          onPress={() => onChangeRole("co_host")}
          variant={role === "co_host" ? "secondary" : "ghost"}
        />
        <Button
          fullWidth={false}
          label="Team"
          onPress={() => onChangeRole("team")}
          variant={role === "team" ? "secondary" : "ghost"}
        />
      </View>

      {submitError ? (
        <View style={styles.errorBox}>
          <AppText color="danger" variant="bodyStrong">
            {submitError}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          disabled={isSubmitting}
          fullWidth={false}
          label="Cancel"
          onPress={onCancel}
          variant="ghost"
        />
        <Button
          fullWidth={false}
          icon={<MailPlus color={theme.colors.surface} size={16} />}
          label="Create invite"
          loading={isSubmitting}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[4],
    padding: theme.spacing[4],
  },
  errorBox: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing[3],
  },
  fieldGroup: {
    gap: theme.spacing[2],
  },
  input: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    minHeight: 44,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
});

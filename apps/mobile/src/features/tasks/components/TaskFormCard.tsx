import { Plus } from "lucide-react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Button } from "@/components";
import { theme } from "@/theme";

import type { TaskFieldErrors, TaskFormValues } from "../types";

type TaskFormCardProps = {
  errors: TaskFieldErrors;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (field: keyof TaskFormValues, value: string) => void;
  onSubmit: () => void;
  submitError: string | null;
  values: TaskFormValues;
};

export function TaskFormCard({
  errors,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
  submitError,
  values,
}: TaskFormCardProps) {
  return (
    <View style={styles.card}>
      <AppText variant="sectionTitle">Create task</AppText>

      <View style={styles.fieldGroup}>
        <AppText variant="label">Title</AppText>
        <TextInput
          accessibilityLabel="Task title"
          onChangeText={(value) => onChange("title", value)}
          placeholder="Prepare apartment"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={values.title}
        />
        {errors.title ? (
          <AppText color="danger" variant="caption">
            {errors.title}
          </AppText>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="label">Due at</AppText>
        <TextInput
          accessibilityLabel="Task due date"
          autoCapitalize="none"
          onChangeText={(value) => onChange("dueAt", value)}
          placeholder="2026-05-05T14:00:00.000Z"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={values.dueAt}
        />
        {errors.dueAt ? (
          <AppText color="danger" variant="caption">
            {errors.dueAt}
          </AppText>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="label">Description</AppText>
        <TextInput
          accessibilityLabel="Task description"
          multiline
          onChangeText={(value) => onChange("description", value)}
          placeholder="What needs to be done?"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={values.description}
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
          icon={<Plus color={theme.colors.surface} size={16} />}
          label="Create task"
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
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
});

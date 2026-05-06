import { Plus } from "lucide-react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Button } from "@/components";
import { theme } from "@/theme";

import {
  getTaskDueDatePresetValue,
  taskDueDatePresets,
} from "../due-date-presets";
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

function getDatePart(isoValue: string) {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function getTimePart(isoValue: string) {
  const date = new Date(isoValue);

  return Number.isNaN(date.getTime()) ? "" : date.toTimeString().slice(0, 5);
}

function mergeDateAndTime(datePart: string, timePart: string) {
  const date = new Date(`${datePart}T${timePart}:00`);

  return Number.isNaN(date.getTime())
    ? `${datePart}T${timePart}`
    : date.toISOString();
}

export function TaskFormCard({
  errors,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
  submitError,
  values,
}: TaskFormCardProps) {
  const datePart = getDatePart(values.dueAt);
  const timePart = getTimePart(values.dueAt);

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
        <AppText variant="label">Due date and time</AppText>
        <View style={styles.presets}>
          {taskDueDatePresets.map((preset) => (
            <Button
              fullWidth={false}
              key={preset.id}
              label={preset.label}
              onPress={() =>
                onChange("dueAt", getTaskDueDatePresetValue(preset.id))
              }
              variant="secondary"
            />
          ))}
        </View>
        <View style={styles.dateTimeRow}>
          <TextInput
            accessibilityLabel="Task due date"
            autoCapitalize="none"
            onChangeText={(value) =>
              onChange("dueAt", mergeDateAndTime(value, timePart))
            }
            placeholder="2026-05-05"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.dateInput]}
            value={datePart}
          />
          <TextInput
            accessibilityLabel="Task due time"
            autoCapitalize="none"
            onChangeText={(value) =>
              onChange("dueAt", mergeDateAndTime(datePart, value))
            }
            placeholder="14:00"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.timeInput]}
            value={timePart}
          />
        </View>
        {errors.dueAt ? (
          <AppText color="danger" variant="caption">
            {errors.dueAt}
          </AppText>
        ) : (
          <AppText color="textMuted" variant="caption">
            Use local date and 24h time.
          </AppText>
        )}
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
  dateInput: {
    flex: 1.35,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
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
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  timeInput: {
    flex: 0.8,
  },
});

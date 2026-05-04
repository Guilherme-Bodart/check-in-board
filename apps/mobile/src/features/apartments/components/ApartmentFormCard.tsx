import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Button } from "@/components";
import { theme } from "@/theme";

import type { ApartmentFieldErrors, ApartmentFormValues } from "../types";

type ApartmentFormCardProps = {
  errors: ApartmentFieldErrors;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (field: keyof ApartmentFormValues, value: string) => void;
  onSubmit: () => void;
  submitError?: string | null;
  values: ApartmentFormValues;
};

function Field({
  error,
  helperText,
  label,
  onChangeText,
  value,
}: {
  error?: string;
  helperText?: string;
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChangeText}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
      />
      {error ? (
        <AppText color="danger" variant="caption">
          {error}
        </AppText>
      ) : helperText ? (
        <AppText color="textMuted" variant="caption">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

export function ApartmentFormCard({
  errors,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
  submitError,
  values,
}: ApartmentFormCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="sectionTitle">Create apartment</AppText>
        <AppText color="textSecondary">
          Keep this first step operational and quick.
        </AppText>
      </View>

      <Field
        error={errors.name}
        label="Apartment name"
        onChangeText={(value) => onChange("name", value)}
        value={values.name}
      />

      <Field
        error={errors.timezone}
        helperText="Default is America/Sao_Paulo until backend-driven settings arrive."
        label="Timezone"
        onChangeText={(value) => onChange("timezone", value)}
        value={values.timezone}
      />

      {submitError ? (
        <AppText color="danger" variant="caption">
          {submitError}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <Button
          fullWidth={false}
          label="Cancel"
          onPress={onCancel}
          variant="ghost"
        />
        <Button
          fullWidth={false}
          label="Save apartment"
          loading={isSubmitting}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
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
  fieldWrap: {
    gap: theme.spacing[2],
  },
  header: {
    gap: theme.spacing[1],
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    minHeight: 48,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
});

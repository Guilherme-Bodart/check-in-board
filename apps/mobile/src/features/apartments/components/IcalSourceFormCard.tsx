import { Link2, Plus } from "lucide-react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Button } from "@/components";
import { theme } from "@/theme";

import type { IcalSourceFieldErrors, IcalSourceFormValues } from "../types";

type IcalSourceFormCardProps = {
  errors: IcalSourceFieldErrors;
  isSubmitting: boolean;
  onCancel: () => void;
  onChange: (field: keyof IcalSourceFormValues, value: string) => void;
  onSubmit: () => void;
  submitError: string | null;
  values: IcalSourceFormValues;
};

export function IcalSourceFormCard({
  errors,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
  submitError,
  values,
}: IcalSourceFormCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Link2 color={theme.colors.primary} size={18} />
        <AppText variant="sectionTitle">Connect iCal channel</AppText>
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="label">Provider</AppText>
        <TextInput
          accessibilityLabel="Provider"
          autoCapitalize="none"
          onChangeText={(value) => onChange("provider", value)}
          placeholder="airbnb"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={values.provider}
        />
        {errors.provider ? (
          <AppText color="danger" variant="caption">
            {errors.provider}
          </AppText>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="label">Label</AppText>
        <TextInput
          accessibilityLabel="Channel label"
          onChangeText={(value) => onChange("label", value)}
          placeholder="Airbnb main calendar"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={values.label}
        />
        {errors.label ? (
          <AppText color="danger" variant="caption">
            {errors.label}
          </AppText>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <AppText variant="label">iCal URL</AppText>
        <TextInput
          accessibilityLabel="iCal URL"
          autoCapitalize="none"
          keyboardType="url"
          onChangeText={(value) => onChange("icalUrl", value)}
          placeholder="https://..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={values.icalUrl}
        />
        {errors.icalUrl ? (
          <AppText color="danger" variant="caption">
            {errors.icalUrl}
          </AppText>
        ) : null}
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
          label="Add source"
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
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
});

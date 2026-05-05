import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "@/components";
import { theme } from "@/theme";

type AuthTextFieldProps = {
  autoCapitalize?: "none" | "sentences" | "words";
  autoComplete?: TextInputProps["autoComplete"];
  error?: string;
  helperText?: string;
  keyboardType?: TextInputProps["keyboardType"];
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  textContentType?: TextInputProps["textContentType"];
  value: string;
};

export function AuthTextField({
  autoCapitalize = "sentences",
  autoComplete = "off",
  error,
  helperText,
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  textContentType = "none",
  value,
}: AuthTextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, error ? styles.inputError : null]}
        textContentType={textContentType}
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

const styles = StyleSheet.create({
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
  wrapper: {
    gap: theme.spacing[2],
  },
});

import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "./AppText";
import { theme } from "@/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";

type ButtonProps = {
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

const variantStyles = {
  primary: {
    default: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      textColor: theme.colors.surface,
    },
    pressed: {
      backgroundColor: theme.colors.primaryPressed,
      borderColor: theme.colors.primaryPressed,
      textColor: theme.colors.surface,
    },
  },
  secondary: {
    default: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      textColor: theme.colors.textPrimary,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      textColor: theme.colors.textPrimary,
    },
  },
  ghost: {
    default: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.background,
      textColor: theme.colors.textSecondary,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.surfaceMuted,
      textColor: theme.colors.textPrimary,
    },
  },
  danger: {
    default: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
      textColor: theme.colors.surface,
    },
    pressed: {
      backgroundColor: theme.palette.red[700],
      borderColor: theme.palette.red[700],
      textColor: theme.colors.surface,
    },
  },
  icon: {
    default: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      textColor: theme.colors.textPrimary,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      textColor: theme.colors.textPrimary,
    },
  },
} as const;

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => {
        const state = pressed && !isDisabled ? "pressed" : "default";
        const colors = variantStyles[variant][state];

        return [
          styles.base,
          variant === "icon" ? styles.iconOnly : null,
          {
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            opacity: isDisabled ? 0.6 : 1,
            alignSelf: fullWidth ? "stretch" : "flex-start",
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const state = pressed && !isDisabled ? "pressed" : "default";
        const colors = variantStyles[variant][state];

        return (
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color={colors.textColor} />
            ) : (
              <>
                {icon ? <View style={styles.icon}>{icon}</View> : null}
                {label ? (
                  <AppText
                    numberOfLines={1}
                    style={[styles.label, { color: colors.textColor }]}
                    variant="label"
                  >
                    {label}
                  </AppText>
                ) : null}
              </>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
    justifyContent: "center",
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconOnly: {
    minWidth: 44,
    paddingHorizontal: theme.spacing[3],
  },
  label: {
    flexShrink: 1,
  },
});

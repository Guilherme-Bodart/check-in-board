import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components";
import { theme } from "@/theme";

import type { AuthMode } from "../types";

type AuthModeSwitchProps = {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
};

const options: AuthMode[] = ["continue", "create"];

export function AuthModeSwitch({ mode, onChange }: AuthModeSwitchProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option === mode;
        const label = option === "continue" ? "Continue" : "Create account";

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.option, selected ? styles.optionSelected : null]}
          >
            <AppText
              color={selected ? "surface" : "textSecondary"}
              variant="label"
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: theme.spacing[2],
    padding: theme.spacing[1],
  },
  option: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
  },
});

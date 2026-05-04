import type { ReactNode } from "react";
import {
  Text,
  type StyleProp,
  StyleSheet,
  type TextProps,
  type TextStyle,
} from "react-native";

import { theme, type SemanticColorName } from "@/theme";

type TextVariant = keyof typeof theme.typography;

type AppTextProps = TextProps & {
  children: ReactNode;
  variant?: TextVariant;
  color?: SemanticColorName;
  style?: StyleProp<TextStyle>;
};

export function AppText({
  children,
  variant = "body",
  color = "textPrimary",
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        theme.typography[variant],
        { color: theme.colors[color] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

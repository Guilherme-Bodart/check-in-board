import type { ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "./AppText";
import { Button } from "./Button";
import { theme } from "@/theme";

type ScreenProps = {
  children: ReactNode;
  loading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle">;
};

export function Screen({
  children,
  loading = false,
  errorMessage,
  onRetry,
  scroll = true,
  contentStyle,
  scrollProps,
}: ScreenProps) {
  const body = loading ? (
    <View style={styles.feedback}>
      <ActivityIndicator color={theme.colors.primary} size="small" />
      <AppText color="textSecondary">Loading today board...</AppText>
    </View>
  ) : errorMessage ? (
    <View style={styles.feedback}>
      <AppText variant="sectionTitle">Something needs attention</AppText>
      <AppText color="textSecondary">{errorMessage}</AppText>
      {onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
    </View>
  ) : (
    children
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          {...scrollProps}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  feedback: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing[3],
    justifyContent: "center",
    minHeight: 320,
  },
});

import { ClipboardCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Button } from "@/components";
import { theme } from "@/theme";

import type { TodayBoardEmptyState as TodayBoardEmptyStateData } from "../types";

type TodayBoardEmptyStateProps = {
  onActionPress?: () => void;
  state: TodayBoardEmptyStateData;
};

export function TodayBoardEmptyState({
  onActionPress,
  state,
}: TodayBoardEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <ClipboardCheck color={theme.colors.primary} size={20} />
      </View>
      <AppText style={styles.title} variant="sectionTitle">
        {state.title}
      </AppText>
      <AppText color="textSecondary" style={styles.description}>
        {state.description}
      </AppText>
      <Button
        accessibilityHint="Retries the mocked refresh flow for the today board."
        accessibilityLabel={state.actionLabel}
        fullWidth={false}
        label={state.actionLabel}
        onPress={onActionPress}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[3],
    justifyContent: "center",
    minHeight: 240,
    padding: theme.spacing[6],
  },
  description: {
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    textAlign: "center",
  },
});

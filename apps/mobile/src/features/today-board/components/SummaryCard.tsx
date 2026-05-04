import { StyleSheet, View } from "react-native";

import { AppText, Badge } from "@/components";
import { theme } from "@/theme";

import type { SummaryCardData } from "../types";

type SummaryCardProps = {
  card: SummaryCardData;
};

export function SummaryCard({ card }: SummaryCardProps) {
  return (
    <View style={styles.card}>
      <Badge status={card.status} />
      <AppText style={styles.value} variant="titleMedium">
        {card.value}
      </AppText>
      <AppText variant="bodyStrong">{card.label}</AppText>
      <AppText color="textSecondary">{card.helper}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  value: {
    marginTop: theme.spacing[1],
  },
});

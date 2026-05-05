import { StyleSheet, View } from "react-native";

import { AppText, Badge, Button } from "@/components";
import { theme } from "@/theme";

import type { BoardItemCardData } from "../types";

type BoardItemCardProps = {
  item: BoardItemCardData;
  onActionPress?: () => void;
  onSecondaryActionPress?: () => void;
  secondaryActionLabel?: string;
};

export function BoardItemCard({
  item,
  onActionPress,
  onSecondaryActionPress,
  secondaryActionLabel,
}: BoardItemCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.timeBlock}>
          <AppText color="textMuted" variant="caption">
            {item.time}
          </AppText>
          <AppText variant="sectionTitle">{item.apartment}</AppText>
        </View>
        <Badge status={item.status} />
      </View>

      <AppText variant="bodyStrong">{item.headline}</AppText>
      <AppText color="textSecondary">{item.notes}</AppText>

      <View style={styles.footer}>
        <View style={styles.assigneePill}>
          <AppText color="textSecondary" variant="caption">
            Owner: {item.assignee}
          </AppText>
        </View>
        <Button
          accessibilityHint={`Opens the next action for ${item.apartment}.`}
          accessibilityLabel={`${item.actionLabel} for ${item.apartment}`}
          fullWidth={false}
          label={item.actionLabel}
          onPress={onActionPress}
          variant="secondary"
        />
        {secondaryActionLabel ? (
          <Button
            accessibilityHint={`Marks ${item.apartment} task as not done.`}
            accessibilityLabel={`${secondaryActionLabel} for ${item.apartment}`}
            fullWidth={false}
            label={secondaryActionLabel}
            onPress={onSecondaryActionPress}
            variant="danger"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  assigneePill: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  footer: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
  timeBlock: {
    flex: 1,
    gap: theme.spacing[1],
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
});

import { CalendarSync, CircleCheck, TriangleAlert } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Badge } from "@/components";
import { theme } from "@/theme";

import type { IcalSource } from "../types";

type IcalSourceCardProps = {
  source: IcalSource;
};

export function IcalSourceCard({ source }: IcalSourceCardProps) {
  const hasFailure = Boolean(source.lastFailureAt);
  const StatusIcon = hasFailure ? TriangleAlert : CircleCheck;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <CalendarSync color={theme.colors.primary} size={18} />
          <View style={styles.titleText}>
            <AppText variant="sectionTitle">{source.label}</AppText>
            <AppText color="textSecondary" variant="caption">
              {source.provider.toUpperCase()}
            </AppText>
          </View>
        </View>
        <Badge
          label={hasFailure ? "Sync issue" : "Active"}
          status={hasFailure ? "syncIssue" : "completed"}
        />
      </View>

      <View style={styles.syncRow}>
        <StatusIcon
          color={hasFailure ? theme.colors.warning : theme.colors.success}
          size={16}
        />
        <AppText color="textSecondary">
          {source.lastSuccessAt
            ? `Last sync: ${new Date(source.lastSuccessAt).toLocaleString()}`
            : "Waiting for first sync"}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
  syncRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  titleText: {
    flex: 1,
    gap: theme.spacing[1],
  },
  titleWrap: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing[2],
  },
});

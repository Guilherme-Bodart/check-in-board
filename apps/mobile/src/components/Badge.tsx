import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { theme, type OperationStatus } from "@/theme";

type BadgeProps = {
  status?: OperationStatus;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const statusLabels: Record<OperationStatus, string> = {
  checkInToday: "Check-in",
  checkOutToday: "Check-out",
  inStay: "In stay",
  upcoming: "Upcoming",
  overdue: "Overdue",
  completed: "Done",
  failed: "Not done",
  syncIssue: "Sync issue",
  pending: "Pending",
};

export function Badge({ status = "upcoming", label, style }: BadgeProps) {
  const semanticColor = theme.operationStatusColors[status];
  const toneMap = {
    danger: {
      backgroundColor: theme.colors.dangerSoft,
      textColor: theme.colors.danger,
    },
    info: {
      backgroundColor: theme.colors.infoSoft,
      textColor: theme.colors.info,
    },
    primary: {
      backgroundColor: theme.colors.primarySoft,
      textColor: theme.colors.primary,
    },
    success: {
      backgroundColor: theme.colors.successSoft,
      textColor: theme.colors.success,
    },
    warning: {
      backgroundColor: theme.colors.warningSoft,
      textColor: theme.colors.warning,
    },
  } as const;

  const colors = toneMap[semanticColor];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.backgroundColor },
        style,
      ]}
    >
      <AppText style={{ color: colors.textColor }} variant="caption">
        {label ?? statusLabels[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
});

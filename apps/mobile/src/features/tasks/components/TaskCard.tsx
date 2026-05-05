import { CircleCheck, CircleX, ClipboardCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Badge, Button } from "@/components";
import { theme } from "@/theme";

import type { OperationalTask } from "../types";

type TaskCardProps = {
  isUpdating?: boolean;
  onMarkDone?: (task: OperationalTask) => void;
  onMarkNotDone?: (task: OperationalTask) => void;
  task: OperationalTask;
};

export function TaskCard({
  isUpdating = false,
  onMarkDone,
  onMarkNotDone,
  task,
}: TaskCardProps) {
  const canUpdate = task.status === "pending";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <ClipboardCheck color={theme.colors.primary} size={18} />
          <View style={styles.titleText}>
            <AppText variant="sectionTitle">{task.title}</AppText>
            <AppText color="textSecondary" variant="caption">
              Due {new Date(task.dueAt).toLocaleString()}
            </AppText>
          </View>
        </View>
        <Badge
          label={task.status.replace("_", " ")}
          status={
            task.status === "done"
              ? "completed"
              : task.status === "not_done"
                ? "failed"
                : "pending"
          }
        />
      </View>

      {task.description ? (
        <AppText color="textSecondary">{task.description}</AppText>
      ) : null}

      {canUpdate ? (
        <View style={styles.actions}>
          <Button
            disabled={isUpdating}
            fullWidth={false}
            icon={<CircleCheck color={theme.colors.surface} size={16} />}
            label="Done"
            loading={isUpdating}
            onPress={() => onMarkDone?.(task)}
          />
          <Button
            disabled={isUpdating}
            fullWidth={false}
            icon={<CircleX color={theme.colors.surface} size={16} />}
            label="Not done"
            onPress={() => onMarkNotDone?.(task)}
            variant="danger"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    justifyContent: "flex-end",
  },
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

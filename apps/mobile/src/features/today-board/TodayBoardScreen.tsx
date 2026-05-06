import {
  CalendarDays,
  CircleCheck,
  Clock3,
  RefreshCw,
  TriangleAlert,
} from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, Screen } from "@/components";
import { useAuthSession } from "@/features/auth";
import { markTaskStatus } from "@/features/tasks";
import { theme } from "@/theme";

import { BoardItemCard, SummaryCard, TodayBoardEmptyState } from "./components";
import { todayBoardScenarios } from "./mock-data";
import {
  getTodayBoard,
  todayBoardRuntime,
} from "./services/today-board-service";
import type { TodayBoardContent } from "./types";

type TodayBoardFilter = "all" | "checkIns" | "checkOuts" | "tasks";

type TodayBoardScreenProps = {
  headerAccessory?: ReactNode;
};

export function TodayBoardScreen({ headerAccessory }: TodayBoardScreenProps) {
  const router = useRouter();
  const { session } = useAuthSession();
  const [content, setContent] = useState<TodayBoardContent>(
    todayBoardScenarios.content,
  );
  const [activeFilter, setActiveFilter] = useState<TodayBoardFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const loadData = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      setContent(await getTodayBoard(session));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not refresh today's board.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = content.boardItems.filter((item) => {
    if (activeFilter === "checkIns") {
      return item.status === "checkInToday";
    }

    if (activeFilter === "checkOuts") {
      return item.status === "checkOutToday";
    }

    if (activeFilter === "tasks") {
      return item.kind === "task";
    }

    return true;
  });
  const isEmpty = filteredItems.length === 0;

  async function handleBoardItemAction(
    itemId: string,
    taskStatus: "done" | "not_done" = "done",
  ) {
    const item = content.boardItems.find(
      (boardItem) => boardItem.id === itemId,
    );

    if (!item) {
      return;
    }

    if (item.kind === "task" && item.taskStatus === "pending") {
      await markTaskStatus(
        session,
        item.id,
        taskStatus,
        taskStatus === "not_done"
          ? "Marked not done from Today Board."
          : undefined,
      );
      setContent((current) => ({
        ...current,
        boardItems: current.boardItems.map((boardItem) =>
          boardItem.id === item.id
            ? {
                ...boardItem,
                actionLabel: "View task",
                status: taskStatus === "done" ? "completed" : "failed",
                taskStatus,
              }
            : boardItem,
        ),
      }));
      return;
    }

    if (item.apartmentId) {
      router.push(`/apartment/${item.apartmentId}` as Href);
    }
  }

  return (
    <Screen
      contentStyle={styles.content}
      errorMessage={errorMessage ?? undefined}
      loading={isLoading}
      onRetry={loadData}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText color="textMuted" variant="label">
            TODAY BOARD
          </AppText>
          <AppText variant="titleLarge">What needs to happen now</AppText>
          <View style={styles.inlineMeta}>
            <CalendarDays color={theme.colors.textSecondary} size={16} />
            <AppText color="textSecondary">{todayLabel}</AppText>
          </View>
        </View>
        <View style={styles.headerActions}>
          {headerAccessory}
          <Button
            accessibilityHint="Triggers a refresh of the today board data."
            accessibilityLabel="Sync today board"
            fullWidth={false}
            icon={<RefreshCw color={theme.colors.textPrimary} size={16} />}
            label="Sync"
            onPress={loadData}
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.filters}>
        <Button
          fullWidth={false}
          label="All"
          onPress={() => setActiveFilter("all")}
          variant={activeFilter === "all" ? "secondary" : "ghost"}
        />
        <Button
          fullWidth={false}
          label="Check-ins"
          onPress={() => setActiveFilter("checkIns")}
          variant={activeFilter === "checkIns" ? "secondary" : "ghost"}
        />
        <Button
          fullWidth={false}
          label="Check-outs"
          onPress={() => setActiveFilter("checkOuts")}
          variant={activeFilter === "checkOuts" ? "secondary" : "ghost"}
        />
        <Button
          fullWidth={false}
          label="Tasks"
          onPress={() => setActiveFilter("tasks")}
          variant={activeFilter === "tasks" ? "secondary" : "ghost"}
        />
      </View>

      <View style={styles.summarySection}>
        {content.summaryCards.map((card) => (
          <SummaryCard card={card} key={card.label} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="sectionTitle">Operational list</AppText>
        <View style={styles.inlineMeta}>
          <Clock3 color={theme.colors.textMuted} size={16} />
          <AppText color="textMuted" variant="caption">
            Sorted by next action
          </AppText>
        </View>
      </View>

      {isEmpty ? (
        <TodayBoardEmptyState
          onActionPress={loadData}
          state={{
            actionLabel: "Refresh board",
            description:
              todayBoardRuntime.mode === "api"
                ? "No reservations match today's operational window yet."
                : "Today looks calm. You can review apartments or wait for the next sync.",
            title: "Nothing urgent on the board",
          }}
        />
      ) : (
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <BoardItemCard
              item={item}
              key={item.id}
              onActionPress={() => void handleBoardItemAction(item.id)}
              onSecondaryActionPress={
                item.kind === "task" && item.taskStatus === "pending"
                  ? () => void handleBoardItemAction(item.id, "not_done")
                  : undefined
              }
              secondaryActionLabel={
                item.kind === "task" && item.taskStatus === "pending"
                  ? "Not done"
                  : undefined
              }
            />
          ))}
        </View>
      )}

      <View style={styles.bottomSection}>
        {content.notices.map((notice) => {
          const Icon = notice.tone === "success" ? CircleCheck : TriangleAlert;
          const cardStyle =
            notice.tone === "success" ? styles.syncCard : styles.alertCard;
          const iconColor =
            notice.tone === "success"
              ? theme.colors.success
              : theme.colors.warning;

          return (
            <View key={notice.title} style={cardStyle}>
              <View style={styles.noticeHeader}>
                <Icon color={iconColor} size={18} />
                <AppText variant="bodyStrong">
                  {notice.tone === "success"
                    ? content.lastSyncLabel
                    : notice.title}
                </AppText>
              </View>
              <AppText color="textSecondary">{notice.description}</AppText>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  alertCard: {
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.lg,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  bottomSection: {
    gap: theme.spacing[3],
  },
  content: {
    gap: theme.spacing[6],
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
  headerActions: {
    alignItems: "flex-end",
    gap: theme.spacing[2],
  },
  headerText: {
    flex: 1,
    gap: theme.spacing[2],
  },
  inlineMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  list: {
    gap: theme.spacing[3],
  },
  noticeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  sectionHeader: {
    gap: theme.spacing[2],
  },
  summarySection: {
    gap: theme.spacing[3],
  },
  syncCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
});

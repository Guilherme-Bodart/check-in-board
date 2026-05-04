import {
  CalendarDays,
  CircleCheck,
  Clock3,
  RefreshCw,
  TriangleAlert,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, Screen } from "@/components";
import { theme } from "@/theme";

import { BoardItemCard, SummaryCard, TodayBoardEmptyState } from "./components";
import { todayBoardPreviewState, todayBoardScenarios } from "./mock-data";

const currentScenario = todayBoardScenarios[todayBoardPreviewState];
const handleMockAction = () => undefined;

type TodayBoardScreenProps = {
  headerAccessory?: ReactNode;
};

export function TodayBoardScreen({ headerAccessory }: TodayBoardScreenProps) {
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <Screen
      contentStyle={styles.content}
      errorMessage={
        currentScenario.state === "error"
          ? currentScenario.errorMessage
          : undefined
      }
      loading={currentScenario.state === "loading"}
      onRetry={currentScenario.state === "error" ? handleMockAction : undefined}
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
            onPress={handleMockAction}
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.filters}>
        <Button
          fullWidth={false}
          label="All"
          onPress={handleMockAction}
          variant="secondary"
        />
        <Button
          fullWidth={false}
          label="Check-ins"
          onPress={handleMockAction}
          variant="ghost"
        />
        <Button
          fullWidth={false}
          label="Check-outs"
          onPress={handleMockAction}
          variant="ghost"
        />
        <Button
          fullWidth={false}
          label="Tasks"
          onPress={handleMockAction}
          variant="ghost"
        />
      </View>

      <View style={styles.summarySection}>
        {currentScenario.summaryCards.map((card) => (
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

      {currentScenario.state === "empty" && currentScenario.emptyState ? (
        <TodayBoardEmptyState
          onActionPress={handleMockAction}
          state={currentScenario.emptyState}
        />
      ) : (
        <View style={styles.list}>
          {currentScenario.boardItems.map((item) => (
            <BoardItemCard
              item={item}
              key={`${item.apartment}-${item.time}`}
              onActionPress={handleMockAction}
            />
          ))}
        </View>
      )}

      <View style={styles.bottomSection}>
        {currentScenario.notices.map((notice) => {
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
                    ? currentScenario.lastSyncLabel
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

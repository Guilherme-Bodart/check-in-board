import {
  CalendarDays,
  CircleCheck,
  Clock3,
  RefreshCw,
  TriangleAlert,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Badge, Button, Screen } from "@/components";
import { theme, type OperationStatus } from "@/theme";

type SummaryCard = {
  label: string;
  value: string;
  helper: string;
  status: OperationStatus;
};

type BoardItem = {
  apartment: string;
  time: string;
  status: OperationStatus;
  headline: string;
  notes: string;
  assignee: string;
  actionLabel: string;
};

const summaryCards: SummaryCard[] = [
  {
    label: "Check-ins",
    value: "3",
    helper: "First arrival at 14:00",
    status: "checkInToday",
  },
  {
    label: "Check-outs",
    value: "2",
    helper: "One unit still pending review",
    status: "checkOutToday",
  },
  {
    label: "Pending tasks",
    value: "4",
    helper: "2 need action before noon",
    status: "pending",
  },
];

const boardItems: BoardItem[] = [
  {
    apartment: "Apto 204",
    time: "11:00",
    status: "checkOutToday",
    headline: "Guest leaves before cleaning starts",
    notes: "Laundry pickup and minibar check still open.",
    assignee: "Ana",
    actionLabel: "Open details",
  },
  {
    apartment: "Studio 12B",
    time: "14:00",
    status: "checkInToday",
    headline: "Prepare self check-in message",
    notes: "Code was updated after lock battery swap.",
    assignee: "Guilherme",
    actionLabel: "Send checklist",
  },
  {
    apartment: "Cobertura 7",
    time: "16:30",
    status: "pending",
    headline: "Replace towels and confirm inspection photos",
    notes: "Owner visit tomorrow, keep living room staged.",
    assignee: "Equipe limpeza",
    actionLabel: "Mark done",
  },
];

export default function TodayBoardScreen() {
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <Screen contentStyle={styles.content}>
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
        <Button
          fullWidth={false}
          icon={<RefreshCw color={theme.colors.textPrimary} size={16} />}
          label="Sync"
          variant="secondary"
        />
      </View>

      <View style={styles.filters}>
        <Button fullWidth={false} label="All" variant="secondary" />
        <Button fullWidth={false} label="Check-ins" variant="ghost" />
        <Button fullWidth={false} label="Check-outs" variant="ghost" />
        <Button fullWidth={false} label="Tasks" variant="ghost" />
      </View>

      <View style={styles.summarySection}>
        {summaryCards.map((card) => (
          <View key={card.label} style={styles.summaryCard}>
            <Badge status={card.status} />
            <AppText style={styles.summaryValue} variant="titleMedium">
              {card.value}
            </AppText>
            <AppText variant="bodyStrong">{card.label}</AppText>
            <AppText color="textSecondary">{card.helper}</AppText>
          </View>
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

      <View style={styles.list}>
        {boardItems.map((item) => (
          <View key={`${item.apartment}-${item.time}`} style={styles.boardCard}>
            <View style={styles.boardTopRow}>
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

            <View style={styles.boardFooter}>
              <View style={styles.assigneePill}>
                <AppText color="textSecondary" variant="caption">
                  Owner: {item.assignee}
                </AppText>
              </View>
              <Button
                fullWidth={false}
                label={item.actionLabel}
                variant="secondary"
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <CircleCheck color={theme.colors.success} size={18} />
            <AppText variant="bodyStrong">Last sync 09:18</AppText>
          </View>
          <AppText color="textSecondary">
            Reservations and tasks look up to date for the morning shift.
          </AppText>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.syncHeader}>
            <TriangleAlert color={theme.colors.warning} size={18} />
            <AppText variant="bodyStrong">1 item needs manual check</AppText>
          </View>
          <AppText color="textSecondary">
            Cobertura 7 is still waiting for confirmation photos before the next
            guest.
          </AppText>
        </View>
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
  assigneePill: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  boardCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  boardFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
  boardTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
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
  sectionHeader: {
    gap: theme.spacing[2],
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  summarySection: {
    gap: theme.spacing[3],
  },
  summaryValue: {
    marginTop: theme.spacing[1],
  },
  syncCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  syncHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  timeBlock: {
    flex: 1,
    gap: theme.spacing[1],
  },
});

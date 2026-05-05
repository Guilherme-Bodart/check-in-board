import { CalendarDays } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Badge } from "@/components";
import { theme } from "@/theme";

import { formatReservationPeriod } from "../format";
import type { Reservation } from "../types";

type ReservationCardProps = {
  reservation: Reservation;
};

export function ReservationCard({ reservation }: ReservationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <CalendarDays color={theme.colors.primary} size={18} />
          <View style={styles.titleText}>
            <AppText variant="sectionTitle">
              {reservation.rawSummary ?? "Reserved"}
            </AppText>
            <AppText color="textSecondary" variant="caption">
              {formatReservationPeriod(
                reservation.startsAt,
                reservation.endsAt,
              )}
            </AppText>
          </View>
        </View>
        <Badge label={reservation.status} status="upcoming" />
      </View>

      <AppText color="textSecondary">
        Source: {reservation.provider?.toUpperCase() ?? "Unknown"}
      </AppText>
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

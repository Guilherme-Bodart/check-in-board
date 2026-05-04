import { ArrowRight, Building2, Clock3 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Badge, Button } from "@/components";
import { theme } from "@/theme";

import type { Apartment } from "../types";

type ApartmentCardProps = {
  apartment: Apartment;
  onOpenPress?: (apartment: Apartment) => void;
};

export function ApartmentCard({ apartment, onOpenPress }: ApartmentCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Building2 color={theme.colors.primary} size={18} />
          <AppText variant="sectionTitle">{apartment.name}</AppText>
        </View>
        <Badge label="Active" status="completed" />
      </View>

      <View style={styles.metaRow}>
        <Clock3 color={theme.colors.textMuted} size={16} />
        <AppText color="textSecondary">
          Default timezone: {apartment.timezone}
        </AppText>
      </View>

      {onOpenPress ? (
        <Button
          accessibilityHint="Opens apartment channels and operational details."
          fullWidth={false}
          icon={<ArrowRight color={theme.colors.textPrimary} size={16} />}
          label="Open apartment"
          onPress={() => onOpenPress(apartment)}
          variant="secondary"
        />
      ) : null}
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
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  titleWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing[2],
  },
});

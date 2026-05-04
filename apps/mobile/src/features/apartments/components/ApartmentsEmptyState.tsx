import { Building2 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Button } from "@/components";
import { theme } from "@/theme";

type ApartmentsEmptyStateProps = {
  onCreatePress: () => void;
};

export function ApartmentsEmptyState({
  onCreatePress,
}: ApartmentsEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Building2 color={theme.colors.primary} size={20} />
      </View>
      <AppText style={styles.center} variant="sectionTitle">
        No apartments yet
      </AppText>
      <AppText color="textSecondary" style={styles.center}>
        Add your first apartment to start organizing reservations and tasks.
      </AppText>
      <Button
        accessibilityHint="Opens the apartment creation form."
        fullWidth={false}
        label="Create apartment"
        onPress={onCreatePress}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: "center",
  },
  container: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[3],
    justifyContent: "center",
    minHeight: 240,
    padding: theme.spacing[6],
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});

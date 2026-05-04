import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText, Screen } from "@/components";
import { theme } from "@/theme";

type AuthGateScreenProps = {
  description?: string;
  title: string;
};

export function AuthGateScreen({
  description = "Restoring your local session.",
  title,
}: AuthGateScreenProps) {
  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.primary} size="small" />
        <AppText variant="sectionTitle">{title}</AppText>
        <AppText color="textSecondary">{description}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing[3],
    justifyContent: "center",
  },
});

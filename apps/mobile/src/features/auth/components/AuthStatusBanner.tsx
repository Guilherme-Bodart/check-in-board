import { Info, TriangleAlert } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components";
import { theme } from "@/theme";

type AuthStatusBannerProps = {
  message: string;
  tone?: "error" | "info";
};

export function AuthStatusBanner({
  message,
  tone = "info",
}: AuthStatusBannerProps) {
  const iconColor = tone === "error" ? theme.colors.danger : theme.colors.info;
  const backgroundColor =
    tone === "error" ? theme.colors.dangerSoft : theme.colors.infoSoft;
  const Icon = tone === "error" ? TriangleAlert : Info;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Icon color={iconColor} size={16} />
      <AppText color={tone === "error" ? "danger" : "info"} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: theme.spacing[2],
    padding: theme.spacing[3],
  },
  text: {
    flex: 1,
  },
});

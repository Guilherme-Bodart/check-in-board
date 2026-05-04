import { Redirect, Stack, type Href } from "expo-router";

import { AuthGateScreen, useAuthSession } from "@/features/auth";
import { theme } from "@/theme";

const todayRoute = "/today" as Href;

export default function PublicLayout() {
  const { isHydrating, session } = useAuthSession();

  if (isHydrating) {
    return <AuthGateScreen title="Loading workspace" />;
  }

  if (session) {
    return <Redirect href={todayRoute} />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        headerShown: false,
      }}
    />
  );
}

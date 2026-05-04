import { Redirect, Stack, type Href } from "expo-router";

import { AuthGateScreen, useAuthSession } from "@/features/auth";
import { theme } from "@/theme";

const authRoute = "/auth" as Href;

export default function ProtectedLayout() {
  const { isHydrating, session } = useAuthSession();

  if (isHydrating) {
    return <AuthGateScreen title="Loading board" />;
  }

  if (!session) {
    return <Redirect href={authRoute} />;
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

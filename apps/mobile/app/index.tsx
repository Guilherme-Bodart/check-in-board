import { Redirect, type Href } from "expo-router";

import { AuthGateScreen, useAuthSession } from "@/features/auth";

const authRoute = "/auth" as Href;
const todayRoute = "/today" as Href;

export default function IndexScreen() {
  const { isHydrating, session } = useAuthSession();

  if (isHydrating) {
    return <AuthGateScreen title="Loading workspace" />;
  }

  return <Redirect href={session ? todayRoute : authRoute} />;
}

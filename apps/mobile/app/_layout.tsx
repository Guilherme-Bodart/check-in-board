import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthSessionProvider } from "@/features/auth";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthSessionProvider>
        <Slot />
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}

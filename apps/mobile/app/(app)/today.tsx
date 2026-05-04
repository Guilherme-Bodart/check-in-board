import { useRouter, type Href } from "expo-router";

import { Button } from "@/components";
import { useAuthSession } from "@/features/auth";
import { TodayBoardScreen } from "@/features/today-board";

const apartmentsRoute = "/apartments" as Href;

export default function TodayRoute() {
  const router = useRouter();
  const { signOut } = useAuthSession();

  return (
    <TodayBoardScreen
      headerAccessory={
        <>
          <Button
            accessibilityHint="Opens the apartments screen for this session."
            fullWidth={false}
            label="Apartments"
            onPress={() => router.push(apartmentsRoute)}
            variant="secondary"
          />
          <Button
            accessibilityHint="Clears the local session and returns to the auth screen."
            fullWidth={false}
            label="Sign out"
            onPress={() => {
              void signOut();
            }}
            variant="ghost"
          />
        </>
      }
    />
  );
}

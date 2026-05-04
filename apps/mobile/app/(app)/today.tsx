import { Button } from "@/components";
import { useAuthSession } from "@/features/auth";
import { TodayBoardScreen } from "@/features/today-board";

export default function TodayRoute() {
  const { signOut } = useAuthSession();

  return (
    <TodayBoardScreen
      headerAccessory={
        <Button
          accessibilityHint="Clears the local session and returns to the auth screen."
          fullWidth={false}
          label="Sign out"
          onPress={() => {
            void signOut();
          }}
          variant="ghost"
        />
      }
    />
  );
}

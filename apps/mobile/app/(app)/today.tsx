import { useRouter, type Href } from "expo-router";

import { Button } from "@/components";
import { useAuthSession } from "@/features/auth";
import { TodayBoardScreen } from "@/features/today-board";

const apartmentsRoute = "/apartments" as Href;
const financeRoute = "/finance" as Href;
const acceptInviteRoute = "/accept-invite" as Href;
const securityRoute = "/security" as Href;

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
            accessibilityHint="Opens quick finance entry."
            fullWidth={false}
            label="Finance"
            onPress={() => router.push(financeRoute)}
            variant="secondary"
          />
          <Button
            accessibilityHint="Opens the invitation acceptance screen."
            fullWidth={false}
            label="Invite token"
            onPress={() => router.push(acceptInviteRoute)}
            variant="secondary"
          />
          <Button
            accessibilityHint="Opens account security settings."
            fullWidth={false}
            label="Security"
            onPress={() => router.push(securityRoute)}
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

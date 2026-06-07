import { LoginPanel } from "../features/auth/login-panel";

export default function HomePage() {
  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: 24,
      }}
    >
      <LoginPanel />
    </main>
  );
}

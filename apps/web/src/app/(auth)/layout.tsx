import { AuthenticatedAppLayout } from "../../components/layout/authenticated-app-layout";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppLayout>{children}</AuthenticatedAppLayout>;
}

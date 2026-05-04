export type AuthMode = "continue" | "create";

export type AuthFormValues = {
  email: string;
  name: string;
  organizationName: string;
};

export type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>;

export type AuthSubmitInput = {
  email: string;
  mode: AuthMode;
  name?: string;
  organizationName?: string;
};

export type AuthUser = {
  email: string;
  id: string;
  name: string;
};

export type AuthSession = {
  accessToken: string;
  authSource: "api" | "mock";
  createdAt: string;
  organizationName?: string;
  user: AuthUser;
};

export type AuthContextValue = {
  isHydrating: boolean;
  session: AuthSession | null;
  signIn: (input: AuthSubmitInput) => Promise<void>;
  signOut: () => Promise<void>;
};

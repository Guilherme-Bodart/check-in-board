import type {
  Apartment,
  AuthResponse,
  IcalSource,
  OperationsBoard,
  Task,
} from "../../api";

export type AuthMode = "sign-in" | "sign-up";

export type LoadState = "idle" | "loading" | "error";

export type AuthFormValues = {
  email: string;
  fullName: string;
  organizationName: string;
  password: string;
};

export type CreateIcalSourceValues = {
  label: string;
  provider?: string;
  url: string;
};

export type UpdateIcalSourceValues = {
  label: string;
  provider: string;
  syncEnabled: boolean;
  url?: string;
};

export type CreateTaskValues = {
  title: string;
  dueAt: string;
};

export type WorkspaceData = {
  board: OperationsBoard;
  tasks: Task[];
  icalSources: IcalSource[];
};

export type SessionPayload = {
  token: string;
  user: AuthResponse["user"];
};

export type BoardTone = "info" | "warning" | "success" | "primary";

export type BoardSectionViewModel = {
  id: "checkIns" | "checkOuts" | "inHouse" | "upcoming";
  title: string;
  description: string;
  tone: BoardTone;
  count: number;
  reservations: OperationsBoard["checkIns"]["reservations"];
};

export type DashboardSnapshot = {
  apartments: Apartment[];
  selectedApartment: Apartment | null;
  selectedApartmentId: string;
  board: OperationsBoard | null;
  boardDate: string;
  boardSections: BoardSectionViewModel[];
  tasks: Task[];
  icalSources: IcalSource[];
  totals: OperationsBoard["totals"];
};

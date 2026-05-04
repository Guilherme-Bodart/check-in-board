import type { AuthRole } from "../auth/types.js";

export type IcalSourceSummary = {
  id: string;
  provider: string;
  label: string;
  syncEnabled: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

export type CreateIcalSourceInput = {
  apartmentId: string;
  provider: string;
  label: string;
  icalUrl: string;
};

export type ApartmentIcalAccess = {
  apartmentId: string;
  role: AuthRole;
  canManageIntegrations: boolean;
  canView: boolean;
};

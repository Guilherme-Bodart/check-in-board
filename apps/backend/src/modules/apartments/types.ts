import type { AuthRole } from "../auth/types.js";

export type ApartmentMembership = {
  id: string;
  role: AuthRole;
  canManageIntegrations: boolean;
  canUpdateTaskStatus: boolean;
  canView: boolean;
};

export type ApartmentSummary = {
  id: string;
  membership: ApartmentMembership;
  name: string;
  organizationId: string;
  timezone: string;
};

export type CreateApartmentInput = {
  name: string;
  timezone: string;
};

export type PrimaryOrganizationAccess = {
  isActive: boolean;
  organizationId: string;
  role: AuthRole;
  userId: string;
};

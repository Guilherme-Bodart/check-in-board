export type AuthRole = "host_admin" | "co_host" | "team";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
};

export type AuthOrganization = {
  id: string;
  name: string;
};

export type AuthMembership = {
  id: string;
  role: AuthRole;
  isActive: boolean;
  organization: AuthOrganization;
};

export type AuthenticatedUser = AuthUser & {
  memberships: AuthMembership[];
};

export type SignUpInput = {
  email: string;
  fullName: string;
  organizationName?: string;
};

import { apiRequest, type AuthRole, type TeamMember } from "../../api";

export type TeamApartmentPermissionValues = {
  apartmentId: string;
  canView: boolean;
  canUpdateTaskStatus: boolean;
  canManageIntegrations: boolean;
};

export type CreateTeamMemberValues = {
  email: string;
  fullName: string;
  password: string;
  role: AuthRole;
  apartmentPermissions: TeamApartmentPermissionValues[];
};

export type UpdateTeamMemberValues = {
  role: AuthRole;
  active: boolean;
  apartmentPermissions: TeamApartmentPermissionValues[];
};

export async function fetchTeamMembers(token: string) {
  const response = await apiRequest<{ teamMembers: TeamMember[] }>("/team-members", {
    token,
  });

  return response.teamMembers;
}

export async function fetchTeamMember(token: string, membershipId: string) {
  const members = await fetchTeamMembers(token);
  const member = members.find((item) => item.membershipId === membershipId);

  if (!member) {
    throw new Error("Membro não encontrado.");
  }

  return member;
}

export async function createTeamMember(
  token: string,
  values: CreateTeamMemberValues,
) {
  const response = await apiRequest<{ teamMember: TeamMember }>("/team-members", {
    method: "POST",
    token,
    body: normalizeCreatePayload(values),
  });

  return response.teamMember;
}

export async function updateTeamMember(
  token: string,
  membershipId: string,
  values: UpdateTeamMemberValues,
) {
  const response = await apiRequest<{ teamMember: TeamMember }>(
    `/team-members/${membershipId}`,
    {
      method: "PUT",
      token,
      body: values,
    },
  );

  return response.teamMember;
}

export async function deactivateTeamMember(token: string, membershipId: string) {
  await apiRequest<void>(`/team-members/${membershipId}`, {
    method: "DELETE",
    token,
  });
}

function normalizeCreatePayload(values: CreateTeamMemberValues) {
  return {
    ...values,
    email: values.email.trim(),
    fullName: values.fullName.trim(),
  };
}

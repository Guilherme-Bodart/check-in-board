import { ApiClientError, apiClient } from "@/services/api-client";

import type { AuthSession } from "@/features/auth/types";

import type {
  ApartmentInvitation,
  ApartmentMember,
  CreateInvitationInput,
} from "../types";

const useDevAuthApi = process.env.EXPO_PUBLIC_USE_DEV_AUTH_API === "true";

const mockMembersByApartment = new Map<string, ApartmentMember[]>([
  [
    "apt-1",
    [
      {
        canManageIntegrations: true,
        canUpdateTaskStatus: true,
        canView: true,
        email: "host@example.com",
        fullName: "Host Admin",
        id: "member-host",
        role: "host_admin",
        userId: "user-host",
      },
    ],
  ],
]);

type MembersResponse = {
  members?: ApartmentMember[];
};

type InvitationResponse = {
  invitation?: ApartmentInvitation;
};

function getAuthorizationHeaders(session: AuthSession | null) {
  if (!session?.accessToken) {
    throw new ApiClientError("Your session is missing an access token.", 401);
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

export async function listApartmentMembers(
  session: AuthSession | null,
  apartmentId: string,
) {
  if (!useDevAuthApi) {
    return [...(mockMembersByApartment.get(apartmentId) ?? [])];
  }

  const response = await apiClient.get<MembersResponse>(
    `/apartments/${apartmentId}/members`,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  return response.members ?? [];
}

export async function createApartmentInvitation(
  session: AuthSession | null,
  apartmentId: string,
  input: CreateInvitationInput,
) {
  if (!useDevAuthApi) {
    return {
      apartmentId,
      email: input.email,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      id: `invitation-${Date.now()}`,
      role: input.role,
      status: "pending",
      token: `mock-invite-${Date.now()}`,
    } satisfies ApartmentInvitation;
  }

  const response = await apiClient.post<InvitationResponse>(
    `/apartments/${apartmentId}/invitations`,
    input,
    {
      headers: getAuthorizationHeaders(session),
    },
  );

  if (!response.invitation) {
    throw new ApiClientError("Invitation response is invalid.", 500);
  }

  return response.invitation;
}

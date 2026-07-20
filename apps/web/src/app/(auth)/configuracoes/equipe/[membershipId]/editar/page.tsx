"use client";

import { useParams } from "next/navigation";

import { TeamMemberFormPage } from "../../../../../../features/settings/team-member-form-page";

export default function EditTeamMemberRoute() {
  const params = useParams<{ membershipId: string }>();
  const membershipId = params?.membershipId;

  if (!membershipId) return null;

  return <TeamMemberFormPage membershipId={membershipId} />;
}

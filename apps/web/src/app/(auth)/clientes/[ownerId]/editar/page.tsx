"use client";

import { useParams } from "next/navigation";

import { OwnerFormPage } from "../../../../../features/owners/owner-form-page";

export default function EditOwnerRoute() {
  const params = useParams<{ ownerId: string }>();

  return <OwnerFormPage ownerId={params.ownerId} />;
}

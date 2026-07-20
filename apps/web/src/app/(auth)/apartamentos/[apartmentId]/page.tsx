"use client";

import { useParams } from "next/navigation";

import { ApartmentDetailPage } from "../../../../features/apartments/apartment-detail-page";

export default function ApartmentDetailRoute() {
  const params = useParams<{ apartmentId: string }>();
  const apartmentId = params?.apartmentId;

  if (!apartmentId) return null;

  return <ApartmentDetailPage apartmentId={apartmentId} />;
}

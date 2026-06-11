"use client";

import { useParams } from "next/navigation";

import { ApartmentDetailPage } from "../../../../features/apartments/apartment-detail-page";

export default function ApartmentDetailRoute() {
  const params = useParams<{ apartmentId: string }>();

  return <ApartmentDetailPage apartmentId={params.apartmentId} />;
}

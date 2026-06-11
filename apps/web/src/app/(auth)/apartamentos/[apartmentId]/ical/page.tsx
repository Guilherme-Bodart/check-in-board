"use client";

import { useParams } from "next/navigation";

import { ApartmentIcalPage } from "../../../../../features/apartments/apartment-ical-page";

export default function ApartmentIcalRoute() {
  const params = useParams<{ apartmentId: string }>();

  return <ApartmentIcalPage apartmentId={params.apartmentId} />;
}

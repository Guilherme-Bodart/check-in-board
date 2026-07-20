"use client";

import { useParams } from "next/navigation";

import { ApartmentIcalPage } from "../../../../../features/apartments/apartment-ical-page";

export default function ApartmentIcalRoute() {
  const params = useParams<{ apartmentId: string }>();
  const apartmentId = params?.apartmentId;

  if (!apartmentId) return null;

  return <ApartmentIcalPage apartmentId={apartmentId} />;
}

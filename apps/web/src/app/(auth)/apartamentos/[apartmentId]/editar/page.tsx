"use client";

import { useParams } from "next/navigation";

import { ApartmentFormPage } from "../../../../../features/apartments/apartment-form-page";

export default function EditApartmentRoute() {
  const params = useParams<{ apartmentId: string }>();
  const apartmentId = params?.apartmentId;

  if (!apartmentId) return null;

  return <ApartmentFormPage apartmentId={apartmentId} />;
}

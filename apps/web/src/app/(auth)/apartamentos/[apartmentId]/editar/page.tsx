"use client";

import { useParams } from "next/navigation";

import { ApartmentFormPage } from "../../../../../features/apartments/apartment-form-page";

export default function EditApartmentRoute() {
  const params = useParams<{ apartmentId: string }>();

  return <ApartmentFormPage apartmentId={params.apartmentId} />;
}

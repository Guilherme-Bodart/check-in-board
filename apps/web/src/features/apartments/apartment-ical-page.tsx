"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Apartment } from "../../api";
import { readStoredSession } from "../../lib/session-storage";
import { fetchApartment } from "../dashboard/dashboard-api";
import { IcalSourcesManagement } from "./components/ical-sources-management";

export function ApartmentIcalPage({ apartmentId }: { apartmentId: string }) {
  const router = useRouter();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = readStoredSession();

    if (!session) {
      return;
    }

    const currentSession = session;

    async function loadApartment() {
      setIsLoading(true);
      setMessage("");

      try {
        setApartment(await fetchApartment(currentSession.token, apartmentId));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar apartamento.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadApartment();
  }, [apartmentId]);

  if (isLoading) {
    return <p className="text-sm text-text-secondary">Carregando iCal...</p>;
  }

  if (message) {
    return (
      <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
        {message}
      </p>
    );
  }

  return (
    <IcalSourcesManagement
      apartment={apartment}
      onClose={() => router.push(`/apartamentos/${apartmentId}`)}
    />
  );
}

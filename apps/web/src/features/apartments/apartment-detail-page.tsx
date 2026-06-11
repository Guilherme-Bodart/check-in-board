"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Pencil } from "lucide-react";

import type { Apartment } from "../../api";
import { PageHeader } from "../../components/ui/page-header";
import { Panel } from "../../components/ui/panel";
import { readStoredSession } from "../../lib/session-storage";
import { fetchApartment } from "../dashboard/dashboard-api";

export function ApartmentDetailPage({ apartmentId }: { apartmentId: string }) {
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

  return (
    <div className="grid gap-6">
      <PageHeader
        description="Veja os dados principais e acesse as configurações específicas do imóvel."
        eyebrow="Apartamento"
        title={apartment?.name ?? "Apartamento"}
      />

      <Panel>
        {message ? (
          <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-text-secondary">Carregando apartamento...</p>
        ) : apartment ? (
          <div className="grid gap-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoItem label="Nome" value={apartment.name} />
              <InfoItem label="Proprietário" value={apartment.owner?.name ?? "-"} />
              <InfoItem label="Tipo do proprietário" value={apartment.owner?.type ?? "-"} />
              <InfoItem label="Timezone" value={apartment.timezone} />
              <InfoItem
                label="Comissão"
                value={`${(apartment.managementCommissionBps ?? 0) / 100}%`}
              />
              <InfoItem label="Permissão" value={apartment.membership.role} />
            </dl>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary-soft"
                href={`/apartamentos/${apartment.id}/editar`}
              >
                <Pencil aria-hidden className="h-4 w-4" />
                Editar dados
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary-soft"
                href={`/apartamentos/${apartment.id}/ical`}
              >
                <CalendarDays aria-hidden className="h-4 w-4" />
                Gerenciar iCal
              </Link>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

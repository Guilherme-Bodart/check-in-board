"use client";

import { useEffect, useState } from "react";

import type { AuthResponse } from "../../lib/api";
import {
  downloadFinanceCsv,
  fetchApartments,
  fetchFinanceSummary,
  fetchOwners,
  fetchRentalStays,
  type Apartment,
  type FinanceSummary,
  type Owner,
  type RentalStay,
} from "../../lib/finance-api";
import { currentMonth, formatMoney } from "../../lib/format";
import { QuickCreatePanel } from "./quick-create-panel";

type FinanceDashboardProps = {
  session: AuthResponse;
  onLogout: () => void;
};

const allValue = "all";

export function FinanceDashboard({ onLogout, session }: FinanceDashboardProps) {
  const [month, setMonth] = useState(currentMonth());
  const [ownerId, setOwnerId] = useState(allValue);
  const [apartmentId, setApartmentId] = useState(allValue);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rentalStays, setRentalStays] = useState<RentalStay[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const filters = {
    month,
    ownerId: ownerId === allValue ? undefined : ownerId,
    apartmentId: apartmentId === allValue ? undefined : apartmentId,
  };

  async function load() {
    setIsLoading(true);
    setMessage("");

    try {
      const [nextOwners, nextApartments, nextRentalStays, nextSummary] =
        await Promise.all([
        fetchOwners(session.accessToken),
        fetchApartments(session.accessToken),
          fetchRentalStays(session.accessToken, filters),
        fetchFinanceSummary(session.accessToken, filters),
      ]);

      setOwners(nextOwners);
      setApartments(nextApartments);
      setRentalStays(nextRentalStays);
      setSummary(nextSummary);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar o financeiro.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function reload() {
    void load();
  }

  async function exportCsv() {
    try {
      const blob = await downloadFinanceCsv(session.accessToken, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `financeiro-${month}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao exportar CSV.");
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">Financeiro MVP</p>
          <h1>Controle financeiro</h1>
          <p className="muted">
            {session.organization.name} · {session.user.email}
          </p>
        </div>
        <button className="secondary-action" onClick={onLogout} type="button">
          Sair
        </button>
      </header>

      <section className="toolbar">
        <label>
          Mês
          <input
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
        </label>
        <label>
          Cliente
          <select onChange={(event) => setOwnerId(event.target.value)} value={ownerId}>
            <option value={allValue}>Todos</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Apartamento
          <select
            onChange={(event) => setApartmentId(event.target.value)}
            value={apartmentId}
          >
            <option value={allValue}>Todos</option>
            {apartments.map((apartment) => (
              <option key={apartment.id} value={apartment.id}>
                {apartment.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={reload} type="button">
          Atualizar
        </button>
        <button className="secondary-action" onClick={exportCsv} type="button">
          CSV
        </button>
      </section>

      {message ? <p className="error">{message}</p> : null}

      <section className="metric-grid">
        <MetricCard
          label="Aluguéis"
          loading={isLoading}
          value={formatMoney(summary?.rentCents ?? 0)}
        />
        <MetricCard
          label="Despesas"
          loading={isLoading}
          value={formatMoney(summary?.expenseCents ?? 0)}
        />
        <MetricCard
          label="Líquido"
          loading={isLoading}
          value={formatMoney(summary?.netCents ?? 0)}
        />
        <MetricCard
          label="Comissão"
          loading={isLoading}
          value={formatMoney(summary?.commissionCents ?? 0)}
        />
        <MetricCard
          label="Repasse"
          loading={isLoading}
          value={formatMoney(summary?.payoutCents ?? 0)}
        />
      </section>

      <QuickCreatePanel
        apartments={apartments}
        onSaved={reload}
        owners={owners}
        rentalStays={rentalStays}
        token={session.accessToken}
      />
    </main>
  );
}

function MetricCard({
  label,
  loading,
  value,
}: {
  label: string;
  loading: boolean;
  value: string;
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{loading ? "..." : value}</strong>
    </article>
  );
}

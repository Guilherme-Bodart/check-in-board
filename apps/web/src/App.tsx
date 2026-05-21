import type { BoardMetric, ReservationRow } from "./api";
import { apiBaseUrl } from "./api";

const metrics: BoardMetric[] = [
  { label: "Check-ins", value: "08", tone: "info" },
  { label: "Check-outs", value: "05", tone: "warning" },
  { label: "Em estadia", value: "17", tone: "success" },
  { label: "Alertas", value: "02", tone: "danger" },
];

const reservations: ReservationRow[] = [
  {
    apartment: "Apto 204",
    channel: "Airbnb",
    guest: "Maria Santos",
    status: "Check-in 15:00",
    time: "Hoje",
  },
  {
    apartment: "Loft 12",
    channel: "Booking",
    guest: "Rafael Lima",
    status: "Limpeza pendente",
    time: "11:30",
  },
  {
    apartment: "Casa Jardim",
    channel: "Direto",
    guest: "Equipe interna",
    status: "Comprar café",
    time: "16:30",
  },
];

const syncRows = [
  ["Airbnb Apto 204", "Atualizado", "1 min"],
  ["Booking Loft 12", "Atenção", "18 min"],
  ["Airbnb Casa Jardim", "Atualizado", "4 min"],
];

export function App() {
  return (
    <main className="appShell">
      <aside className="sidebar" aria-label="Navegação principal">
        <strong className="brand">Check-In Board</strong>
        <nav className="navList">
          <a aria-current="page" href="#board">Board</a>
          <a href="#reservas">Reservas</a>
          <a href="#tarefas">Tarefas</a>
          <a href="#sync">Sync</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operação de hoje</p>
            <h1>Board de hospedagem</h1>
          </div>
          <div className="apiPill">{apiBaseUrl}</div>
        </header>

        <section className="metricGrid" aria-label="Resumo operacional">
          {metrics.map((metric) => (
            <article className={`metricCard ${metric.tone}`} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="contentGrid">
          <div className="panel" id="reservas">
            <div className="panelHeader">
              <h2>Reservas e ações</h2>
              <button type="button">Atualizar</button>
            </div>
            <div className="reservationList">
              {reservations.map((reservation) => (
                <article className="reservationRow" key={reservation.apartment}>
                  <div>
                    <strong>{reservation.apartment}</strong>
                    <span>{reservation.guest}</span>
                  </div>
                  <span>{reservation.channel}</span>
                  <span>{reservation.status}</span>
                  <time>{reservation.time}</time>
                </article>
              ))}
            </div>
          </div>

          <div className="panel compact" id="sync">
            <div className="panelHeader">
              <h2>Fontes iCal</h2>
            </div>
            <div className="syncList">
              {syncRows.map(([source, status, time]) => (
                <div className="syncRow" key={source}>
                  <span>{source}</span>
                  <strong>{status}</strong>
                  <time>{time}</time>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="taskBand" id="tarefas">
          <div>
            <p className="eyebrow">Mobile first</p>
            <h2>Tarefas rápidas para equipe em campo</h2>
          </div>
          <div className="taskActions">
            <button type="button">Marcar feito</button>
            <button type="button">Adicionar compra</button>
          </div>
        </section>
      </section>
    </main>
  );
}

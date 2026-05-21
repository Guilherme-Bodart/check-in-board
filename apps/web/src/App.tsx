"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  apiBaseUrl,
  apiRequest,
  formatDateInput,
  formatDateTime,
  formatTime,
  type Apartment,
  type AuthResponse,
  type IcalSource,
  type OperationsBoard,
  type ReservationCard,
  type Task,
} from "./api";

const sessionStorageKey = "check-in-board-web-session";

type Session = {
  token: string;
  user: AuthResponse["user"];
};

type LoadState = "idle" | "loading" | "error";

function readStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(sessionStorageKey);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as Session;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [password, setPassword] = useState("");
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState("");
  const [board, setBoard] = useState<OperationsBoard | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [icalSources, setIcalSources] = useState<IcalSource[]>([]);
  const [boardDate, setBoardDate] = useState(formatDateInput());
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [icalMessage, setIcalMessage] = useState("");
  const [isIcalSaving, setIsIcalSaving] = useState(false);
  const [newApartmentName, setNewApartmentName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [newIcalUrl, setNewIcalUrl] = useState("");
  const [newIcalLabel, setNewIcalLabel] = useState("");

  const selectedApartment = useMemo(
    () => apartments.find((apartment) => apartment.id === selectedApartmentId) ?? null,
    [apartments, selectedApartmentId],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadApartments(session.token);
  }, [session]);

  useEffect(() => {
    if (!session || !selectedApartmentId) {
      return;
    }

    void loadWorkspace(session.token, selectedApartmentId, boardDate);
  }, [session, selectedApartmentId, boardDate]);

  function persistSession(nextSession: Session) {
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await apiRequest<AuthResponse>(
        authMode === "sign-in" ? "/auth/sign-in" : "/auth/sign-up",
        {
          method: "POST",
          body:
            authMode === "sign-in"
              ? { email, password }
              : { email, fullName, organizationName, password },
        },
      );

      persistSession({ token: response.accessToken, user: response.user });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao autenticar.");
    }
  }

  async function loadApartments(token: string) {
    setLoadState("loading");
    setMessage("");

    try {
      const response = await apiRequest<{ apartments: Apartment[] }>("/apartments", {
        token,
      });

      setApartments(response.apartments);
      setSelectedApartmentId((current) => current || response.apartments[0]?.id || "");
      setLoadState("idle");
    } catch (error) {
      setLoadState("error");
      setMessage(error instanceof Error ? error.message : "Falha ao carregar apartamentos.");
    }
  }

  async function loadWorkspace(token: string, apartmentId: string, date: string) {
    setLoadState("loading");
    setMessage("");

    try {
      const [boardResponse, taskResponse, icalResponse] = await Promise.all([
        apiRequest<OperationsBoard>(
          `/apartments/${apartmentId}/operations-board?date=${date}&days=7`,
          { token },
        ),
        apiRequest<{ tasks: Task[] }>(`/apartments/${apartmentId}/tasks`, { token }),
        apiRequest<{ icalSources: IcalSource[] }>(
          `/apartments/${apartmentId}/ical-sources`,
          { token },
        ),
      ]);

      setBoard(boardResponse);
      setTasks(taskResponse.tasks);
      setIcalSources(icalResponse.icalSources);
      setLoadState("idle");
    } catch (error) {
      setLoadState("error");
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dashboard.");
    }
  }

  async function createApartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !newApartmentName.trim()) {
      return;
    }

    try {
      const response = await apiRequest<{ apartment: Apartment }>("/apartments", {
        method: "POST",
        token: session.token,
        body: {
          name: newApartmentName.trim(),
          timezone: "America/Sao_Paulo",
        },
      });

      setApartments((current) => [response.apartment, ...current]);
      setSelectedApartmentId(response.apartment.id);
      setNewApartmentName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar apartamento.");
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !selectedApartmentId || !newTaskTitle.trim() || !newTaskDueAt) {
      return;
    }

    try {
      await apiRequest<{ task: Task }>(`/apartments/${selectedApartmentId}/tasks`, {
        method: "POST",
        token: session.token,
        body: {
          title: newTaskTitle.trim(),
          dueAt: new Date(newTaskDueAt).toISOString(),
        },
      });
      setNewTaskTitle("");
      setNewTaskDueAt("");
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar tarefa.");
    }
  }

  async function createIcalSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIcalMessage("");

    if (!session) {
      setIcalMessage("Faça login novamente para adicionar a fonte iCal.");
      return;
    }

    if (!selectedApartmentId) {
      setIcalMessage("Crie ou selecione um apartamento antes de adicionar iCal.");
      return;
    }

    if (!newIcalUrl.trim()) {
      setIcalMessage("Cole a URL iCal do Airbnb antes de adicionar.");
      return;
    }

    setIsIcalSaving(true);

    try {
      await apiRequest<{ icalSource: IcalSource }>(
        `/apartments/${selectedApartmentId}/ical-sources`,
        {
          method: "POST",
          token: session.token,
          body: {
            provider: "airbnb",
            label: newIcalLabel.trim() || "Airbnb",
            icalUrl: newIcalUrl.trim(),
          },
        },
      );
      setNewIcalLabel("");
      setNewIcalUrl("");
      setIcalMessage("Fonte iCal adicionada. Agora você pode sincronizar.");
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
    } catch (error) {
      setIcalMessage(
        error instanceof Error ? error.message : "Falha ao criar fonte iCal.",
      );
    } finally {
      setIsIcalSaving(false);
    }
  }

  async function markTaskDone(taskId: string) {
    if (!session || !selectedApartmentId) {
      return;
    }

    try {
      await apiRequest<{ task: Task }>(`/tasks/${taskId}/status`, {
        method: "PATCH",
        token: session.token,
        body: { status: "done" },
      });
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar tarefa.");
    }
  }

  async function syncIcalSource(icalSourceId: string) {
    if (!session || !selectedApartmentId) {
      return;
    }

    try {
      await apiRequest(`/ical-sources/${icalSourceId}/sync`, {
        method: "POST",
        token: session.token,
      });
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar iCal.");
    }
  }

  function signOut() {
    window.localStorage.removeItem(sessionStorageKey);
    setSession(null);
    setApartments([]);
    setSelectedApartmentId("");
    setBoard(null);
    setTasks([]);
    setIcalSources([]);
  }

  if (!session) {
    return (
      <main className="authShell">
        <section className="authPanel">
          <div>
            <p className="eyebrow">Check-In Board</p>
            <h1>{authMode === "sign-in" ? "Entrar no painel" : "Criar primeira conta"}</h1>
          </div>

          <form className="formStack" onSubmit={submitAuth}>
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            {authMode === "sign-up" ? (
              <>
                <label>
                  Nome
                  <input
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    type="text"
                    value={fullName}
                  />
                </label>
                <label>
                  Organização
                  <input
                    onChange={(event) => setOrganizationName(event.target.value)}
                    type="text"
                    value={organizationName}
                  />
                </label>
              </>
            ) : null}
            <label>
              Senha
              <input
                autoComplete={authMode === "sign-in" ? "current-password" : "new-password"}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button type="submit">{authMode === "sign-in" ? "Entrar" : "Criar conta"}</button>
          </form>

          <button
            className="ghostButton"
            onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}
            type="button"
          >
            {authMode === "sign-in" ? "Criar conta" : "Já tenho conta"}
          </button>

          {message ? <p className="message error">{message}</p> : null}
          <p className="apiPill">{apiBaseUrl}</p>
        </section>
      </main>
    );
  }

  const totals = board?.totals ?? {
    checkIns: 0,
    checkOuts: 0,
    inHouse: 0,
    upcoming: 0,
  };
  const boardSections = [
    {
      id: "checkIns",
      title: "Check-ins",
      description: "Reservas que começam na data selecionada.",
      tone: "info",
      section: board?.checkIns,
    },
    {
      id: "checkOuts",
      title: "Check-outs",
      description: "Reservas que terminam na data selecionada.",
      tone: "warning",
      section: board?.checkOuts,
    },
    {
      id: "inHouse",
      title: "Em estadia",
      description: "Reservas que atravessam ou ocupam a data selecionada.",
      tone: "success",
      section: board?.inHouse,
    },
    {
      id: "upcoming",
      title: "Próximas",
      description: "Reservas futuras dentro da janela do board.",
      tone: "primary",
      section: board?.upcoming,
    },
  ] as const;

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
        <button className="ghostButton" onClick={signOut} type="button">
          Sair
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar" id="board">
          <div>
            <p className="eyebrow">{session.user.email}</p>
            <h1>Board de hospedagem</h1>
          </div>
          <div className="toolbar">
            <input
              aria-label="Data do board"
              onChange={(event) => setBoardDate(event.target.value)}
              type="date"
              value={boardDate}
            />
            <select
              aria-label="Apartamento"
              onChange={(event) => setSelectedApartmentId(event.target.value)}
              value={selectedApartmentId}
            >
              {apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {message ? <p className={`message ${loadState === "error" ? "error" : ""}`}>{message}</p> : null}

        {apartments.length === 0 ? (
          <section className="panel emptyPanel">
            <h2>Crie o primeiro apartamento</h2>
            <form className="inlineForm" onSubmit={createApartment}>
              <input
                onChange={(event) => setNewApartmentName(event.target.value)}
                placeholder="Apto 204"
                type="text"
                value={newApartmentName}
              />
              <button type="submit">Criar</button>
            </form>
          </section>
        ) : null}

        <section className="metricGrid" aria-label="Resumo operacional">
          <Metric label="Check-ins" tone="info" value={totals.checkIns} />
          <Metric label="Check-outs" tone="warning" value={totals.checkOuts} />
          <Metric label="Em estadia" tone="success" value={totals.inHouse} />
          <Metric label="Próximas" tone="primary" value={totals.upcoming} />
        </section>

        <section className="contentGrid boardContentGrid">
          <div className="panel boardPanel" id="reservas">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">
                  {board?.date ?? boardDate} | {board?.days ?? 7} dias |{" "}
                  {board?.timezone ?? selectedApartment?.timezone ?? "America/Sao_Paulo"}
                </p>
                <h2>Reservas por seção</h2>
              </div>
              <button
                disabled={!session || !selectedApartmentId}
                onClick={() => session && loadWorkspace(session.token, selectedApartmentId, boardDate)}
                type="button"
              >
                Atualizar
              </button>
            </div>
            <div className="boardSectionGrid">
              {boardSections.map((item) => (
                <BoardSectionCard
                  description={item.description}
                  key={item.id}
                  reservations={item.section?.reservations ?? []}
                  title={item.title}
                  tone={item.tone}
                  total={item.section?.count ?? 0}
                />
              ))}
            </div>
          </div>

          <div className="panel compact" id="sync">
            <div className="panelHeader">
              <h2>Fontes iCal</h2>
            </div>
            <form className="formStack compactForm" onSubmit={createIcalSource}>
              <input
                onChange={(event) => setNewIcalLabel(event.target.value)}
                placeholder="Airbnb Apto 204"
                type="text"
                value={newIcalLabel}
              />
              <input
                onChange={(event) => setNewIcalUrl(event.target.value)}
                placeholder="https://..."
                required
                type="url"
                value={newIcalUrl}
              />
              <button
                disabled={isIcalSaving || !selectedApartmentId}
                type="submit"
              >
                {isIcalSaving ? "Adicionando..." : "Adicionar iCal"}
              </button>
            </form>
            {icalMessage ? <p className="inlineMessage">{icalMessage}</p> : null}
            <div className="syncList">
              {icalSources.map((source) => (
                <div className="syncRow" key={source.id}>
                  <span>{source.label}</span>
                  <strong>{source.lastFailureAt ? "Atenção" : "OK"}</strong>
                  <button onClick={() => syncIcalSource(source.id)} type="button">
                    Sync
                  </button>
                  <time>{formatDateTime(source.lastSuccessAt)}</time>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="taskBand" id="tarefas">
          <div>
            <p className="eyebrow">Equipe em campo</p>
            <h2>Tarefas rápidas</h2>
          </div>
          <form className="taskActions" onSubmit={createTask}>
            <input
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Comprar café"
              type="text"
              value={newTaskTitle}
            />
            <input
              onChange={(event) => setNewTaskDueAt(event.target.value)}
              type="datetime-local"
              value={newTaskDueAt}
            />
            <button type="submit">Adicionar</button>
          </form>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>Checklist</h2>
          </div>
          <div className="taskList">
            {tasks.length === 0 ? (
              <p className="mutedText">Nenhuma tarefa criada para este apartamento.</p>
            ) : (
              tasks.map((task) => (
                <article className="taskRow" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.description ?? formatDateTime(task.dueAt)}</span>
                  </div>
                  <span className={`statusBadge ${task.status}`}>{task.status.replace("_", " ")}</span>
                  {task.status === "pending" ? (
                    <button onClick={() => markTaskDone(task.id)} type="button">
                      Feito
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "info" | "warning" | "success" | "primary";
  value: number;
}) {
  return (
    <article className={`metricCard ${tone}`}>
      <span>{label}</span>
      <strong>{String(value).padStart(2, "0")}</strong>
    </article>
  );
}

function BoardSectionCard({
  description,
  reservations,
  title,
  tone,
  total,
}: {
  description: string;
  reservations: ReservationCard[];
  title: string;
  tone: "info" | "warning" | "success" | "primary";
  total: number;
}) {
  return (
    <article className={`boardSectionCard ${tone}`}>
      <header>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <strong>{total}</strong>
      </header>
      <div className="reservationList">
        {reservations.length === 0 ? (
          <p className="mutedText">Nenhuma reserva.</p>
        ) : (
          reservations.map((reservation) => (
            <ReservationCardView
              key={`${reservation.id}-${reservation.startsAt}-${title}`}
              reservation={reservation}
            />
          ))
        )}
      </div>
    </article>
  );
}

function ReservationCardView({ reservation }: { reservation: ReservationCard }) {
  return (
    <article className="reservationCard">
      <div>
        <strong>{reservation.rawSummary ?? "Reserva"}</strong>
        <span>
          {reservation.provider} | {reservation.status}
        </span>
      </div>
      <time>
        {formatTime(reservation.startsAt)} - {formatTime(reservation.endsAt)}
      </time>
    </article>
  );
}

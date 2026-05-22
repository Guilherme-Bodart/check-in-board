"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type Session,
} from "../../lib/session-storage";
import { formatDateInput } from "../../lib/date-formatters";
import {
  authenticate,
  createApartment as createApartmentRequest,
  createIcalSource as createIcalSourceRequest,
  createTask as createTaskRequest,
  fetchApartments,
  fetchWorkspace,
  markTaskDone as markTaskDoneRequest,
  syncIcalSource as syncIcalSourceRequest,
} from "./dashboard-api";
import type {
  AuthFormValues,
  AuthMode,
  CreateIcalSourceValues,
  CreateTaskValues,
  DashboardSnapshot,
  LoadState,
} from "./types";
import type { Apartment, IcalSource, OperationsBoard, Task } from "../../api";
import {
  createBoardSections,
  emptyBoardTotals,
} from "./operations-board-view-model";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useDashboard() {
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
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

  const selectedApartment = useMemo(
    () => apartments.find((apartment) => apartment.id === selectedApartmentId) ?? null,
    [apartments, selectedApartmentId],
  );

  const snapshot: DashboardSnapshot = useMemo(
    () => ({
      apartments,
      selectedApartment,
      selectedApartmentId,
      board,
      boardDate,
      boardSections: createBoardSections(board),
      tasks,
      icalSources,
      totals: board?.totals ?? emptyBoardTotals,
    }),
    [
      apartments,
      board,
      boardDate,
      icalSources,
      selectedApartment,
      selectedApartmentId,
      tasks,
    ],
  );

  const loadApartmentList = useCallback(async (token: string) => {
    setLoadState("loading");
    setMessage("");

    try {
      const nextApartments = await fetchApartments(token);

      setApartments(nextApartments);
      setSelectedApartmentId((current) => current || nextApartments[0]?.id || "");
      setLoadState("idle");
    } catch (error) {
      setLoadState("error");
      setMessage(getErrorMessage(error, "Falha ao carregar apartamentos."));
    }
  }, []);

  const loadWorkspace = useCallback(
    async (token: string, apartmentId: string, date: string) => {
      setLoadState("loading");
      setMessage("");

      try {
        const workspace = await fetchWorkspace(token, apartmentId, date);

        setBoard(workspace.board);
        setTasks(workspace.tasks);
        setIcalSources(workspace.icalSources);
        setLoadState("idle");
      } catch (error) {
        setLoadState("error");
        setMessage(getErrorMessage(error, "Falha ao carregar dashboard."));
      }
    },
    [],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadApartmentList(session.token);
  }, [loadApartmentList, session]);

  useEffect(() => {
    if (!session || !selectedApartmentId) {
      return;
    }

    void loadWorkspace(session.token, selectedApartmentId, boardDate);
  }, [boardDate, loadWorkspace, selectedApartmentId, session]);

  async function submitAuth(mode: AuthMode, values: AuthFormValues) {
    setMessage("");

    try {
      const response = await authenticate(mode, values);
      const nextSession = { token: response.accessToken, user: response.user };

      writeStoredSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      setMessage(getErrorMessage(error, "Falha ao autenticar."));
    }
  }

  async function createApartment(name: string) {
    if (!session || !name.trim()) {
      return false;
    }

    try {
      const apartment = await createApartmentRequest(session.token, name.trim());

      setApartments((current) => [apartment, ...current]);
      setSelectedApartmentId(apartment.id);
      return true;
    } catch (error) {
      setMessage(getErrorMessage(error, "Falha ao criar apartamento."));
      return false;
    }
  }

  async function createTask(values: CreateTaskValues) {
    if (!session || !selectedApartmentId || !values.title.trim() || !values.dueAt) {
      return false;
    }

    try {
      await createTaskRequest(session.token, selectedApartmentId, {
        title: values.title.trim(),
        dueAt: values.dueAt,
      });
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
      return true;
    } catch (error) {
      setMessage(getErrorMessage(error, "Falha ao criar tarefa."));
      return false;
    }
  }

  async function createIcalSource(values: CreateIcalSourceValues) {
    setIcalMessage("");

    if (!session) {
      setIcalMessage("Faça login novamente para adicionar a fonte iCal.");
      return false;
    }

    if (!selectedApartmentId) {
      setIcalMessage("Crie ou selecione um apartamento antes de adicionar iCal.");
      return false;
    }

    if (!values.url.trim()) {
      setIcalMessage("Cole a URL iCal do Airbnb antes de adicionar.");
      return false;
    }

    setIsIcalSaving(true);

    try {
      await createIcalSourceRequest(session.token, selectedApartmentId, {
        label: values.label.trim(),
        url: values.url.trim(),
      });
      setIcalMessage("Fonte iCal adicionada. Agora você pode sincronizar.");
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
      return true;
    } catch (error) {
      setIcalMessage(getErrorMessage(error, "Falha ao criar fonte iCal."));
      return false;
    } finally {
      setIsIcalSaving(false);
    }
  }

  async function markTaskDone(taskId: string) {
    if (!session || !selectedApartmentId) {
      return;
    }

    try {
      await markTaskDoneRequest(session.token, taskId);
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
    } catch (error) {
      setMessage(getErrorMessage(error, "Falha ao atualizar tarefa."));
    }
  }

  async function syncIcalSource(icalSourceId: string) {
    if (!session || !selectedApartmentId) {
      return;
    }

    try {
      await syncIcalSourceRequest(session.token, icalSourceId);
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
    } catch (error) {
      setMessage(getErrorMessage(error, "Falha ao sincronizar iCal."));
    }
  }

  function refreshWorkspace() {
    if (!session || !selectedApartmentId) {
      return;
    }

    void loadWorkspace(session.token, selectedApartmentId, boardDate);
  }

  function signOut() {
    clearStoredSession();
    setSession(null);
    setApartments([]);
    setSelectedApartmentId("");
    setBoard(null);
    setTasks([]);
    setIcalSources([]);
  }

  return {
    session,
    snapshot,
    loadState,
    message,
    icalMessage,
    isIcalSaving,
    actions: {
      createApartment,
      createIcalSource,
      createTask,
      markTaskDone,
      refreshWorkspace,
      setBoardDate,
      setSelectedApartmentId,
      signOut,
      submitAuth,
      syncIcalSource,
    },
  };
}

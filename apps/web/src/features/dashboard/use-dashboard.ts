"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type Session,
} from "../../lib/session-storage";
import { messages } from "../../i18n";
import { formatDateInput } from "../../lib/date-formatters";
import { authenticate } from "../auth/auth-api";
import {
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

const allApartmentsValue = "all";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(allApartmentsValue);
  const [board, setBoard] = useState<OperationsBoard | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [icalSources, setIcalSources] = useState<IcalSource[]>([]);
  const [boardDate, setBoardDate] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [icalMessage, setIcalMessage] = useState("");
  const [isIcalSaving, setIsIcalSaving] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
    setBoardDate(formatDateInput());
  }, []);

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
      setSelectedApartmentId((current) => current || allApartmentsValue);
      setLoadState("idle");
    } catch (error) {
      setLoadState("error");
      setMessage(getErrorMessage(error, messages.dashboard.errors.loadApartmentsFailed));
    }
  }, []);

  const loadWorkspace = useCallback(
    async (token: string, apartmentId: string, date: string) => {
      setLoadState("loading");
      setMessage("");

      try {
        if (apartmentId === allApartmentsValue) {
          const workspaces = await Promise.all(
            apartments.map((apartment) => fetchWorkspace(token, apartment.id, date)),
          );
          const aggregateBoard = aggregateBoards(workspaces.map((item) => item.board));

          setBoard(aggregateBoard);
          setTasks(workspaces.flatMap((item) => item.tasks));
          setIcalSources(workspaces.flatMap((item) => item.icalSources));
          setLoadState("idle");
          return;
        }

        const workspace = await fetchWorkspace(token, apartmentId, date);

        setBoard(workspace.board);
        setTasks(workspace.tasks);
        setIcalSources(workspace.icalSources);
        setLoadState("idle");
      } catch (error) {
        setLoadState("error");
        setMessage(getErrorMessage(error, messages.dashboard.errors.loadDashboardFailed));
      }
    },
    [apartments],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadApartmentList(session.token);
  }, [loadApartmentList, session]);

  useEffect(() => {
    if (!session || !selectedApartmentId || apartments.length === 0) {
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
      setMessage(getErrorMessage(error, messages.dashboard.errors.authFailed));
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
      setMessage(getErrorMessage(error, messages.dashboard.errors.createApartmentFailed));
      return false;
    }
  }

  async function createTask(values: CreateTaskValues) {
    if (!session || !selectedApartmentId || !values.title.trim() || !values.dueAt) {
      return false;
    }

    if (selectedApartmentId === allApartmentsValue) {
      setMessage(messages.dashboard.errors.selectApartmentForTask);
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
      setMessage(getErrorMessage(error, messages.dashboard.errors.createTaskFailed));
      return false;
    }
  }

  async function createIcalSource(values: CreateIcalSourceValues) {
    setIcalMessage("");

    if (!session) {
      setIcalMessage(messages.dashboard.ical.createLoginRequired);
      return false;
    }

    if (!selectedApartmentId || selectedApartmentId === allApartmentsValue) {
      setIcalMessage(messages.dashboard.ical.createSelectApartment);
      return false;
    }

    if (!values.url.trim()) {
      setIcalMessage(messages.dashboard.ical.createUrlRequired);
      return false;
    }

    setIsIcalSaving(true);

    try {
      await createIcalSourceRequest(session.token, selectedApartmentId, {
        label: values.label.trim(),
        url: values.url.trim(),
      });
      setIcalMessage(messages.dashboard.ical.created);
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
      return true;
    } catch (error) {
      setIcalMessage(getErrorMessage(error, messages.dashboard.errors.createIcalFailed));
      return false;
    } finally {
      setIsIcalSaving(false);
    }
  }

  async function markTaskDone(taskId: string) {
    if (!session || !selectedApartmentId || selectedApartmentId === allApartmentsValue) {
      return;
    }

    try {
      await markTaskDoneRequest(session.token, taskId);
      await loadWorkspace(session.token, selectedApartmentId, boardDate);
    } catch (error) {
      setMessage(getErrorMessage(error, messages.dashboard.errors.updateTaskFailed));
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
      setMessage(getErrorMessage(error, messages.dashboard.errors.syncIcalFailed));
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
    setSelectedApartmentId(allApartmentsValue);
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

function aggregateBoards(boards: OperationsBoard[]): OperationsBoard {
  const firstBoard = boards[0];

  if (!firstBoard) {
    return {
      apartmentId: allApartmentsValue,
      date: formatDateInput(),
      days: 7,
      timezone: "America/Sao_Paulo",
      checkIns: { count: 0, reservations: [] },
      checkOuts: { count: 0, reservations: [] },
      inHouse: { count: 0, reservations: [] },
      upcoming: { count: 0, reservations: [] },
      totals: emptyBoardTotals,
    };
  }

  const checkIns = boards.flatMap((board) => board.checkIns.reservations);
  const checkOuts = boards.flatMap((board) => board.checkOuts.reservations);
  const inHouse = boards.flatMap((board) => board.inHouse.reservations);
  const upcoming = boards.flatMap((board) => board.upcoming.reservations);

  return {
    apartmentId: allApartmentsValue,
    date: firstBoard.date,
    days: firstBoard.days,
    timezone: "Todos",
    checkIns: { count: checkIns.length, reservations: checkIns },
    checkOuts: { count: checkOuts.length, reservations: checkOuts },
    inHouse: { count: inHouse.length, reservations: inHouse },
    upcoming: { count: upcoming.length, reservations: upcoming },
    totals: {
      checkIns: checkIns.length,
      checkOuts: checkOuts.length,
      inHouse: inHouse.length,
      upcoming: upcoming.length,
    },
  };
}

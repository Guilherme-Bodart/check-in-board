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
  fetchApartments,
  fetchWorkspace,
  markTaskDone as markTaskDoneRequest,
} from "./dashboard-api";
import type {
  AuthFormValues,
  AuthMode,
  DashboardSnapshot,
  LoadState,
} from "./types";
import type { Apartment, OperationsBoard, Task } from "../../api";
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
  const [boardDate, setBoardDate] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");

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
      totals: board?.totals ?? emptyBoardTotals,
    }),
    [
      apartments,
      board,
      boardDate,
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
          setLoadState("idle");
          return;
        }

        const workspace = await fetchWorkspace(token, apartmentId, date);

        setBoard(workspace.board);
        setTasks(workspace.tasks);
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
  }

  return {
    session,
    snapshot,
    loadState,
    message,
    actions: {
      markTaskDone,
      refreshWorkspace,
      setBoardDate,
      setSelectedApartmentId,
      signOut,
      submitAuth,
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

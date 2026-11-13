"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  fetchAggregateOperationsBoard,
  fetchApartments,
  fetchTodayTasks,
  fetchWorkspace,
  markTaskDone as markTaskDoneRequest,
  type TodayTasksResponse,
} from "./dashboard-api";
import type {
  AuthFormValues,
  AuthMode,
  DashboardSnapshot,
  LoadState,
} from "./types";
import {
  isAbortError,
  type Apartment,
  type OperationsBoard,
  type Task,
} from "../../api";
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
  const apartmentListAbortRef = useRef<AbortController | null>(null);
  const workspaceAbortRef = useRef<AbortController | null>(null);

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
    apartmentListAbortRef.current?.abort();
    const controller = new AbortController();
    apartmentListAbortRef.current = controller;

    setLoadState("loading");
    setMessage("");

    try {
      const nextApartments = await fetchApartments(token);
      if (controller.signal.aborted) {
        return;
      }

      setApartments(nextApartments);
      setSelectedApartmentId((current) => current || allApartmentsValue);
      setLoadState("idle");
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return;
      }
      setLoadState("error");
      setMessage(getErrorMessage(error, messages.dashboard.errors.loadApartmentsFailed));
    } finally {
      if (apartmentListAbortRef.current === controller) {
        apartmentListAbortRef.current = null;
      }
    }
  }, []);

  const loadWorkspace = useCallback(
    async (token: string, apartmentId: string, date: string) => {
      workspaceAbortRef.current?.abort();
      const controller = new AbortController();
      workspaceAbortRef.current = controller;

      setLoadState("loading");
      setMessage("");

      try {
        if (apartmentId === allApartmentsValue) {
          const [aggregateBoard, todayTasksResponse] = await Promise.all([
            fetchAggregateOperationsBoard(token, date),
            fetchTodayTasks(token, date),
          ]);
          if (controller.signal.aborted) {
            return;
          }

          setBoard(aggregateBoard);
          setTasks(mapTodayTaskBoardItemsToTasks(todayTasksResponse, date));
          setLoadState("idle");
          return;
        }

        const workspace = await fetchWorkspace(token, apartmentId, date);
        if (controller.signal.aborted) {
          return;
        }

        setBoard(workspace.board);
        setTasks(workspace.tasks);
        setLoadState("idle");
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setLoadState("error");
        setMessage(getErrorMessage(error, messages.dashboard.errors.loadDashboardFailed));
      } finally {
        if (workspaceAbortRef.current === controller) {
          workspaceAbortRef.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadApartmentList(session.token);

    return () => {
      apartmentListAbortRef.current?.abort();
    };
  }, [loadApartmentList, session]);

  useEffect(() => {
    if (!session || !selectedApartmentId || apartments.length === 0) {
      return;
    }

    void loadWorkspace(session.token, selectedApartmentId, boardDate);

    return () => {
      workspaceAbortRef.current?.abort();
    };
  }, [apartments.length, boardDate, loadWorkspace, selectedApartmentId, session]);

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
      if (isAbortError(error)) {
        return;
      }
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
    apartmentListAbortRef.current?.abort();
    workspaceAbortRef.current?.abort();
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

function mapTodayTaskBoardItemsToTasks(
  response: TodayTasksResponse | undefined,
  fallbackDate: string,
): Task[] {
  const items = response?.boardItems ?? [];
  const effectiveDate = response?.date || fallbackDate || formatDateInput();

  return items.map((item) => {
    const time = item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : "00:00";
    const description = item.notes
      ? item.apartment
        ? `${item.apartment} · ${item.notes}`
        : item.notes
      : item.apartment || null;

    return {
      id: item.id,
      apartmentId: item.apartmentId,
      apartmentName: item.apartment,
      reservationId: null,
      title: item.headline,
      description,
      status: item.taskStatus ?? "pending",
      statusNote: null,
      dueAt: `${effectiveDate}T${time}:00Z`,
      completedAt: null,
      completedByUserId: null,
      assignedUserId: null,
    };
  });
}

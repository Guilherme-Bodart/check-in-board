import { ArrowLeft, Building2, Plus } from "lucide-react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, Screen } from "@/components";
import { useAuthSession } from "@/features/auth";
import {
  listReservations,
  ReservationCard,
  reservationsRuntime,
  type Reservation,
} from "@/features/reservations";
import {
  createApartmentTask,
  hasTaskErrors,
  listApartmentTasks,
  markTaskStatus,
  TaskCard,
  TaskFormCard,
  toCreateTaskInput,
  type OperationalTask,
  type TaskFieldErrors,
  type TaskFormValues,
  validateTaskValues,
} from "@/features/tasks";
import { theme } from "@/theme";

import { IcalSourceCard, IcalSourceFormCard } from "../components";
import { getApartmentById } from "../services/apartments-service";
import {
  createIcalSource,
  icalSourcesRuntime,
  listIcalSources,
} from "../services/ical-sources-service";
import type {
  Apartment,
  IcalSource,
  IcalSourceFieldErrors,
  IcalSourceFormValues,
} from "../types";
import {
  hasIcalSourceErrors,
  toCreateIcalSourceInput,
  validateIcalSourceValues,
} from "../validation";

const apartmentsRoute = "/apartments" as Href;
const initialFormValues: IcalSourceFormValues = {
  icalUrl: "",
  label: "",
  provider: "airbnb",
};

function getInitialTaskFormValues(): TaskFormValues {
  const dueAt = new Date();
  dueAt.setHours(dueAt.getHours() + 2, 0, 0, 0);

  return {
    description: "",
    dueAt: dueAt.toISOString(),
    title: "",
  };
}

export function ApartmentDetailScreen() {
  const router = useRouter();
  const { apartmentId } = useLocalSearchParams<{ apartmentId: string }>();
  const { session } = useAuthSession();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sources, setSources] = useState<IcalSource[]>([]);
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isTaskFormVisible, setIsTaskFormVisible] = useState(false);
  const [formValues, setFormValues] =
    useState<IcalSourceFormValues>(initialFormValues);
  const [taskFormValues, setTaskFormValues] = useState<TaskFormValues>(
    getInitialTaskFormValues,
  );
  const [formErrors, setFormErrors] = useState<IcalSourceFieldErrors>({});
  const [taskFormErrors, setTaskFormErrors] = useState<TaskFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [taskSubmitError, setTaskSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!apartmentId) {
      setErrorMessage("Apartment id is missing.");
      setIsLoading(false);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const [nextApartment, nextSources, nextReservations, nextTasks] =
        await Promise.all([
          getApartmentById(session, apartmentId),
          listIcalSources(session, apartmentId),
          listReservations(session, apartmentId),
          listApartmentTasks(session, apartmentId),
        ]);

      setApartment(nextApartment);
      setSources(nextSources);
      setReservations(nextReservations);
      setTasks(nextTasks);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not load this apartment right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [apartmentId, session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateField(field: keyof IcalSourceFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function updateTaskField(field: keyof TaskFormValues, value: string) {
    setTaskFormValues((current) => ({
      ...current,
      [field]: value,
    }));
    setTaskFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function resetForm() {
    setFormValues(initialFormValues);
    setFormErrors({});
    setSubmitError(null);
    setIsFormVisible(false);
  }

  function resetTaskForm() {
    setTaskFormValues(getInitialTaskFormValues());
    setTaskFormErrors({});
    setTaskSubmitError(null);
    setIsTaskFormVisible(false);
  }

  async function handleSubmit() {
    if (!apartmentId) {
      return;
    }

    const nextErrors = validateIcalSourceValues(formValues);
    setFormErrors(nextErrors);
    setSubmitError(null);

    if (hasIcalSourceErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const source = await createIcalSource(
        session,
        apartmentId,
        toCreateIcalSourceInput(formValues),
      );
      setSources((current) => [source, ...current]);
      resetForm();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not save this iCal source right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTaskSubmit() {
    if (!apartmentId) {
      return;
    }

    const nextErrors = validateTaskValues(taskFormValues);
    setTaskFormErrors(nextErrors);
    setTaskSubmitError(null);

    if (hasTaskErrors(nextErrors)) {
      return;
    }

    setIsTaskSubmitting(true);

    try {
      const task = await createApartmentTask(
        session,
        apartmentId,
        toCreateTaskInput(taskFormValues),
      );
      setTasks((current) => [task, ...current]);
      resetTaskForm();
    } catch (error) {
      setTaskSubmitError(
        error instanceof Error
          ? error.message
          : "We could not save this task right now.",
      );
    } finally {
      setIsTaskSubmitting(false);
    }
  }

  async function handleTaskStatus(
    task: OperationalTask,
    status: "done" | "not_done",
  ) {
    setUpdatingTaskId(task.id);

    try {
      const updatedTask = await markTaskStatus(session, task.id, status);
      setTasks((current) =>
        current.map((currentTask) =>
          currentTask.id === task.id
            ? {
                ...currentTask,
                completedAt:
                  updatedTask?.completedAt ?? new Date().toISOString(),
                status,
              }
            : currentTask,
        ),
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <Screen
      contentStyle={styles.content}
      errorMessage={errorMessage ?? undefined}
      loading={isLoading}
      onRetry={loadData}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText color="textMuted" variant="label">
            APARTMENT
          </AppText>
          <AppText variant="titleLarge">
            {apartment?.name ?? "Apartment detail"}
          </AppText>
          <AppText color="textSecondary">
            Manage connected channels without exposing private calendar URLs.
          </AppText>
        </View>
        <Button
          accessibilityHint="Returns to apartment list."
          fullWidth={false}
          icon={<ArrowLeft color={theme.colors.textPrimary} size={16} />}
          label="Back"
          onPress={() => router.replace(apartmentsRoute)}
          variant="ghost"
        />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTitle}>
          <Building2 color={theme.colors.primary} size={18} />
          <AppText variant="bodyStrong">
            {apartment?.timezone ?? "Timezone unavailable"}
          </AppText>
        </View>
        <AppText color="textSecondary">
          {icalSourcesRuntime.mode === "api"
            ? "Using protected backend channel endpoints."
            : "Using local mock channels until API mode is enabled."}
        </AppText>
      </View>

      {isFormVisible ? (
        <IcalSourceFormCard
          errors={formErrors}
          isSubmitting={isSubmitting}
          onCancel={resetForm}
          onChange={updateField}
          onSubmit={handleSubmit}
          submitError={submitError}
          values={formValues}
        />
      ) : (
        <Button
          accessibilityHint="Opens the iCal source form."
          fullWidth={false}
          icon={<Plus color={theme.colors.surface} size={16} />}
          label="Add channel"
          onPress={() => setIsFormVisible(true)}
        />
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="sectionTitle">Connected channels</AppText>
        <AppText color="textMuted" variant="caption">
          URLs stay hidden after saving.
        </AppText>
      </View>

      {sources.length === 0 ? (
        <View style={styles.emptyCard}>
          <AppText variant="bodyStrong">No channels connected yet</AppText>
          <AppText color="textSecondary">
            Add the first iCal source to start importing reservations later.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {sources.map((source) => (
            <IcalSourceCard key={source.id} source={source} />
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="sectionTitle">Upcoming reservations</AppText>
        <AppText color="textMuted" variant="caption">
          {reservationsRuntime.mode === "api"
            ? "Loaded from protected backend reservations."
            : "Showing mock reservation data until sync is connected."}
        </AppText>
      </View>

      {reservations.length === 0 ? (
        <View style={styles.emptyCard}>
          <AppText variant="bodyStrong">No reservations imported yet</AppText>
          <AppText color="textSecondary">
            Sync an iCal source to start filling this operational list.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
            />
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="sectionTitle">Operational tasks</AppText>
        <AppText color="textMuted" variant="caption">
          Create tasks for this apartment and update execution status.
        </AppText>
      </View>

      {isTaskFormVisible ? (
        <TaskFormCard
          errors={taskFormErrors}
          isSubmitting={isTaskSubmitting}
          onCancel={resetTaskForm}
          onChange={updateTaskField}
          onSubmit={handleTaskSubmit}
          submitError={taskSubmitError}
          values={taskFormValues}
        />
      ) : (
        <Button
          accessibilityHint="Opens the task creation form."
          fullWidth={false}
          icon={<Plus color={theme.colors.surface} size={16} />}
          label="Create task"
          onPress={() => setIsTaskFormVisible(true)}
        />
      )}

      {tasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <AppText variant="bodyStrong">No tasks yet</AppText>
          <AppText color="textSecondary">
            Create the first task to coordinate cleaning, checkout, or prep.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <TaskCard
              isUpdating={updatingTaskId === task.id}
              key={task.id}
              onMarkDone={(selectedTask) =>
                void handleTaskStatus(selectedTask, "done")
              }
              onMarkNotDone={(selectedTask) =>
                void handleTaskStatus(selectedTask, "not_done")
              }
              task={task}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing[5],
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: theme.spacing[2],
  },
  list: {
    gap: theme.spacing[3],
  },
  sectionHeader: {
    gap: theme.spacing[1],
  },
  summaryCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  summaryTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
});

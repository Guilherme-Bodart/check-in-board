import { ArrowLeft, Building2, Plus } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, Screen } from "@/components";
import { useAuthSession } from "@/features/auth";
import { theme } from "@/theme";

import {
  ApartmentCard,
  ApartmentFormCard,
  ApartmentsEmptyState,
} from "../components";
import {
  apartmentsRuntime,
  createApartment,
  listApartments,
} from "../services/apartments-service";
import type {
  Apartment,
  ApartmentFieldErrors,
  ApartmentFormValues,
} from "../types";
import {
  defaultApartmentTimezone,
  hasApartmentErrors,
  toCreateApartmentInput,
  validateApartmentValues,
} from "../validation";

const initialFormValues: ApartmentFormValues = {
  name: "",
  timezone: defaultApartmentTimezone,
};
const todayRoute = "/today" as Href;

export function ApartmentsScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formValues, setFormValues] =
    useState<ApartmentFormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<ApartmentFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const nextApartments = await listApartments(session);
      setApartments(nextApartments);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not load apartments right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateField(field: keyof ApartmentFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
    setFormErrors((current) => ({
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

  async function handleSubmit() {
    const nextErrors = validateApartmentValues(formValues);
    setFormErrors(nextErrors);
    setSubmitError(null);

    if (hasApartmentErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const apartment = await createApartment(
        session,
        toCreateApartmentInput(formValues),
      );
      setApartments((current) => [apartment, ...current]);
      resetForm();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not save the apartment right now.",
      );
    } finally {
      setIsSubmitting(false);
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
            APARTMENTS
          </AppText>
          <AppText variant="titleLarge">Your operation inventory</AppText>
          <AppText color="textSecondary">
            Review the apartments your team manages and add the next one fast.
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <Button
            accessibilityHint="Returns to the today board."
            fullWidth={false}
            icon={<ArrowLeft color={theme.colors.textPrimary} size={16} />}
            label="Board"
            onPress={() => router.replace(todayRoute)}
            variant="ghost"
          />
          <Button
            accessibilityHint="Opens the apartment creation form."
            fullWidth={false}
            icon={<Plus color={theme.colors.surface} size={16} />}
            label="Add"
            onPress={() => setIsFormVisible(true)}
          />
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoTitle}>
          <Building2 color={theme.colors.primary} size={18} />
          <AppText variant="bodyStrong">
            {apartmentsRuntime.mode === "api"
              ? "Using backend apartments"
              : "Using local mock apartments"}
          </AppText>
        </View>
        <AppText color="textSecondary">
          {apartmentsRuntime.mode === "api"
            ? "Requests include your bearer token while the dev auth API is enabled."
            : "Create flow stays testable locally until GET /apartments and POST /apartments are ready."}
        </AppText>
      </View>

      {isFormVisible ? (
        <ApartmentFormCard
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
          accessibilityHint="Opens the apartment creation form."
          fullWidth={false}
          label="Create apartment"
          onPress={() => setIsFormVisible(true)}
          variant="secondary"
        />
      )}

      {apartments.length === 0 ? (
        <ApartmentsEmptyState onCreatePress={() => setIsFormVisible(true)} />
      ) : (
        <View style={styles.list}>
          {apartments.map((apartment) => (
            <ApartmentCard
              apartment={apartment}
              key={apartment.id}
              onOpenPress={() =>
                router.push(`/apartment/${apartment.id}` as Href)
              }
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
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[3],
    justifyContent: "space-between",
  },
  headerActions: {
    alignItems: "flex-end",
    gap: theme.spacing[2],
  },
  headerText: {
    flex: 1,
    gap: theme.spacing[2],
  },
  infoCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  infoTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  list: {
    gap: theme.spacing[3],
  },
});

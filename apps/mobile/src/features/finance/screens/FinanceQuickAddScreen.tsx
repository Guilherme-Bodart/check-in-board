import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Button, Screen } from "@/components";
import { listApartments } from "@/features/apartments/services/apartments-service";
import { useAuthSession } from "@/features/auth";
import { theme } from "@/theme";

import { parseMoneyToCents, todayDate } from "../format";
import {
  createExpense,
  createRentalStay,
  listRentalStays,
} from "../services/finance-service";
import {
  expenseCategoryOptions,
  type ExpenseCategory,
  type FinanceApartment,
  type FinanceRentalStay,
} from "../types";

export function FinanceQuickAddScreen() {
  const { session } = useAuthSession();
  const [apartments, setApartments] = useState<FinanceApartment[]>([]);
  const [rentalStays, setRentalStays] = useState<FinanceRentalStay[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState("");
  const [selectedExpenseApartmentId, setSelectedExpenseApartmentId] = useState("");
  const [selectedStayId, setSelectedStayId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [checkIn, setCheckIn] = useState(todayDate());
  const [checkOut, setCheckOut] = useState(todayDate());
  const [rentAmount, setRentAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayDate());
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] =
    useState<ExpenseCategory>("consumo");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStay, setIsSavingStay] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setIsLoading(true);
    setMessage("");

    try {
      const [nextApartments, nextRentalStays] = await Promise.all([
        listApartments(session),
        listRentalStays(session),
      ]);
      setApartments(nextApartments);
      setRentalStays(nextRentalStays);
      setSelectedApartmentId((current) => current || nextApartments[0]?.id || "");
      setSelectedExpenseApartmentId(
        (current) => current || nextApartments[0]?.id || "",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load finance data.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveStay() {
    const apartment = apartments.find((item) => item.id === selectedApartmentId);

    if (!apartment) {
      setMessage("Create an apartment before adding a stay.");
      return;
    }

    setIsSavingStay(true);
    setMessage("");

    try {
      await createRentalStay(session, {
        apartmentId: apartment.id,
        apartmentName: apartment.name,
        checkIn,
        checkOut,
        guestName,
        rentAmountCents: parseMoneyToCents(rentAmount),
      });
      setGuestName("");
      setRentAmount("");
      await load();
      setMessage("Stay saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save stay.");
    } finally {
      setIsSavingStay(false);
    }
  }

  async function saveExpense() {
    if (!selectedExpenseApartmentId) {
      setMessage("Create an apartment before adding an expense.");
      return;
    }

    setIsSavingExpense(true);
    setMessage("");

    try {
      await createExpense(session, {
        apartmentId: selectedExpenseApartmentId,
        rentalStayId: selectedStayId || undefined,
        category: expenseCategory,
        description: expenseDescription,
        amountCents: parseMoneyToCents(expenseAmount),
        occurredOn: expenseDate,
      });
      setExpenseDescription("");
      setExpenseAmount("");
      setSelectedStayId("");
      await load();
      setMessage("Expense saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save expense.",
      );
    } finally {
      setIsSavingExpense(false);
    }
  }

  return (
    <Screen loading={isLoading}>
      <View style={styles.header}>
        <AppText color="textSecondary" variant="label">
          Finance
        </AppText>
        <AppText variant="titleLarge">Quick add</AppText>
        <AppText color="textSecondary">
          Add stays and day-to-day expenses without opening the full web dashboard.
        </AppText>
      </View>

      {message ? (
        <View style={styles.banner}>
          <AppText color="textSecondary">{message}</AppText>
        </View>
      ) : null}

      <View style={styles.card}>
        <AppText variant="sectionTitle">New stay</AppText>
        <ChoiceRow
          items={apartments.map((apartment) => ({
            id: apartment.id,
            label: apartment.name,
          }))}
          onSelect={setSelectedApartmentId}
          selectedId={selectedApartmentId}
        />
        <Field
          onChangeText={setGuestName}
          placeholder="Guest name"
          value={guestName}
        />
        <View style={styles.row}>
          <Field onChangeText={setCheckIn} value={checkIn} />
          <Field onChangeText={setCheckOut} value={checkOut} />
        </View>
        <Field
          keyboardType="decimal-pad"
          onChangeText={setRentAmount}
          placeholder="Rent amount"
          value={rentAmount}
        />
        <Button
          label="Save stay"
          loading={isSavingStay}
          onPress={() => {
            void saveStay();
          }}
        />
      </View>

      <View style={styles.card}>
        <AppText variant="sectionTitle">New expense</AppText>
        <ChoiceRow
          items={apartments.map((apartment) => ({
            id: apartment.id,
            label: apartment.name,
          }))}
          onSelect={setSelectedExpenseApartmentId}
          selectedId={selectedExpenseApartmentId}
        />
        <ChoiceRow
          items={expenseCategoryOptions.map((category) => ({
            id: category.value,
            label: category.label,
          }))}
          onSelect={(value) => setExpenseCategory(value as ExpenseCategory)}
          selectedId={expenseCategory}
        />
        <ChoiceRow
          items={[
            { id: "", label: "No stay" },
            ...rentalStays.map((stay) => ({
              id: stay.id,
              label: stay.guestName || stay.apartmentName,
            })),
          ]}
          onSelect={setSelectedStayId}
          selectedId={selectedStayId}
        />
        <Field onChangeText={setExpenseDate} value={expenseDate} />
        <Field
          onChangeText={setExpenseDescription}
          placeholder="Description"
          value={expenseDescription}
        />
        <Field
          keyboardType="decimal-pad"
          onChangeText={setExpenseAmount}
          placeholder="Amount"
          value={expenseAmount}
        />
        <Button
          label="Save expense"
          loading={isSavingExpense}
          onPress={() => {
            void saveExpense();
          }}
        />
      </View>
    </Screen>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={theme.colors.textMuted} style={styles.input} />;
}

function ChoiceRow({
  items,
  onSelect,
  selectedId,
}: {
  items: Array<{ id: string; label: string }>;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  return (
    <View style={styles.choiceRow}>
      {items.map((item) => (
        <Button
          fullWidth={false}
          key={`${item.id}-${item.label}`}
          label={item.label}
          onPress={() => onSelect(item.id)}
          variant={item.id === selectedId ? "primary" : "secondary"}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  banner: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing[4],
    padding: theme.spacing[3],
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
    padding: theme.spacing[4],
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  input: {
    minHeight: 44,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing[3],
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
});

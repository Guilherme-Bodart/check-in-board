import { z } from "zod";

export const reservationSchema = z.object({
  apartmentId: z.string().min(1),
  endsAt: z.string().datetime(),
  externalEventKey: z.string().min(1),
  externalUid: z.string().nullable(),
  icalSourceId: z.string().min(1),
  id: z.string().min(1),
  provider: z.string().nullable(),
  rawSummary: z.string().nullable(),
  startsAt: z.string().datetime(),
  status: z.enum(["confirmed", "cancelled", "missing_in_feed"]),
});

export const listReservationsResponseSchema = z.object({
  reservations: z.array(reservationSchema),
});

export const manualSyncRequestSchema = z.object({
  icsText: z.string().min(1).optional(),
});

export const manualSyncResponseSchema = z.object({
  reservations: z.array(reservationSchema),
  summary: z.object({
    eventsSeen: z.number().int().min(0),
    reservationsUpserted: z.number().int().min(0),
  }),
});

const operationStatusSchema = z.enum([
  "checkInToday",
  "checkOutToday",
  "inStay",
  "upcoming",
]);

export const todayBoardResponseSchema = z.object({
  boardItems: z.array(
    z.object({
      actionLabel: z.string().min(1),
      apartment: z.string().min(1),
      assignee: z.string().min(1),
      headline: z.string().min(1),
      id: z.string().min(1),
      notes: z.string().min(1),
      status: operationStatusSchema,
      time: z.string().min(1),
    }),
  ),
  lastSyncLabel: z.string().min(1),
  notices: z.array(
    z.object({
      description: z.string().min(1),
      title: z.string().min(1),
      tone: z.enum(["success", "warning"]),
    }),
  ),
  summaryCards: z.array(
    z.object({
      helper: z.string().min(1),
      label: z.string().min(1),
      status: operationStatusSchema,
      value: z.string().min(1),
    }),
  ),
});

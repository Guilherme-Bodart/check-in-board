import { palette } from "./colors";

export const semanticColors = {
  background: palette.ink[50],
  surface: palette.white,
  surfaceMuted: palette.ink[100],
  border: palette.ink[200],
  textPrimary: palette.ink[950],
  textSecondary: palette.ink[600],
  textMuted: palette.ink[400],
  primary: palette.olive[600],
  primaryPressed: palette.olive[700],
  primarySoft: palette.olive[100],
  info: palette.blue[600],
  infoSoft: palette.blue[100],
  warning: palette.amber[500],
  warningSoft: palette.amber[100],
  danger: palette.red[600],
  dangerPressed: palette.red[700],
  dangerSoft: palette.red[100],
  success: palette.green[600],
  successSoft: palette.green[100],
} as const;

export const operationStatusColors = {
  checkInToday: "info",
  checkOutToday: "warning",
  inStay: "success",
  upcoming: "primary",
  overdue: "danger",
  completed: "success",
  failed: "danger",
  syncIssue: "warning",
  pending: "warning",
} as const;

export type SemanticColorName = keyof typeof semanticColors;
export type OperationStatus = keyof typeof operationStatusColors;

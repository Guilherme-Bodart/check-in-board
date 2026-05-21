export const palette = {
  ink: {
    950: "#151515",
    800: "#2A2A2A",
    600: "#555555",
    400: "#8A8A8A",
    200: "#D7D7D7",
    100: "#ECECEC",
    50: "#F7F7F5",
  },
  olive: {
    700: "#3D4A2E",
    600: "#52633C",
    100: "#E6EBD9",
  },
  blue: {
    700: "#1F4D63",
    600: "#2D6D85",
    100: "#DCECF1",
  },
  amber: {
    700: "#8A5A12",
    500: "#C4871D",
    100: "#F5E6C8",
  },
  red: {
    700: "#8C2F2F",
    600: "#B33A3A",
    100: "#F4DADA",
  },
  green: {
    700: "#2D6040",
    600: "#3B7D53",
    100: "#DDEBDD",
  },
  white: "#FFFFFF",
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const typography = {
  titleLarge: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  titleMedium: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  sectionTitle: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  body: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
  },
  bodyStrong: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  caption: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  label: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
} as const;

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

export const theme = {
  palette,
  colors: semanticColors,
  radius,
  spacing,
  typography,
  operationStatusColors,
} as const;

export type Theme = typeof theme;
export type SemanticColorName = keyof typeof semanticColors;
export type OperationStatus = keyof typeof operationStatusColors;

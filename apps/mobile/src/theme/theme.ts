import { palette } from "./colors";
import { radius } from "./radius";
import { operationStatusColors, semanticColors } from "./semantic-colors";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const theme = {
  palette,
  colors: semanticColors,
  radius,
  spacing,
  typography,
  operationStatusColors,
} as const;

export type Theme = typeof theme;

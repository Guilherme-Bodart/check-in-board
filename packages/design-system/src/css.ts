import { radius, semanticColors, spacing } from "./tokens";

export const cssVariables = {
  "--cib-color-background": semanticColors.background,
  "--cib-color-surface": semanticColors.surface,
  "--cib-color-surface-muted": semanticColors.surfaceMuted,
  "--cib-color-border": semanticColors.border,
  "--cib-color-text-primary": semanticColors.textPrimary,
  "--cib-color-text-secondary": semanticColors.textSecondary,
  "--cib-color-text-muted": semanticColors.textMuted,
  "--cib-color-primary": semanticColors.primary,
  "--cib-color-primary-pressed": semanticColors.primaryPressed,
  "--cib-color-primary-soft": semanticColors.primarySoft,
  "--cib-color-info": semanticColors.info,
  "--cib-color-info-soft": semanticColors.infoSoft,
  "--cib-color-warning": semanticColors.warning,
  "--cib-color-warning-soft": semanticColors.warningSoft,
  "--cib-color-danger": semanticColors.danger,
  "--cib-color-danger-soft": semanticColors.dangerSoft,
  "--cib-color-success": semanticColors.success,
  "--cib-color-success-soft": semanticColors.successSoft,
  "--cib-radius-xs": `${radius.xs}px`,
  "--cib-radius-sm": `${radius.sm}px`,
  "--cib-radius-md": `${radius.md}px`,
  "--cib-radius-lg": `${radius.lg}px`,
  "--cib-space-1": `${spacing[1]}px`,
  "--cib-space-2": `${spacing[2]}px`,
  "--cib-space-3": `${spacing[3]}px`,
  "--cib-space-4": `${spacing[4]}px`,
  "--cib-space-5": `${spacing[5]}px`,
  "--cib-space-6": `${spacing[6]}px`,
  "--cib-space-8": `${spacing[8]}px`,
  "--cib-space-10": `${spacing[10]}px`,
} as const;

export function cssVariablesText(selector = ":root") {
  const declarations = Object
    .entries(cssVariables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  return `${selector} {\n${declarations}\n}`;
}

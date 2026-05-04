import { Platform } from "react-native";

const fontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const typography = {
  titleLarge: {
    fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  titleMedium: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  sectionTitle: {
    fontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
  },
  bodyStrong: {
    fontFamily,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  caption: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  label: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
} as const;

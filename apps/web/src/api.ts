const fallbackApiUrl = "http://localhost:3333";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? fallbackApiUrl;

export type BoardMetric = {
  label: string;
  value: string;
  tone: "info" | "warning" | "success" | "danger";
};

export type ReservationRow = {
  apartment: string;
  channel: string;
  guest: string;
  status: string;
  time: string;
};

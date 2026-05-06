export type ApartmentStatus = "active";

export type Apartment = {
  id: string;
  name: string;
  status: ApartmentStatus;
  timezone: string;
};

export type IcalSource = {
  id: string;
  provider: string;
  label: string;
  syncEnabled: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

export type IcalSyncSummary = {
  eventsSeen: number;
  reservationsUpserted: number;
  syncSkipped?: boolean;
  syncSkippedReason?: string | null;
};

export type ApartmentFormValues = {
  name: string;
  timezone: string;
};

export type ApartmentFieldErrors = Partial<
  Record<keyof ApartmentFormValues, string>
>;

export type CreateApartmentInput = {
  name: string;
  timezone: string;
};

export type IcalSourceFormValues = {
  provider: string;
  label: string;
  icalUrl: string;
};

export type IcalSourceFieldErrors = Partial<
  Record<keyof IcalSourceFormValues, string>
>;

export type CreateIcalSourceInput = {
  provider: string;
  label: string;
  icalUrl: string;
};

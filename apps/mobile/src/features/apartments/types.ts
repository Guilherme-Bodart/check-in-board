export type ApartmentStatus = "active";

export type Apartment = {
  id: string;
  name: string;
  status: ApartmentStatus;
  timezone: string;
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

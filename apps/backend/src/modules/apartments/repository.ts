import type {
  ApartmentSummary,
  CreateApartmentInput,
  PrimaryOrganizationAccess,
} from "./types.js";

export type CreateApartmentForUserInput = CreateApartmentInput & {
  organizationId: string;
  userId: string;
};

export interface ApartmentsRepository {
  createApartmentForUser(
    input: CreateApartmentForUserInput,
  ): Promise<ApartmentSummary>;
  getPrimaryOrganizationAccess(
    userId: string,
  ): Promise<PrimaryOrganizationAccess | null>;
  listAccessibleApartments(userId: string): Promise<ApartmentSummary[]>;
}

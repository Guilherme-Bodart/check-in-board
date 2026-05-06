import type {
  ApartmentIcalAccess,
  CreateIcalSourceInput,
  IcalSourceSummary,
} from "./types.js";

export type CreateIcalSourceRecordInput = CreateIcalSourceInput & {
  createdByUserId: string;
  icalUrlEncrypted: string;
};

export interface IcalSourcesRepository {
  createIcalSource(
    input: CreateIcalSourceRecordInput,
  ): Promise<IcalSourceSummary>;
  getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentIcalAccess | null>;
  listIcalSources(apartmentId: string): Promise<IcalSourceSummary[]>;
}

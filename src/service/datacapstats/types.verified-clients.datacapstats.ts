export interface DataCapStatsVerifiedClientsResponse {
  count: string;
  data: DataCapStatsVerifiedClientsData[];
  name: string;
  remainingDatacap: string;
  addressId: string;
  address: string;
}

export interface DataCapStatsVerifiedClientsData {
  id: number;
  addressId: string;
  address: string;
  retries: number;
  auditTrail: string;
  name: string;
  orgName: string;
  initialAllowance: string;
  allowance: string;
  verifierAddressId: string;
  createdAtHeight: number;
  issueCreateTimestamp: null;
  createMessageTimestamp: number;
  verifierName: string;
  dealCount: number | null;
  providerCount: number | null;
  topProvider: null | string;
  receivedDatacapChange: string;
  usedDatacapChange: string;
  allowanceArray: AllowanceArray[];
  region: Region;
  website: string;
  industry: Industry;
  usedDatacap: string;
  remainingDatacap: string;
}

export interface AllowanceArray {
  id: number;
  error: Error;
  height: number;
  msgCID: string;
  retries: number;
  addressId: string;
  allowance: string;
  auditTrail: string;
  allowanceTTD: number;
  isDataPublic: string;
  issueCreator: string;
  providerList: any[];
  usedAllowance: string;
  isLdnAllowance: boolean;
  isEFilAllowance: boolean;
  verifierAddressId: string;
  isFromAutoverifier: boolean;
  retrievalFrequency: string;
  searchedByProposal: boolean;
  issueCreateTimestamp: number;
  hasRemainingAllowance: boolean;
  createMessageTimestamp: number;
}

export enum Error {}

export enum Industry {}

export enum Region {}

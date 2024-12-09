export interface DataCapStatsVerifiedClientsResponse {
  count: string;
  data: DataCapStatsVerifiedClientsData[];
  name: 'Public Open Dataset Pathway';
  remainingDatacap: string;
  addressId: 'f03015751';
  address: string;
}

export interface DataCapStatsVerifiedClientsData {
  id: number;
  addressId: string;
  address: string;
  retries: number;
  auditTrail: 'n/a';
  name: string;
  orgName: string;
  initialAllowance: string;
  allowance: string;
  verifierAddressId: 'f03015751';
  createdAtHeight: number;
  issueCreateTimestamp: null;
  createMessageTimestamp: number;
  verifierName: 'Public Open Dataset Pathway';
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
  verifierAddressId: 'f03015751';
  isFromAutoverifier: boolean;
  retrievalFrequency: string;
  searchedByProposal: boolean;
  issueCreateTimestamp: number;
  hasRemainingAllowance: boolean;
  createMessageTimestamp: number;
}

export enum Error {
  AllocationEventNotFound = 'allocation event not found',
  Empty = '',
}

export enum Industry {
  Empty = '',
  Environment = 'Environment',
}

export enum Region {
  China = 'China',
  Empty = '',
}

export interface VerifiedClientResponse {
  totalRemainingDatacap: string;
  clientsWithActiveDeals: string;
  countOfClientsWhoHaveDcAndDeals: string;
  numberOfClients: string;
  count: string;
  data: VerifiedClientData[];
}

export interface VerifiedClientData {
  id: number;
  addressId: string;
  address: string;
  retries: number;
  auditTrail: string;
  name: string;
  orgName: null | string;
  initialAllowance: string;
  allowance: string;
  verifierAddressId: string;
  createdAtHeight: number;
  issueCreateTimestamp: null;
  createMessageTimestamp: number;
  verifierName: string;
  dealCount: number;
  providerCount: number;
  topProvider: string;
  receivedDatacapChange: string;
  usedDatacapChange: string;
  allowanceArray: VerifiedClientAllowance[];
  region: string;
  website: null | string;
  industry: string;
  usedDatacap: string;
  remainingDatacap: string;
}

export interface VerifiedClientAllowance {
  id: number;
  error: string;
  height: number;
  msgCID: string;
  retries: number;
  addressId: string;
  allowance: string;
  auditTrail: null | string;
  allowanceTTD: number;
  isDataPublic: string;
  issueCreator: null | string;
  providerList: any[];
  usedAllowance: string;
  isLdnAllowance: boolean;
  isEFilAllowance: boolean;
  verifierAddressId: string;
  isFromAutoverifier: boolean;
  retrievalFrequency: string;
  searchedByProposal: boolean;
  issueCreateTimestamp: number | null;
  hasRemainingAllowance: boolean;
  createMessageTimestamp: number;
}

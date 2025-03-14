export interface DataCapStatsVerifiedClientsResponse {
  count: string;
  data: DataCapStatsVerifiedClientData[]; // two entries for client using metaallocators
  virtualAllocators?: DataCapStatsVerifiedClientVirtualAllocators[]; // for metaallocators only
  totalRemainingDatacap: string;
  clientsWithActiveDeals: string;
  countOfClientsWhoHaveDcAndDeals: string;
  numberOfClients: string;
}

export interface DataCapStatsVerifiedClientVirtualAllocators {
  addressId: string;
  address: string;
  addressEth: string;
  name: string;
}

export interface DataCapStatsVerifiedClientData {
  id: number;
  addressId: string;
  address: string;
  retries: number;
  auditTrail: string | null;
  name: string;
  orgName: string | null;
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
  allowanceArray: {
    id: number;
    error: string;
    height: number;
    msgCID: string;
    retries: number;
    addressId: string;
    allowance: string;
    auditTrail: string | null;
    allowanceTTD: number;
    isDataPublic: string;
    issueCreator: string | null;
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
  }[];
  region: string;
  website: string | null;
  industry: string;
  usedDatacap: string;
  remainingDatacap: string;
}

export interface DataCapStatsPublicVerifiedClientsResponse {
  count: string;
  data: DataCapStatsVerifiedClientData[];
  name: string;
  remainingDatacap: string;
  addressId: string;
  address: string;
}

export interface DataCapStatsVerifiersResponse {
  count: string;
  data: DataCapStatsVerifierData[];
}

export interface DataCapStatsVerifierData {
  id: number;
  addressId: string;
  address: string;
  retries: number;
  auditTrail: string | null;
  name: string | null;
  orgName: string | null;
  initialAllowance: string;
  allowance: string;
  removed: boolean;
  inffered: boolean;
  isMultisig: boolean;
  createdAtHeight: number;
  issueCreateTimestamp: number | null;
  createMessageTimestamp: number;
  verifiedClientsCount: number;
  receivedDatacapChange: string;
  allowanceArray: {
    id: number;
    error: string;
    height: number;
    msgCID: string;
    retries: number;
    addressId: string;
    allowance: string;
    auditTrail: string | null;
    verifierId: number;
    auditStatus: any;
    issueCreateTimestamp: number | null;
    createMessageTimestamp: number;
  }[];
  auditStatus: any;
  remainingDatacap: string;
}

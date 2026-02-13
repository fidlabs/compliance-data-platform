export class ClientAllowanceItem {
  addressId: string;
  verifierAddressId: string;
  allowance: number | null;
  auditTrail: string | null;
  issueCreateTimestamp: number | null;
  createMessageTimestamp: number;
}

export class ClientWithAllowance {
  addressId: string;
  address: string;
  name: string;
  orgName: string;
  verifierAddressId: string;
  allowanceArray: ClientAllowanceItem[] | null;
}

export class ClientWithBookkeeping {
  allocatorId: string;
  clientId: string;
  clientAddress: string;
  bookkeepingInfo: ClientBookkeepingInfo;
}

export class ClientBookkeepingInfo {
  isPublicDataset: boolean | null;
  clientContractAddress: string | null;
  storageProviderIDsDeclared: string[];
  totalRequestedAmount: bigint | null;
  expectedSizeOfSingleDataset: bigint | null;
  clientName: string | null;
}

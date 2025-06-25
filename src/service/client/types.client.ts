import { Decimal } from '@prisma/client/runtime/library';

export class ClientWithAllowance {
  addressId: string;
  address: string;
  name: string;
  orgName: string;
  verifierAddressId: string;
  allowanceArray: {
    addressId: string;
    verifierAddressId: string;
    allowance: number | null;
    auditTrail: string | null;
    issueCreateTimestamp: number | null;
    createMessageTimestamp: number;
  }[];
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
}

export class ClientLatestClaim {
  id: number;
  clientId: string;
  dealId: number;
  isDDO: boolean;
  type: string;
  providerId: string;
  pieceCid: string;
  pieceSize: Decimal;
  createdAt: Date;
}

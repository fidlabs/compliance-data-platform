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
  bookkeepingInfo: any;
}

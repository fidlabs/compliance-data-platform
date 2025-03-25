export class ClientWithAllowance {
  addressId: string;
  address: string;
  name: string;
  orgName: string;
  verifierAddressId: string;
  allowanceArray: {
    addressId: string;
    verifierAddressId: string;
    allowance: number;
    auditTrail: string | null;
    issueCreateTimestamp: number | null;
    createMessageTimestamp: number;
  }[];
}

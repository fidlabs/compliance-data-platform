export interface DataCapStatsVerifiersResponse {
  count: string;
  data: DataCapStatsVerifierData[];
}

export interface DataCapStatsVerifierData {
  id: number;
  addressId: string;
  address: string;
  auditTrail: string;
  retries: number;
  name: null | string;
  orgName: null | string;
  removed: boolean;
  initialAllowance: string;
  allowance: string;
  inffered: boolean;
  isMultisig: boolean;
  createdAtHeight: number;
  issueCreateTimestamp: number | null;
  createMessageTimestamp: number;
  verifiedClientsCount: number;
  receivedDatacapChange: string;
  allowanceArray: AllowanceArray[];
  auditStatus: AuditStatus | null;
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
  auditTrail: null | string;
  verifierId: number;
  auditStatus: AuditStatus | null;
  issueCreateTimestamp: number | null;
  createMessageTimestamp: number;
}

export enum AuditStatus {
  Failed = 'failed',
  NotAudited = 'notAudited',
  Passed = 'passed',
  PassedConditionally = 'passedConditionally',
}

export enum Error {
  Empty = '',
  FoundMultipleIssuesForThisCid = 'found multiple issues for this cid',
}

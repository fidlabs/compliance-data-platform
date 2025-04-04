// noinspection SpellCheckingInspection,JSUnusedGlobalSymbols

export interface LotusStateMinerInfoResponse {
  jsonrpc: string;
  result: Result;
  id: number;
}

export interface LotusStateLookupIdResponse {
  jsonrpc: string;
  result: string;
  error?: Error;
  id: number;
}

export interface Error {
  code: number;
  message: string;
}

export interface Result {
  Beneficiary: string;
  BeneficiaryTerm: BeneficiaryTerm;
  ConsensusFaultElapsed: number;
  ControlAddresses: string[];
  Multiaddrs: string[];
  NewWorker: string;
  Owner: string;
  PeerId: string | null;
  PendingBeneficiaryTerm: null;
  PendingOwnerAddress: null;
  SectorSize: number;
  WindowPoStPartitionSectors: number;
  WindowPoStProofType: number;
  Worker: string;
  WorkerChangeEpoch: number;
}

export interface BeneficiaryTerm {
  Expiration: number;
  Quota: string;
  UsedQuota: string;
}

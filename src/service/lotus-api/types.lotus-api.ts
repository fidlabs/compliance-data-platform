// noinspection SpellCheckingInspection,JSUnusedGlobalSymbols

export interface LotusStateVerifiedClientStatusResponse {
  jsonrpc: string;
  result?: string;
  error?: LotusError;
  id: number;
}

export interface LotusStateMinerInfoResponse {
  jsonrpc: string;
  result: LotusStateMinerInfoResult;
  id: number;
}

export interface LotusStateLookupIdResponse {
  jsonrpc: string;
  result: string;
  error?: LotusError;
  id: number;
}

export interface LotusError {
  code: number;
  message: string;
}

export interface LotusStateMinerInfoResult {
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

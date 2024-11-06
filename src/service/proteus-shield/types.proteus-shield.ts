export interface ProteusResponse {
  jsonrpc: string;
  result: Result;
  id: number;
}

export interface Result {
  Beneficiary: string;
  BeneficiaryTerm: BeneficiaryTerm;
  ConsensusFaultElapsed: number;
  ControlAddresses: string[];
  Multiaddrs: string[];
  NewWorker: string;
  Owner: string;
  PeerId: string;
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

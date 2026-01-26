export type ClientAllocations = {
  clientId: string;
  allocations: {
    id: string;
    allocatorReportId: string;
    clientId: string;
    allocation: bigint;
    timestamp: Date;
  }[];
  totalRequestedAmount: bigint;
};

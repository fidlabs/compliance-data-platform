import { ClientReportCheck } from 'prisma/generated/client';

export const CLIENT_REPORT_CHECK_FAIL_MESSAGE_MAP: Record<
  keyof typeof ClientReportCheck,
  string
> = {
  [ClientReportCheck.DEAL_DATA_REPLICATION_CID_SHARING]:
    'CID sharing has been observed',
  [ClientReportCheck.DEAL_DATA_REPLICATION_HIGH_REPLICA]:
    'High replica percentage is observed',
  [ClientReportCheck.DEAL_DATA_REPLICATION_LOW_REPLICA]:
    'Low replica percentage is observed',
  [ClientReportCheck.INACTIVITY]:
    'Client has unspent DataCap and was inactive for more than a month',
  [ClientReportCheck.MULTIPLE_ALLOCATORS]:
    'Client receiving datacap from more than one allocator',
  [ClientReportCheck.NOT_ENOUGH_COPIES]:
    'Not enough copies of data is observed',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION]:
    'All storage providers are located in the same region is observed',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_DECLARED_NOT_USED]:
    'Not all declared in application files not actually used is observed',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION]:
    'Too much duplicate data is observed',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL]:
    'Storage provider distribution exceed more than the MAX of total datacap',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING]:
    'Storage providers IPNI reporting (1/2) have misreported their data to IPNI',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING]:
    'Storage providers IPNI reporting (2/2) have not reported their data to IPNI',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_NOT_DECLARED]:
    'Not all actual storage providers are declared in application file',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75]:
    'Storage provider retrievability have retrieval success rate less than 75%',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO]:
    'Storage provider retrievability (1/2) have retrieval success rate equal to zero',
  [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION]:
    'Storage provider locations have unknown IP location',
  [ClientReportCheck.UNIQ_DATA_SET_SIZE_TO_DECLARED]:
    'Unique data set size exceeds declared',
};

// noinspection SpellCheckingInspection,JSUnusedGlobalSymbols

export interface AllocatorTechApplicationsResponse {
  Version: number | string;
  ID: string;
  'Issue Number': string;
  Client: Client;
  Project: Project;
  Datacap: Datacap;
  Lifecycle: Lifecycle;
  'Allocation Requests': AllocationRequest[];
}

export interface AllocationRequest {
  ID: string;
  'Request Type': RequestType;
  'Created At': string;
  'Updated At': string;
  Active: boolean;
  'Allocation Amount': string;
  Signers: Signer[];
}

export enum RequestType {
  First = 'First',
  Refill = 'Refill',
}

export interface Signer {
  'Github Username': string;
  'Signing Address': string;
  'Created At': string;
  'Message CID': string;
}

export interface Client {
  Name: string;
  Region: string;
  Industry: Industry;
  Website: string;
  'Social Media': string;
  'Social Media Type': SocialMediaType;
  Role: string;
}

export enum Industry {
  ArtsRecreation = 'Arts & Recreation',
  ConstructionPropertyRealEstate = 'Construction, Property & Real Estate',
  EducationTraining = 'Education & Training',
  Empty = '',
  Environment = 'Environment',
  FinancialServices = 'Financial Services',
  Government = 'Government',
  ITTechnologyServices = 'IT & Technology Services',
  InformationMediaTelecommunications = 'Information, Media & Telecommunications',
  LifeScienceHealthcare = 'Life Science / Healthcare',
  NotForProfit = 'Not-for-Profit',
  Other = 'Other',
  ProfessionalServicesLegalConsultingAdvising = 'Professional Services (Legal, Consulting, Advising)',
  ResourcesAgricultureFisheries = 'Resources, Agriculture & Fisheries',
  Utilities = 'Utilities',
  Web3Crypto = 'Web3 / Crypto',
}

export enum SocialMediaType {
  Facebook = 'Facebook',
  Other = 'Other',
  Slack = 'Slack',
  Twitter = 'Twitter',
  WeChat = 'WeChat',
}

export interface Datacap {
  Type: Type;
  'Data Type': DataType;
  'Total Requested Amount': string;
  'Single Size Dataset': string;
  Replicas: number;
  'Weekly Allocation': string;
}

export enum DataType {
  PrivateCommercialEnterprise = 'Private Commercial/Enterprise',
  Slingshot = 'Slingshot',
}

export enum Type {
  LdnV3 = 'ldn-v3',
}

export interface Lifecycle {
  State: State;
  'Validated At': string;
  'Validated By': string;
  Active: boolean;
  'Updated At': string;
  'Active Request ID': string;
  'On Chain Address': string;
  'Multisig Address': string;
  edited: boolean | null;
}

export enum State {
  AdditionalInfoRequired = 'AdditionalInfoRequired',
  ChangesRequested = 'ChangesRequested',
  Granted = 'Granted',
  KYCRequested = 'KYCRequested',
  ReadyToSign = 'ReadyToSign',
  Submitted = 'Submitted',
}

export interface Project {
  'Brief history of your project and organization': string;
  'Is this project associated with other projects/ecosystem stakeholders?': CanYouConfirmThatYouWillFollowTheFilGuidelineDataOwnerShouldEngageAtLeast4_SPSAndNoSingleSPIDShouldReceive30_OfAClientSAllocatedDataCap;
  'Describe the data being stored onto Filecoin': string;
  'Where was the data currently stored in this dataset sourced from': WhereWasTheDataCurrentlyStoredInThisDatasetSourcedFrom;
  'How do you plan to prepare the dataset': string;
  'Please share a sample of the data (a link to a file, an image, a table, etc., are good ways to do this.)': string;
  'Confirm that this is a public dataset that can be retrieved by anyone on the network (i.e., no specific permissions or access rights are required to view the data)': ConfirmThatThisIsAPublicDatasetThatCanBeRetrievedByAnyoneOnTheNetworkIENoSpecificPermissionsOrAccessRightsAreRequiredToViewTheData;
  'What is the expected retrieval frequency for this data': WhatIsTheExpectedRetrievalFrequencyForThisData;
  'For how long do you plan to keep this dataset stored on Filecoin': ForHowLongDoYouPlanToKeepThisDatasetStoredOnFilecoin;
  'In which geographies do you plan on making storage deals': string;
  'How will you be distributing your data to storage providers': string;
  'Please list the provider IDs and location of the storage providers you will be working with. Note that it is a requirement to list a minimum of 5 unique provider IDs, and that your client address will be verified against this list in the future': string;
  "Can you confirm that you will follow the Fil+ guideline (Data owner should engage at least 4 SPs and no single SP ID should receive >30% of a client's allocated DataCap)": CanYouConfirmThatYouWillFollowTheFilGuidelineDataOwnerShouldEngageAtLeast4_SPSAndNoSingleSPIDShouldReceive30_OfAClientSAllocatedDataCap;
}

export enum CanYouConfirmThatYouWillFollowTheFilGuidelineDataOwnerShouldEngageAtLeast4_SPSAndNoSingleSPIDShouldReceive30_OfAClientSAllocatedDataCap {
  Empty = '',
  No = 'No',
  Yes = 'Yes',
}

export enum ConfirmThatThisIsAPublicDatasetThatCanBeRetrievedByAnyoneOnTheNetworkIENoSpecificPermissionsOrAccessRightsAreRequiredToViewTheData {
  Confirm = 'Confirm',
  ConfirmThatThisIsAPublicDatasetThatCanBeRetrievedByAnyoneOnTheNetworkIENoSpecificPermissionsOrAccessRightsAreRequiredToViewTheDataXIConfirm = '[x] I confirm',
  Empty = '',
  IConfirm = '[ ] I confirm',
  No = 'No',
  XIConfirm = '[X] I confirm',
}

export enum ForHowLongDoYouPlanToKeepThisDatasetStoredOnFilecoin {
  Empty = '',
  LessThan1Year = 'Less than 1 year',
  MoreThan3Years = 'More than 3 years',
  Permanently = 'Permanently',
  The12Months = '12 months',
  The15To2Years = '1.5 to 2 years',
  The1To15Years = '1 to 1.5 years',
  The2To3Years = '2 to 3 years',
}

export enum WhatIsTheExpectedRetrievalFrequencyForThisData {
  Daily = 'Daily',
  Empty = '',
  Monthly = 'Monthly',
  Never = 'Never',
  Sporadic = 'Sporadic',
  Weekly = 'Weekly',
  Yearly = 'Yearly',
}

export enum WhereWasTheDataCurrentlyStoredInThisDatasetSourcedFrom {
  AWSCloud = 'AWS Cloud',
  Empty = '',
  GoogleCloud = 'Google Cloud',
  MyOwnStorageInfra = 'My Own Storage Infra',
  Other = 'Other',
}

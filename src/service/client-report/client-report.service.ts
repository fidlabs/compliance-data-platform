import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';
import { getFilPlusEditionByTimestamp } from 'src/utils/filplus-edition';
import { Retryable } from 'src/utils/retryable';
import { AllocatorService } from '../allocator/allocator.service';
import { ClientReportChecksService } from '../client-report-checks/client-report-checks.service';
import { ClientService } from '../client/client.service';
import { EthApiService } from '../eth-api/eth-api.service';
import { LotusApiService } from '../lotus-api/lotus-api.service';
import { StorageProviderReportService } from '../storage-provider-report/storage-provider-report.service';
import { StorageProviderUrlFinderService } from '../storage-provider-url-finder/storage-provider-url-finder.service';

@Injectable()
export class ClientReportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly clientReportChecksService: ClientReportChecksService,
    private readonly storageProviderReportService: StorageProviderReportService,
    private readonly clientService: ClientService,
    private readonly allocatorService: AllocatorService,
    private readonly ethApiService: EthApiService,
    private readonly lotusApiService: LotusApiService,
    private readonly storageProviderUrlFinderService: StorageProviderUrlFinderService,
  ) {}

  public async generateReport(clientIdOrAddress: string, returnFull = false) {
    const clientData =
      await this.clientService.getClientData(clientIdOrAddress);

    if (!clientData?.length) return null;

    const allocators = clientData.map((c) => c.verifierAddressId);
    const mainAllocatorId = // take first non-glif allocator addressId
      allocators?.[0] === GlifAutoVerifiedAllocatorId && allocators?.length > 1
        ? allocators[1]
        : allocators?.[0];

    const clientName = clientData.find((c) => c.name)?.name?.trim() ?? null;
    const clientOrgName =
      clientData.find((c) => c.orgName)?.orgName?.trim() ?? null;

    const [
      storageProviderDistribution,
      replicaDistribution,
      cidSharing,
      mainAllocatorRegistryInfo,
      bookkeepingInfo,
    ] = await Promise.all([
      this.storageProviderReportService.getStorageProviderDistribution(
        clientData[0].addressId,
      ),
      this.clientService.getReplicationDistribution(clientData[0].addressId),
      this.clientService.getCidSharing(clientData[0].addressId),
      this.allocatorService.getAllocatorRegistryInfo(mainAllocatorId),
      this.clientService.getClientBookkeepingInfo(clientData[0].addressId),
    ]);

    const maxDeviation = bookkeepingInfo?.clientContractAddress
      ? await this.ethApiService.getClientContractMaxDeviation(
          bookkeepingInfo.clientContractAddress,
          clientData[0].addressId,
        )
      : null;

    const clientApplicationTimestamp =
      clientData[0].allowanceArray?.[0]?.issueCreateTimestamp;

    const filPlusEdition = clientApplicationTimestamp
      ? getFilPlusEditionByTimestamp(clientApplicationTimestamp)
      : null;

    const storageProviderDistributions =
      (await Promise.all(
        storageProviderDistribution?.map(async (provider) => {
          return {
            ...provider,
            piece_working_url: (
              await this.storageProviderUrlFinderService.fetchLastStorageProviderData(
                provider.provider,
                clientData[0].addressId,
              )
            ).working_url,
            declared_in_application_file:
              bookkeepingInfo?.storageProviderIDsDeclared?.includes(
                provider.provider,
              ),
            ...(provider.location && {
              location: {
                create: provider.location,
              },
            }),
          };
        }),
      )) ?? [];

    const isPublicDataset =
      (await this.allocatorService.isAllocatorOpenData(
        mainAllocatorId,
        mainAllocatorRegistryInfo,
      )) ?? bookkeepingInfo?.isPublicDataset;

    const report = await this.prismaService.client_report.create({
      data: {
        client: clientData[0].addressId,
        client_address: clientData[0].address,
        allocators: allocators,
        avg_secs_to_first_deal:
          await this.clientService.getAverageSecondsToFirstDeal(
            clientData[0].addressId,
          ),
        low_replica_threshold: filPlusEdition?.lowReplicaThreshold ?? null,
        high_replica_threshold: filPlusEdition?.highReplicaThreshold ?? null,
        allocator_required_copies:
          mainAllocatorRegistryInfo?.application.required_replicas,
        allocator_required_sps:
          mainAllocatorRegistryInfo?.application.required_sps,
        organization_name: clientName || clientOrgName,
        application_url: this.clientService.getClientApplicationUrl(
          clientData[0],
        ),
        is_public_dataset: isPublicDataset,
        using_client_contract: !!bookkeepingInfo?.clientContractAddress,
        storage_provider_ids_declared:
          bookkeepingInfo?.storageProviderIDsDeclared,
        client_contract_max_deviation: maxDeviation,
        available_datacap: await this.lotusApiService.getClientDatacap(
          clientData[0].addressId,
        ),
        last_datacap_spent: await this.clientService.getLastDatacapSpent(
          clientData[0].addressId,
        ),
        last_datacap_received: await this.clientService.getLastDatacapReceived(
          clientData[0].addressId,
        ),
        total_requested_amount: bookkeepingInfo?.totalRequestedAmount,
        expected_size_of_single_dataset:
          bookkeepingInfo?.expectedSizeOfSingleDataset,
        total_uniq_data_set_size: replicaDistribution?.reduce(
          (acc, cur) => acc + cur.unique_data_size,
          0n,
        ),
        storage_provider_distribution: {
          create: storageProviderDistributions,
        },
        replica_distribution: {
          create: replicaDistribution,
        },
        cid_sharing: {
          create: await Promise.all(
            cidSharing.map(async (c) => ({
              ...c,
              other_client_application_url:
                this.clientService.getClientApplicationUrl(
                  (await this.clientService.getClientData(c.other_client))[0],
                ),
            })),
          ),
        },
      },
    });

    await this.clientReportChecksService.storeReportChecks(report.id);

    return this.getReport(report.client, report.id, returnFull);
  }

  public async getReports(clientIdOrAddress: string) {
    return await this.prismaService.client_report.findMany({
      where: {
        OR: [
          {
            client: clientIdOrAddress,
          },
          {
            client_address: clientIdOrAddress,
          },
        ],
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  public async getLatestReport(clientIdOrAddress: string, full = false) {
    return this.getReport(clientIdOrAddress, undefined, full);
  }

  @Retryable({ retries: 3, delay: 5000 }) // 5 seconds
  public async getReport(clientIdOrAddress: string, id?: any, full = false) {
    return this.prismaService.client_report.findFirst({
      where: {
        OR: [
          {
            client: clientIdOrAddress,
            id: id ?? undefined,
          },
          {
            client_address: clientIdOrAddress,
            id: id ?? undefined,
          },
        ],
      },
      include: {
        storage_provider_distribution: {
          omit: {
            ...(!full && {
              id: true,
              client_report_id: true,
            }),
          },
          include: {
            location: {
              omit: {
                ...(!full && {
                  id: true,
                  provider_distribution_id: true,
                }),
              },
            },
          },
        },
        replica_distribution: {
          omit: {
            ...(!full && {
              id: true,
              client_report_id: true,
            }),
          },
        },
        cid_sharing: {
          omit: {
            ...(!full && {
              id: true,
              client_report_id: true,
            }),
          },
        },
        check_results: {
          omit: {
            id: true,
            create_date: true,
            client_report_id: true,
          },
        },
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }
}

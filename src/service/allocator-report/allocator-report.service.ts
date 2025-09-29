import { Injectable, Logger } from '@nestjs/common';
import { getAllocatorsFull } from 'prismaDmob/generated/client/sql';
import { PaginationInfo } from 'src/controller/base/types.controller-base';
import { PrismaService } from 'src/db/prisma.service';
import { PrismaDmobService } from 'src/db/prismaDmob.service';
import { Retryable } from 'src/utils/retryable';
import { bigIntDiv } from 'src/utils/utils';
import { AllocatorReportChecksService } from '../allocator-report-checks/allocator-report-checks.service';
import { AllocatorScoringService } from '../allocator-scoring/allocator-scoring.service';
import { AllocatorService } from '../allocator/allocator.service';
import { ClientService } from '../client/client.service';
import { ClientWithAllowance } from '../client/types.client';
import { EthApiService } from '../eth-api/eth-api.service';
import { StorageProviderReportService } from '../storage-provider-report/storage-provider-report.service';

@Injectable()
export class AllocatorReportService {
  private readonly logger = new Logger(AllocatorReportService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageProviderReportService: StorageProviderReportService,
    private readonly clientService: ClientService,
    private readonly allocatorService: AllocatorService,
    private readonly allocatorReportChecksService: AllocatorReportChecksService,
    private readonly ethApiService: EthApiService,
    private readonly allocatorScoringService: AllocatorScoringService,
    private readonly prismaDmobService: PrismaDmobService,
  ) {}

  public async generateReport(allocatorIdOrAddress: string) {
    const allocatorData =
      await this.allocatorService.getAllocatorData(allocatorIdOrAddress);

    if (!allocatorData) return null;

    let verifiedAllMetaallocatorClients = [];

    // get all clients of the allocators belonging to the metaallocator
    if (allocatorData.isMetaAllocator) {
      const metaallocatorDetails = await this.prismaDmobService.$queryRawTyped(
        getAllocatorsFull(false, true, allocatorData.addressId, null),
      );

      if (!metaallocatorDetails.length) {
        this.logger.error(
          `Metaallocator details not found for ${allocatorData.addressId}, please investigate`,
        );

        return null;
      }

      const metaallocatorAllocators = Object.values(
        metaallocatorDetails[0].allocatorsUsingMetaallocator,
      );

      verifiedAllMetaallocatorClients = (
        await Promise.all(
          metaallocatorAllocators.map((allocator) =>
            this.clientService.getClientsByAllocator(allocator.addressId),
          ),
        )
      ).flat();
    }

    const [verifiedClients, allocatorInfo] = await Promise.all([
      allocatorData.isMetaAllocator
        ? verifiedAllMetaallocatorClients
        : this.clientService.getClientsByAllocator(allocatorData.addressId),
      this.allocatorService.getAllocatorRegistryInfo(allocatorData.addressId),
    ]);

    const clientsData = this.getGrantedDatacapInClients(verifiedClients);

    const storageProviderDistribution =
      await this.getStorageProviderDistribution(
        verifiedClients.map((client) => {
          return client.addressId;
        }),
      );

    const report = await this.prismaService.allocator_report.create({
      data: {
        allocator: allocatorData.addressId,
        address: allocatorData.address,
        name: allocatorData.name || null,
        multisig: allocatorData.isMultisig,
        avg_secs_to_first_deal:
          await this.allocatorService.getAverageSecondsToFirstDeal(
            allocatorData.addressId,
          ),
        avg_retrievability_success_rate:
          storageProviderDistribution.reduce(
            (acc, curr) => acc + curr.retrievability_success_rate,
            0,
          ) / storageProviderDistribution.length,
        avg_retrievability_success_rate_http:
          storageProviderDistribution.reduce(
            (acc, curr) => acc + curr.retrievability_success_rate_http,
            0,
          ) / storageProviderDistribution.length,
        avg_retrievability_success_rate_url_finder:
          storageProviderDistribution.reduce(
            (acc, curr) => acc + curr.retrievability_success_rate_url_finder,
            0,
          ) / storageProviderDistribution.length,
        clients_number: verifiedClients.length,
        data_types: allocatorInfo?.application.data_types ?? [],
        audit: allocatorInfo?.application.audit ?? [],
        required_copies: allocatorInfo?.application.required_replicas,
        required_sps: allocatorInfo?.application.required_sps,
        all_allocators_score_avg:
          await this.allocatorScoringService.getTotalScoreAverage(
            await this.allocatorService.isAllocatorOpenData(
              allocatorData.addressId,
            ),
          ),
        clients: {
          create: await Promise.all(
            verifiedClients.map(async (client) => {
              const clientData = await this.clientService.getClientData(
                client.addressId,
              );

              const bookkeepingInfo =
                await this.clientService.getClientBookkeepingInfo(
                  client.addressId,
                );

              const maxDeviation = bookkeepingInfo?.clientContractAddress
                ? await this.ethApiService.getClientContractMaxDeviation(
                    bookkeepingInfo.clientContractAddress,
                    client.addressId,
                  )
                : null;

              const replicaDistribution =
                await this.clientService.getReplicationDistribution(
                  client.addressId,
                );

              const cidSharing = await this.clientService.getCidSharing(
                client.addressId,
              );

              return {
                client_id: client.addressId,
                name: client.name || null,
                allocators: clientData.map((c) => c.verifierAddressId),
                allocations_number: client.allowanceArray.length,
                application_url:
                  this.clientService.getClientApplicationUrl(client),
                application_timestamp: client.allowanceArray?.[0]
                  ?.issueCreateTimestamp
                  ? new Date(
                      client.allowanceArray[0].issueCreateTimestamp * 1000,
                    )
                  : null,
                total_allocations: client.allowanceArray.reduce(
                  (acc, curr) => acc + curr.allowance,
                  0,
                ),
                using_client_contract: !!bookkeepingInfo?.clientContractAddress,
                client_contract_max_deviation: maxDeviation,
                last_datacap_spent:
                  await this.clientService.getLastDatacapSpent(
                    client.addressId,
                  ),
                last_datacap_received:
                  await this.clientService.getLastDatacapReceived(
                    client.addressId,
                  ),
                cid_sharing: {
                  create: await Promise.all(
                    cidSharing.map(async (c) => ({
                      ...c,
                      other_client_application_url:
                        this.clientService.getClientApplicationUrl(
                          (
                            await this.clientService.getClientData(
                              c.other_client,
                            )
                          )[0],
                        ),
                    })),
                  ),
                },
                replica_distribution: {
                  create: replicaDistribution,
                },
                expected_size_of_single_dataset:
                  bookkeepingInfo?.expectedSizeOfSingleDataset,
                total_uniq_data_set_size: replicaDistribution?.reduce(
                  (acc, cur) => acc + cur.unique_data_size,
                  0n,
                ),
              };
            }),
          ),
        },
        client_allocations: {
          create: clientsData.map((clientData) => {
            return {
              client_id: clientData.addressId,
              allocation: clientData.allocation,
              timestamp: new Date(clientData.allocationTimestamp * 1000),
            };
          }),
        },
        storage_provider_distribution: {
          create: storageProviderDistribution?.map((provider) => {
            return {
              ...provider,
              ...(provider.location && {
                location: {
                  create: provider.location,
                },
              }),
            };
          }),
        },
      },
    });

    await this.allocatorReportChecksService.storeReportChecks(report.id);
    await this.allocatorScoringService.storeScoring(report.id);

    return this.getReport(report.allocator, report.id);
  }

  private async getStorageProviderDistribution(clientIds: string[]) {
    const storageProviderDistribution = [];

    for (const clientId of clientIds) {
      storageProviderDistribution.push(
        ...(await this.storageProviderReportService.getStorageProviderDistribution(
          clientId,
        )),
      );
    }

    const totalDatacap = storageProviderDistribution.reduce(
      (acc, curr) => acc + curr.total_deal_size,
      0n,
    );

    return storageProviderDistribution.map((provider) => {
      return {
        ...provider,
        perc_of_total_datacap: bigIntDiv(
          provider.total_deal_size * 100n,
          totalDatacap,
        ),
      };
    });
  }

  public async getReports(allocatorIdOrAddress: string) {
    return await this.prismaService.allocator_report.findMany({
      where: {
        OR: [
          {
            allocator: allocatorIdOrAddress,
          },
          {
            address: allocatorIdOrAddress,
          },
        ],
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  public async getLatestReport(
    allocatorIdOrAddress: string,
    clientPagination?: PaginationInfo,
    providerPagination?: PaginationInfo,
  ) {
    return this.getReport(
      allocatorIdOrAddress,
      null,
      clientPagination,
      providerPagination,
    );
  }

  @Retryable({ retries: 3, delay: 5000 }) // 5 seconds
  public async getReport(
    allocatorIdOrAddress: string,
    id?: string,
    clientPagination?: PaginationInfo,
    providerPagination?: PaginationInfo,
  ) {
    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        OR: [
          {
            allocator: allocatorIdOrAddress,
            id: id ?? undefined,
          },
          {
            address: allocatorIdOrAddress,
            id: id ?? undefined,
          },
        ],
      },
      include: {
        clients: {
          omit: {
            id: true,
            allocator_report_id: true,
          },
          include: {
            replica_distribution: {
              omit: {
                id: true,
                allocator_report_clientId: true,
              },
            },
            cid_sharing: {
              omit: {
                id: true,
                allocator_report_clientId: true,
              },
            },
          },
          take: clientPagination?.limit,
          skip: (clientPagination?.page - 1) * clientPagination?.limit,
        },
        client_allocations: {
          omit: {
            id: true,
            allocator_report_id: true,
          },
          orderBy: [{ client_id: 'asc' }, { timestamp: 'asc' }],
        },
        storage_provider_distribution: {
          omit: {
            id: true,
            allocator_report_id: true,
          },
          include: {
            location: {
              omit: {
                id: true,
                provider_distribution_id: true,
              },
            },
          },
          orderBy: {
            perc_of_total_datacap: 'desc',
          },
          take: providerPagination?.limit,
          skip: (providerPagination?.page - 1) * providerPagination?.limit,
        },
        check_results: {
          omit: {
            id: true,
            create_date: true,
            allocator_report_id: true,
          },
        },
        scoring_results: {
          omit: {
            id: true,
            allocator_report_id: true,
            create_date: true,
          },
          include: {
            ranges: {
              omit: {
                id: true,
                scoring_result_id: true,
              },
            },
          },
        },
      },
      orderBy: {
        create_date: 'desc',
      },
    });

    const [reportClientsTotal, reportStorageProviderTotal] = await Promise.all([
      this.prismaService.allocator_report_client.count({
        where: {
          allocator_report_id: report?.id,
        },
      }),
      this.prismaService.allocator_report_storage_provider_distribution.count({
        where: {
          allocator_report_id: report?.id,
        },
      }),
    ]);

    return (
      report && {
        ...report,
        clients: report.clients?.map((client) => ({
          ...client,
          allocations: report.client_allocations
            ?.filter((allocation) => allocation.client_id === client.client_id)
            ?.map((allocation) => ({
              ...allocation,
              client_id: undefined,
            })),
        })),
        client_allocations: undefined,
        clients_total: reportClientsTotal,
        storage_provider_distribution_total: reportStorageProviderTotal,
      }
    );
  }

  private getGrantedDatacapInClients(clientsData: ClientWithAllowance[]) {
    return clientsData
      .map((data) => {
        return data.allowanceArray
          .filter((allowanceItem) => {
            if (!allowanceItem.allowance) {
              this.logger.error(
                `Empty allowance for client ${data.addressId || data.address}, please investigate`,
              );

              return false;
            }

            return true;
          })
          .map((allowanceItem) => ({
            allocation: allowanceItem.allowance,
            addressId: data.addressId,
            allocationTimestamp: allowanceItem.createMessageTimestamp,
            applicationTimestamp: allowanceItem.issueCreateTimestamp,
            clientName: data.name,
          }));
      })
      .flat()
      .sort((a, b) => a.allocationTimestamp - b.allocationTimestamp);
  }
}

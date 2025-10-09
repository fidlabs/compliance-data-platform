import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { groupBy } from 'lodash';
import { DateTime } from 'luxon';
import {
  AllocatorReportCheck,
  ClientReportCheck,
} from 'prisma/generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';
import { filPlusEditions } from 'src/utils/filplus-edition';
import { envNotSet, stringToNumber } from 'src/utils/utils';
import { ClientService } from '../client/client.service';

type ClientAllocations = {
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

@Injectable()
export class AllocatorReportChecksService {
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES: number;
  public readonly MAX_ALLOWED_PERCENT_FAILED_CLIENT_REPORT_CHECKS = 50; // <= 50% of clients checks may fail for each check type
  private readonly logger = new Logger(AllocatorReportChecksService.name);

  // prettier-ignore
  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly clientService: ClientService,
  ) {
    this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES =
      configService.get<number>(
        'CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES',
      );
  }

  public async storeReportChecks(reportId: string) {
    const report = await this.prismaService.allocator_report.findUnique({
      where: {
        id: reportId,
      },
      include: {
        clients: {
          include: {
            replica_distribution: true,
            cid_sharing: true,
          },
        },
        client_allocations: true,
        storage_provider_distribution: {
          include: {
            location: true,
          },
        },
      },
    });

    await this.storeClientMultipleAllocators(report);
    await this.storeClientNotEnoughCopies(report);
    await this.storeAllocatorChecksBasedOnClientReportChecks(report);
    await this.storeAllocatorTrancheScheduleCheck(reportId);
  }

  private async storeCheck(
    reportId: string,
    check: AllocatorReportCheck,
    checkName: string,
    checkDescription: string,
    result: boolean,
    metadata: any,
  ) {
    await this.prismaService.allocator_report_check_result.create({
      data: {
        allocator_report_id: reportId,
        check: check,
        check_name: checkName,
        check_description: checkDescription,
        result: result,
        metadata: metadata,
      },
    });
  }

  private getClientReportCheckFailMessage(
    clientReportCheck: ClientReportCheck,
  ) {
    // prettier-ignore
    const CLIENT_REPORT_CHECK_FAIL_MESSAGE_MAP = {
      [ClientReportCheck.DEAL_DATA_REPLICATION_CID_SHARING]:
        'demonstrate CID sharing.',
      [ClientReportCheck.DEAL_DATA_REPLICATION_HIGH_REPLICA]:
        'have a high replica percentage',
      [ClientReportCheck.DEAL_DATA_REPLICATION_LOW_REPLICA]:
        'have a low replica percentage',
      [ClientReportCheck.INACTIVITY]:
        'have unspent DataCap and were inactive for over one month',
      [ClientReportCheck.MULTIPLE_ALLOCATORS]:
        'received DataCap from more than one allocator',
      [ClientReportCheck.NOT_ENOUGH_COPIES]:
        'store data with fewer replicas than required',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION]:
        'missed the SP location diversity requirement',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_DECLARED_NOT_USED]:
        'declared SPs in applications that were not actually used',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION]:
        'stored excessive duplicate data',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL]:
        'have unhealthy SP distribution',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING]:
        'used SPs that misreported data to IPNI',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING]:
        'used SPs that did not report data to IPNI',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_NOT_DECLARED]:
        'used undeclared storage providers',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75]:
        'used SPs with a HTTP retrieval success rate below 75%',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO]:
        'used SPs with a HTTP retrieval success rate of 0%',
      [ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_75]:
        'used SPs with a RPA retrieval success rate below 75%',
      [ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_ZERO]:
        'used SPs with a RPA retrieval success rate of 0%',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION]:
        'used SPs that have an unknown IP location',
      [ClientReportCheck.UNIQ_DATA_SET_SIZE_TO_DECLARED]:
        'stored unique datasets larger than declared',
    };

    return CLIENT_REPORT_CHECK_FAIL_MESSAGE_MAP[clientReportCheck];
  }

  private getClientReportCheckName(clientReportCheck: ClientReportCheck) {
    // prettier-ignore
    const CLIENT_REPORT_CHECK_NAME = {
      [ClientReportCheck.DEAL_DATA_REPLICATION_CID_SHARING]:
        'Client CID sharing',
      [ClientReportCheck.DEAL_DATA_REPLICATION_HIGH_REPLICA]:
        'Client high replica',
      [ClientReportCheck.DEAL_DATA_REPLICATION_LOW_REPLICA]:
        'Client low replica',
      [ClientReportCheck.INACTIVITY]:
        'Client inactivity',
      [ClientReportCheck.MULTIPLE_ALLOCATORS]:
        'Client multiple allocators',
      [ClientReportCheck.NOT_ENOUGH_COPIES]:
        'Client not enough copies',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION]:
        'Storage Providers location diversity',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_DECLARED_NOT_USED]:
        'Storage Providers declared, not used',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION]:
        'Excessive duplicate data',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL]:
        'Unhealthy Storage Provider distribution',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING]:
        'Storage Providers IPNI misreporting',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING]:
        'Storage Providers not reporting to IPNI',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_NOT_DECLARED]:
        'Storage Providers not declared',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75]:
        'Storage Providers HTTP retrievability < 75%',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO]:
        'Storage Providers HTTP retrievability = 0%',
      [ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_75]:
        'Storage Providers RPA retrievability < 75%',
      [ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_ZERO]:
        'Storage Providers RPA retrievability = 0%',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION]:
        'Storage Providers unknown location',
      [ClientReportCheck.UNIQ_DATA_SET_SIZE_TO_DECLARED]:
        'Client unique dataset size to declared',
    };

    return CLIENT_REPORT_CHECK_NAME[clientReportCheck];
  }

  private getClientReportCheckDescription(
    clientReportCheck: ClientReportCheck,
  ) {
    // prettier-ignore
    const CLIENT_REPORT_CHECK_DESCRIPTION = {
      [ClientReportCheck.DEAL_DATA_REPLICATION_CID_SHARING]:
        'Check that clients do not demonstrate CID sharing',
      [ClientReportCheck.DEAL_DATA_REPLICATION_HIGH_REPLICA]:
        'Check that clients do not have a high replica percentage',
      [ClientReportCheck.DEAL_DATA_REPLICATION_LOW_REPLICA]:
        'Check that clients do not have a low replica percentage',
      [ClientReportCheck.INACTIVITY]:
        'Check that clients with unspent DataCap were not inactive for over one month',
      [ClientReportCheck.MULTIPLE_ALLOCATORS]:
        'Check that clients receive datacap from only one allocator',
      [ClientReportCheck.NOT_ENOUGH_COPIES]:
        'Check that clients store data with the required number of copies',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_ALL_LOCATED_IN_THE_SAME_REGION]:
        'Check that clients meet the SP location diversity requirement',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_DECLARED_NOT_USED]:
        'Check that clients declared SPs in applications that were actually used',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_MAX_DUPLICATION]:
        'Check that clients do not store excessive duplicate data',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_EXCEED_PROVIDER_DEAL]:
        'Check that clients have a healthy Storage Provider distribution',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_MISREPORTING]:
        'Check that clients do not use Storage Providers that misreported data to IPNI',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_IPNI_NOT_REPORTING]:
        'Check that clients do not use Storage Providers that did not report data to IPNI',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_NOT_DECLARED]:
        'Check that clients do not use undeclared Storage Providers',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_75]:
        'Check that clients do not use Storage Providers with a HTTP retrieval success rate below 75%',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_RETRIEVABILITY_ZERO]:
        'Check that clients do not use Storage Providers with a HTTP retrieval success rate of 0%',
      [ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_75]:
        'Check that clients do not use Storage Providers with a RPA retrieval success rate below 75%',
      [ClientReportCheck.STORAGE_PROVIDER_URL_FINDER_RETRIEVABILITY_ZERO]:
        'Check that clients do not use Storage Providers with a RPA retrieval success rate of 0%',
      [ClientReportCheck.STORAGE_PROVIDER_DISTRIBUTION_PROVIDERS_UNKNOWN_LOCATION]:
        'Check that clients do not use Storage Providers that have an unknown IP location',
      [ClientReportCheck.UNIQ_DATA_SET_SIZE_TO_DECLARED]:
        'Check that clients do not store datasets larger than declared',
    };

    return CLIENT_REPORT_CHECK_DESCRIPTION[clientReportCheck];
  }

  private async storeClientMultipleAllocators(report) {
    const clientsUsingMultipleAllocators = report.clients
      .filter(
        (client) =>
          client.allocators.filter(
            // ignore Glif Auto Verified allocator for this check
            (allocator) => allocator !== GlifAutoVerifiedAllocatorId,
          ).length > 1,
      )
      .map((client) => client.client_id);

    const checkPassed = clientsUsingMultipleAllocators.length === 0;

    await this.storeCheck(
      report.id,
      AllocatorReportCheck.CLIENT_MULTIPLE_ALLOCATORS,
      'Client multiple allocators',
      'Check that clients receive datacap from only one allocator',
      checkPassed,
      {
        max_clients_using_multiple_allocators_count: 0,
        violating_ids: clientsUsingMultipleAllocators,
        msg: checkPassed
          ? 'All clients receiving datacap from one allocator'
          : `${this._clients(clientsUsingMultipleAllocators.length)} receiving datacap from more than one allocator`,
      },
    );
  }

  private async storeClientNotEnoughCopies(report) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES env is not set; skipping check`,
      );

      return;
    }

    if (!report.required_copies) {
      await this.storeCheck(
        report.id,
        AllocatorReportCheck.CLIENT_NOT_ENOUGH_COPIES,
        'Client not enough copies',
        'Check that clients store data with the required number of copies',
        true,
        {
          msg: `Allocator did not define required replicas`,
        },
      );
    } else {
      const clientsWithNotEnoughCopies = report.clients
        .filter((client) => {
          const notEnoughCopiesPercentage = client.replica_distribution
            .filter(
              (distribution) =>
                distribution.num_of_replicas <
                stringToNumber(report.required_copies),
            )
            .reduce(
              (totalPercentage, distribution) =>
                totalPercentage + distribution.percentage,
              0,
            );

          return (
            notEnoughCopiesPercentage >
            this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES
          );
        })
        .map((client) => client.client_id);

      const checkPassed = clientsWithNotEnoughCopies.length <= 0;

      await this.storeCheck(
        report.id,
        AllocatorReportCheck.CLIENT_NOT_ENOUGH_COPIES,
        'Client not enough copies',
        'Check that clients store data with the required number of copies',
        checkPassed,
        {
          violating_ids: clientsWithNotEnoughCopies,
          max_clients_with_not_enough_copies: 0,
          max_percentage_for_required_copies:
            this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES,
          msg: checkPassed
            ? `All clients meet the ${report.required_copies} replicas requirement`
            : `${this._clients(clientsWithNotEnoughCopies.length)} do not meet the ${report.required_copies} replicas requirement`,
        },
      );
    }
  }

  private _clients(n: number): string {
    return n === 0 ? 'No clients' : n === 1 ? '1 client' : `${n} clients`;
  }

  public async storeAllocatorChecksBasedOnClientReportChecks(report) {
    const allocatorClientsChecks = (
      await Promise.all(
        report.clients.map((client) =>
          this.prismaService.client_report.findFirst({
            where: {
              client: client.client_id,
              last_datacap_spent: {
                gte: DateTime.now().toUTC().minus({ days: 60 }).toJSDate(), // consider only clients that spent datacap in the last 60 days
              },
            },
            include: {
              check_results: true,
            },
            orderBy: { create_date: 'desc' },
          }),
        ),
      )
    ).filter(Boolean);

    const groupedClientsChecks = groupBy(
      allocatorClientsChecks.flatMap((x) => x?.check_results || []),
      (x) => x?.check,
    );

    await Promise.all(
      Object.entries(ClientReportCheck).map(async ([check]) => {
        const failedChecks =
          groupedClientsChecks[check]?.filter((x) => x.result === false) ?? [];

        const failedChecksPercentage = groupedClientsChecks[check]
          ? (failedChecks.length / groupedClientsChecks[check].length) * 100
          : 0;

        const checkPassed =
          failedChecksPercentage <=
          this.MAX_ALLOWED_PERCENT_FAILED_CLIENT_REPORT_CHECKS;

        return this.storeCheck(
          report.id,
          check as AllocatorReportCheck,
          this.getClientReportCheckName(check as ClientReportCheck),
          this.getClientReportCheckDescription(check as ClientReportCheck),
          checkPassed,
          {
            msg: `${failedChecksPercentage.toFixed(2)}% of active clients ${this.getClientReportCheckFailMessage(check as ClientReportCheck)}`,
          },
        );
      }),
    );
  }

  public async storeAllocatorTrancheScheduleCheck(reportId: string) {
    const allocatorReport = await this.prismaService.allocator_report.findFirst(
      {
        where: {
          id: reportId,
        },
        include: {
          client_allocations: {
            omit: {
              id: true,
              allocator_report_id: true,
            },
            where: {
              timestamp: {
                gte: filPlusEditions.find((x) => x.id === 6)?.startDate, // filter only allocations started from Fil+ edition 6
              },
            },
            orderBy: [{ client_id: 'asc' }, { timestamp: 'asc' }], // important! order by timestamp asc to get allocations in the order they were given
          },
          clients: {
            where: {
              last_datacap_spent: {
                gte: DateTime.now().toUTC().minus({ days: 60 }).toJSDate(), // consider only "active" clients - spent datacap in the last 60 days
              },
            },
          },
        },
      },
    );

    const validatedAllocator = await this.prismaService.$queryRaw<
      {
        allocator_id: string;
        is_metaallocator: boolean;
        registry_info: string;
      }[]
    >`select 
          "allocator_registry"."allocator_id" as "allocator_id",
          "allocator"."is_metaallocator" as "is_metaallocator",
          "allocator_registry"."registry_info" as "registry_info"
        from "allocator" 
          left join "allocator_registry" on "allocator"."id" = "allocator_registry"."allocator_id" 
        where 
          "allocator"."id"::text = ${allocatorReport.allocator} and 
          "allocator"."is_metaallocator" = false and
          lower("allocator_registry"."registry_info"::"jsonb"->'application'->>'tranche_schedule') = 'i will use the standard allocation tranche schedule';
      `;

    if (!validatedAllocator?.[0] || !allocatorReport.client_allocations.length)
      return; // skip check for: non-manual tranche schedule allocators, metaallocators and when there are no allocations

    const clientsAllocations = groupBy(
      allocatorReport.client_allocations,
      (a) => a.client_id,
    );

    const clientAllocationToVerify: ClientAllocations[] = await Promise.all(
      Object.keys(clientsAllocations).map(async (clientId) => {
        return {
          clientId,
          allocations: clientsAllocations[clientId].map((allocation) => {
            return {
              id: allocation.id,
              allocatorReportId: allocation.allocator_report_id,
              clientId: allocation.client_id,
              allocation: allocation.allocation,
              timestamp: allocation.timestamp,
            };
          }),
          totalRequestedAmount:
            (await this.clientService.getClientBookkeepingInfo(clientId))
              ?.totalRequestedAmount || 0n,
        };
      }),
    );

    const verifiedClientAllocations = clientAllocationToVerify.map((client) =>
      this.validateAllocations(client),
    );

    const invalidAllocations = verifiedClientAllocations.filter(
      (result) => !result.isValid,
    );

    const checkPassed = invalidAllocations.length === 0;

    await this.prismaService.allocator_report_check_result.create({
      data: {
        allocator_report_id: reportId,
        check: AllocatorReportCheck.MANUAL_ALLOCATION_SCHEDULE,
        result: checkPassed,
        metadata: {
          msg: checkPassed
            ? 'All active clients receive allocations according to the tranche schedule'
            : `${invalidAllocations.length} of ${verifiedClientAllocations.length} active clients did not receive allocations according to the tranche schedule`,
        },
      },
    });
  }

  private validateAllocations(client: ClientAllocations) {
    const { clientId, allocations, totalRequestedAmount } = client;
    let isValid = true;

    for (let i = 0; i < allocations.length; i++) {
      const { allocation } = allocations[i];
      const prev = i > 0 ? allocations[i - 1] : null;

      let maxPercent: bigint;
      switch (i) {
        case 0:
          maxPercent = 5n;
          break; // 5%
        case 1:
          maxPercent = 10n;
          break; // 10%
        case 2:
          maxPercent = 15n;
          break; // 15%
        case 3:
          maxPercent = 20n;
          break; // 20%
        default:
          maxPercent = 25n;
          break; // 25% for 5+
      }

      const trancheThresholdValue =
        (totalRequestedAmount * BigInt(maxPercent)) / 100n;

      if (allocation > trancheThresholdValue) {
        isValid = false;
        break;
      }

      // check 2x increase from previous allocation
      if (prev && allocation > prev.allocation * 2n) {
        isValid = false;
        break;
      }
    }

    return { clientId, isValid };
  }
}

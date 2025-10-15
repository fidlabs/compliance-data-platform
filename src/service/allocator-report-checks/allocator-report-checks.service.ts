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
import { envNotSet, stringToNumber } from 'src/utils/utils';

@Injectable()
export class AllocatorReportChecksService {
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES: number;
  public readonly MAX_ALLOWED_PERCENT_FAILED_CLIENT_REPORT_CHECKS = 50; // < 50% of clients checks may fail for each check type
  private readonly logger = new Logger(AllocatorReportChecksService.name);

  // prettier-ignore
  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
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
  }

  private getClientReportCheckFailMessage(
    clientReportCheck: ClientReportCheck,
  ) {
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

  private async storeClientMultipleAllocators(report: any) {
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

    await this.prismaService.allocator_report_check_result.create({
      data: {
        allocator_report_id: report.id,
        check: AllocatorReportCheck.CLIENT_MULTIPLE_ALLOCATORS,
        result: checkPassed,
        metadata: {
          max_clients_using_multiple_allocators_count: 0,
          violating_ids: clientsUsingMultipleAllocators,
          msg: checkPassed
            ? 'All clients receiving datacap from one allocator'
            : `${this._clients(clientsUsingMultipleAllocators.length)} receiving datacap from more than one allocator`,
        },
      },
    });
  }

  private async storeClientNotEnoughCopies(report: any) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES env is not set; skipping check`,
      );

      return;
    }

    if (!report.required_copies) {
      await this.prismaService.allocator_report_check_result.create({
        data: {
          allocator_report_id: report.id,
          check: AllocatorReportCheck.CLIENT_NOT_ENOUGH_COPIES,
          result: true,
          metadata: {
            msg: `Allocator did not define required replicas`,
          },
        },
      });
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

      await this.prismaService.allocator_report_check_result.create({
        data: {
          allocator_report_id: report.id,
          check: AllocatorReportCheck.CLIENT_NOT_ENOUGH_COPIES,
          result: checkPassed,
          metadata: {
            violating_ids: clientsWithNotEnoughCopies,
            max_clients_with_not_enough_copies: 0,
            max_percentage_for_required_copies:
              this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES,
            msg: checkPassed
              ? `All clients meet the ${report.required_copies} replicas requirement`
              : `${this._clients(clientsWithNotEnoughCopies.length)} do not meet the ${report.required_copies} replicas requirement`,
          },
        },
      });
    }
  }

  private _clients(n: number): string {
    return n === 0 ? 'No clients' : n === 1 ? '1 client' : `${n} clients`;
  }

  public async storeAllocatorChecksBasedOnClientReportChecks(report: any) {
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
      Object.entries(ClientReportCheck).map(([check]) => {
        const failedChecks =
          groupedClientsChecks[check]?.filter((x) => x.result === false) ?? [];

        const failedChecksPercentage = groupedClientsChecks[check]
          ? (failedChecks.length / groupedClientsChecks[check].length) * 100
          : 0;

        const checkPassed =
          failedChecksPercentage <=
          this.MAX_ALLOWED_PERCENT_FAILED_CLIENT_REPORT_CHECKS;

        return this.prismaService.allocator_report_check_result.create({
          data: {
            allocator_report_id: report.id,
            check: check as AllocatorReportCheck,
            result: checkPassed,
            metadata: {
              msg: `${failedChecksPercentage.toFixed(2)}% of active clients ${this.getClientReportCheckFailMessage(check as ClientReportCheck)}`,
            },
          },
        });
      }),
    );
  }
}

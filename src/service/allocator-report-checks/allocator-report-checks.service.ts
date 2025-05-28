import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { AllocatorReportCheck } from 'prisma/generated/client';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';
import { ConfigService } from '@nestjs/config';
import { envNotSet } from 'src/utils/utils';

@Injectable()
export class AllocatorReportChecksService {
  public CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES: number;

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
    await this.storeClientMultipleAllocators(reportId);
    await this.storeClientNotEnoughCopies(reportId);
  }

  private async storeClientMultipleAllocators(reportId: string) {
    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        id: reportId,
      },
      select: {
        clients: {
          select: {
            client_id: true,
            allocators: true,
          },
        },
      },
    });

    const clientsUsingMultipleAllocators = report.clients.filter(
      (client) =>
        client.allocators.filter(
          // ignore Glif Auto Verified allocator for this check
          (allocator) => allocator !== GlifAutoVerifiedAllocatorId,
        ).length > 1,
    );

    const checkPassed = clientsUsingMultipleAllocators.length === 0;

    await this.prismaService.allocator_report_check_result.create({
      data: {
        allocator_report_id: reportId,
        check: AllocatorReportCheck.CLIENT_MULTIPLE_ALLOCATORS,
        result: checkPassed,
        metadata: {
          clients_using_multiple_allocators_count:
            clientsUsingMultipleAllocators.length,
          max_clients_using_multiple_allocators_count: 0,
          violating_ids: clientsUsingMultipleAllocators.map(
            (client) => client.client_id,
          ),
          msg: checkPassed
            ? 'All clients receiving datacap from one allocator'
            : `${clientsUsingMultipleAllocators.length} clients receiving datacap from more than one allocator`,
        },
      },
    });
  }

  private async storeClientNotEnoughCopies(reportId: string) {
    if (envNotSet(this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES)) {
      this.logger.warn(
        `CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES env is not set; skipping check`,
      );

      return;
    }

    const report = await this.prismaService.allocator_report.findFirst({
      where: {
        id: reportId,
      },
      select: {
        required_copies: true,
        clients: {
          select: {
            client_id: true,
            replica_distribution: true,
          },
        },
      },
    });

    if (!report.required_copies) {
      await this.prismaService.allocator_report_check_result.create({
        data: {
          allocator_report_id: reportId,
          check: AllocatorReportCheck.CLIENT_NOT_ENOUGH_COPIES,
          result: true,
          metadata: {
            msg: `Allocator did not define required replicas`,
          },
        },
      });
    }

    const clientsWithNotEnoughCopies = report.clients
      .filter((client) => {
        const notEnoughCopiesPercentage = client.replica_distribution
          .filter(
            (distribution) =>
              distribution.num_of_replicas < parseInt(report.required_copies),
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
        allocator_report_id: reportId,
        check: AllocatorReportCheck.CLIENT_NOT_ENOUGH_COPIES,
        result: checkPassed,
        metadata: {
          violating_ids: clientsWithNotEnoughCopies,
          clients_with_not_enough_copies: clientsWithNotEnoughCopies.length,
          max_clients_with_not_enough_copies: 0,
          max_percentage_for_required_copies:
            this.CLIENT_REPORT_MAX_PERCENTAGE_FOR_REQUIRED_COPIES,
          msg: checkPassed
            ? `All clients meet the ${report.required_copies} replicas requirement`
            : `${clientsWithNotEnoughCopies.length} clients do not meet the ${report.required_copies} replicas requirement`,
        },
      },
    });
  }
}

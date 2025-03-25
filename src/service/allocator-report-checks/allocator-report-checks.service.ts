import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { AllocatorReportCheck } from 'prisma/generated/client';
import { GlifAutoVerifiedAllocatorId } from 'src/utils/constants';

@Injectable()
export class AllocatorReportChecksService {
  private readonly logger = new Logger(AllocatorReportChecksService.name);

  constructor(private readonly prismaService: PrismaService) {}

  public async storeReportChecks(reportId: string) {
    await this.storeClientMultipleAllocators(reportId);
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

    await this.prismaService.allocator_report_check_result.create({
      data: {
        allocator_report_id: reportId,
        check: AllocatorReportCheck.CLIENT_MULTIPLE_ALLOCATORS,
        result: clientsUsingMultipleAllocators.length === 0,
        metadata: {
          clients_using_multiple_allocators_count:
            clientsUsingMultipleAllocators.length,
          max_clients_using_multiple_allocators_count: 0,
          violating_ids: clientsUsingMultipleAllocators.map(
            (client) => client.client_id,
          ),
          msg:
            clientsUsingMultipleAllocators.length === 0
              ? 'All clients receiving datacap from one allocator'
              : `${clientsUsingMultipleAllocators.length} clients receiving datacap from more than one allocator`,
        },
      },
    });
  }
}

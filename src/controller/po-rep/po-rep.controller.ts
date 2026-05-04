import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  PoRepDealState,
  Prisma,
  StorageProviderUrlFinderMetricType,
} from 'prisma/generated/client';
import { PrismaService } from 'src/db/prisma.service';
import {
  GetPoRepProvidersResponse,
  PoRepProviderSLIInfo,
  PoRepSLIMeasurment,
  PoRepSLIType,
  poRepSLITypes,
} from './types.po-rep';
import { PaginationInfoRequest } from '../base/types.controller-base';
import { ControllerBase } from '../base/controller-base';

const sliTypesMap: Record<
  PoRepSLIType,
  StorageProviderUrlFinderMetricType | null
> = {
  retrievabilityBps: StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY,
  bandwidthMbps: StorageProviderUrlFinderMetricType.BANDWIDTH,
  latencyMs: StorageProviderUrlFinderMetricType.TTFB,
  indexingPct: null,
};

@Controller('po-rep')
export class PoRepController extends ControllerBase {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  @Get('/providers')
  @ApiOperation({
    summary: 'Get list of storage providers participating in PoRep market',
  })
  @ApiOkResponse({
    description: 'List of storage providers participating in PoRep market',
    type: GetPoRepProvidersResponse,
  })
  @CacheTTL(1000 * 60 * 30) // 30 minutes
  public async getParticipants(
    @Query() query: PaginationInfoRequest,
  ): Promise<GetPoRepProvidersResponse> {
    const paginationInfo = this.validatePaginationInfo(query);
    const [providers, totalCount] = await this.prismaService.$transaction([
      this.prismaService.po_rep_storage_provider.findMany({
        ...this.validateQueryPagination(paginationInfo),
        include: {
          capabilities: true,
          _count: {
            select: {
              deals: {
                where: {
                  state: {
                    in: [PoRepDealState.ACCEPTED, PoRepDealState.COMPLETED],
                  },
                },
              },
            },
          },
        },
        orderBy: {
          registeredAtBlock: 'desc',
        },
      }),
      this.prismaService.po_rep_storage_provider.count(),
    ]);

    const providersIds = providers.map((provider) => {
      return 'f0' + provider.providerId.toString();
    });

    interface LatestMetric {
      provider: string;
      value: number | null;
      tested_at: Date;
      metric_type: string;
    }

    const latestMetrics = await this.prismaService.$queryRaw<LatestMetric[]>`
      WITH "latest_metrics" AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY "provider", "metric_type" ORDER BY "tested_at" DESC) as "rn"
        FROM "storage_provider_url_finder_metric_value"
        LEFT JOIN "storage_provider_url_finder_metric" ON "storage_provider_url_finder_metric"."id" = "storage_provider_url_finder_metric_value"."metric_id"
      )
      SELECT "provider", "value", "tested_at", "metric_type" FROM "latest_metrics" WHERE "rn" <= 3 AND "provider" IN (${Prisma.join(providersIds)})
    `;

    const data = providers.map((provider) => {
      const providerId = 'f0' + provider.providerId.toString();
      const slis: PoRepProviderSLIInfo[] = poRepSLITypes.map((sliType) => {
        const measuredValues: PoRepSLIMeasurment[] = latestMetrics
          .filter((measurement) => {
            return (
              measurement.provider === providerId &&
              measurement.metric_type === sliTypesMap[sliType]
            );
          })
          .map((measurement): PoRepSLIMeasurment | null => {
            if (measurement.value === null) {
              return null;
            }

            return {
              date: measurement.tested_at.toISOString(),
              value:
                measurement.metric_type ===
                StorageProviderUrlFinderMetricType.RPA_RETRIEVABILITY
                  ? measurement.value * 10000 // Convert percentage to basic points
                  : measurement.value,
            };
          })
          .filter((maybeSLIInfo): maybeSLIInfo is PoRepSLIMeasurment => {
            return maybeSLIInfo !== null;
          });

        return {
          type: sliType,
          declaredValue: provider.capabilities[sliType],
          measuredValues: measuredValues,
        };
      });

      return {
        providerId: providerId,
        paused: provider.paused,
        blocked: provider.blocked,
        availableBytes: provider.availableBytes.toString(),
        committedBytes: provider.committedBytes.toString(),
        pendingBytes: provider.pendingBytes.toString(),
        minDealDurationDays: provider.minDealDurationDays,
        maxDealDurationDays: provider.maxDealDurationDays,
        activeDealsCount: provider._count.deals,
        slis: slis,
        registeredAtBlock: provider.registeredAtBlock.toString(),
      };
    });

    return this.withPaginationInfo(
      {
        data: data,
      },
      query,
      totalCount,
    );
  }
}

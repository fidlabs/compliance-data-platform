import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import {
  ReportChecksWeek,
  GetAllocatorReportChecksDailyRequest,
  GetAllocatorReportChecksDetailsRequest,
  GetAllocatorReportChecksDailyResponse,
  GetAllocatorReportChecksDetailsResponse,
  GetAllocatorReportChecksSummaryByCheckResponse,
  GetAllocatorReportChecksSummaryByCheckRequest,
} from './types.report-checks';
import { PrismaService } from 'src/db/prisma.service';
import {
  getAllocatorReportChecksDaily,
  getAllocatorReportChecksDetails,
  getAllocatorReportChecksSummaryByCheck,
  getAllocatorReportChecksWeekly,
} from 'prisma/generated/client/sql';
import { lastWeek, stringToDate, yesterday } from 'src/utils/utils';

@Controller('report-checks')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class ReportChecksController {
  private readonly logger = new Logger(ReportChecksController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('/allocator/weekly')
  @ApiOperation({
    summary: 'Get allocator report checks summary per week',
  })
  @ApiOkResponse({
    type: ReportChecksWeek,
    isArray: true,
    description: 'List of weekly report checks summary',
  })
  public async getAllocatorReportChecksWeekly(): Promise<ReportChecksWeek[]> {
    return this.prismaService.$queryRawTyped(getAllocatorReportChecksWeekly());
  }

  @Get('/allocator/daily')
  @ApiOperation({
    summary: 'Get allocator report checks summary per day for a given week',
  })
  @ApiOkResponse({
    type: GetAllocatorReportChecksDailyResponse,
    description: 'Daily report checks summary for the given week',
  })
  public async getAllocatorReportChecksDaily(
    @Query() query: GetAllocatorReportChecksDailyRequest,
  ): Promise<GetAllocatorReportChecksDailyResponse> {
    query.week ??= lastWeek().toISOString();

    return {
      week: stringToDate(query.week),
      results: await this.prismaService.$queryRawTyped(
        getAllocatorReportChecksDaily(stringToDate(query.week)),
      ),
    };
  }

  @Get('/allocator/details')
  @ApiOperation({
    summary: 'Get details of failed allocator report checks for a given day',
  })
  @ApiOkResponse({
    type: GetAllocatorReportChecksDetailsResponse,
    description: 'Details of failed report checks for the given day',
  })
  public async getAllocatorReportChecksDetails(
    @Query() query: GetAllocatorReportChecksDetailsRequest,
  ): Promise<GetAllocatorReportChecksDetailsResponse> {
    query.day ??= yesterday().toJSDate().toISOString();

    return {
      day: stringToDate(query.day),
      results: (
        await this.prismaService.$queryRawTyped(
          getAllocatorReportChecksDetails(stringToDate(query.day)),
        )
      ).map((r) => ({
        ...r,
        failedChecks: r.failedChecks as [],
      })),
    };
  }

  @CacheTTL(6 * 1000 * 60 * 60) // 6 hour
  @Get('/allocator/summary-by-check')
  @ApiOperation({
    summary:
      'Get summary of allocator report checks grouped by check and week/month',
  })
  @ApiOkResponse({
    type: GetAllocatorReportChecksSummaryByCheckResponse,
    isArray: true,
    description: 'Summary of allocator report checks',
  })
  public async getAllocatorReportChecksSummaryByCheck(
    @Query() query: GetAllocatorReportChecksSummaryByCheckRequest,
  ): Promise<GetAllocatorReportChecksSummaryByCheckResponse[]> {
    query.groupBy ??= 'week';

    if (query.groupBy && !['week', 'month'].includes(query.groupBy)) {
      throw new BadRequestException(
        `Invalid groupBy value: ${query.groupBy}, must be 'week' or 'month'`,
      );
    }

    return (
      await this.prismaService.$queryRawTyped(
        getAllocatorReportChecksSummaryByCheck(query.groupBy),
      )
    ).map((r) => ({
      ...r,
      data: r.data as [],
    }));
  }
}

import { Controller, Get, Inject, Logger, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ReportChecksWeek,
  GetAllocatorReportChecksDailyRequest,
  GetAllocatorReportChecksDetailsRequest,
  GetAllocatorReportChecksDailyResponse,
  GetAllocatorReportChecksDetailsResponse,
} from './types.report-checks';
import { PrismaService } from 'src/db/prisma.service';
import {
  getAllocatorReportChecksDaily,
  getAllocatorReportChecksDetails,
  getAllocatorReportChecksWeekly,
} from 'prisma/generated/client/sql';
import { lastWeek, stringToDate, yesterday } from 'src/utils/utils';

@Controller('report-checks')
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
  })
  public async getAllocatorReportChecksDaily(
    @Query() query: GetAllocatorReportChecksDailyRequest,
  ): Promise<GetAllocatorReportChecksDailyResponse> {
    query.week ??= lastWeek().toISOString();

    return {
      week: query.week,
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
  })
  public async getAllocatorReportChecksDetails(
    @Query() query: GetAllocatorReportChecksDetailsRequest,
  ): Promise<GetAllocatorReportChecksDetailsResponse> {
    query.day ??= yesterday().toISOString();

    return {
      day: query.day,
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
}

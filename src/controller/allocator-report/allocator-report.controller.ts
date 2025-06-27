import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { AllocatorReportService } from 'src/service/allocator-report/allocator-report.service';
import { Cache, CACHE_MANAGER, CacheKey } from '@nestjs/cache-manager';

@Controller('allocator-report')
export class AllocatorReportController {
  private readonly logger = new Logger(AllocatorReportController.name);

  constructor(
    private readonly allocatorReportService: AllocatorReportService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get(':allocator')
  @ApiOperation({
    summary: 'Get list of allocator compliance reports',
  })
  @ApiOkResponse({
    description: 'List of allocator compliance reports',
    type: null,
  })
  public async getAllocatorReports(@Param('allocator') allocator: string) {
    return await this.allocatorReportService.getReports(allocator);
  }

  @Get(':allocator/latest')
  @CacheKey('allocator-report-latest')
  @ApiOperation({
    summary: 'Get latest allocator compliance report',
  })
  @ApiOkResponse({
    description: 'Allocator compliance report',
    type: null,
  })
  public async getAllocatorReport(@Param('allocator') allocator: string) {
    const report = await this.allocatorReportService.getLatestReport(allocator);

    if (!report) throw new NotFoundException();
    return report;
  }

  @Get(':allocator/:id')
  @ApiOperation({
    summary: 'Get allocator compliance report by id',
  })
  @ApiOkResponse({
    description: 'Allocator compliance report',
    type: null,
  })
  public async getAllocatorReportById(
    @Param('allocator') allocator: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.NOT_FOUND,
      }),
    )
    id: string,
  ) {
    const report = await this.allocatorReportService.getReport(allocator, id);

    if (!report) throw new NotFoundException();
    return report;
  }

  @Post(':allocator')
  @ApiOperation({
    summary: 'Generate compliance report for a given allocator',
  })
  @ApiCreatedResponse({
    description: 'Allocator compliance report',
    type: null,
  })
  public async generateAllocatorReport(@Param('allocator') allocator: string) {
    const report = await this.allocatorReportService.generateReport(allocator);

    if (!report) throw new NotFoundException();

    // invalidate the cache for the latest report
    await this.cacheManager.del('allocator-report-latest');

    return report;
  }
}

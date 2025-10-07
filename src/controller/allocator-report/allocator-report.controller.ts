import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
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
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { AllocatorReportService } from 'src/service/allocator-report/allocator-report.service';
import { GetAllocatorReportRequest } from '../allocators/types.allocators';
import { ControllerBase } from '../base/controller-base';
import { PaginationInfoRequest } from '../base/types.controller-base';

@Controller('allocator-report')
export class AllocatorReportController extends ControllerBase {
  private readonly logger = new Logger(AllocatorReportController.name);

  constructor(
    private readonly allocatorReportService: AllocatorReportService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super();
  }

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
  @ApiOperation({
    summary: 'Get latest allocator compliance report',
  })
  @ApiOkResponse({
    description: 'Allocator compliance report',
    type: null,
  })
  public async getAllocatorReport(
    @Param('allocator') allocator: string,
    @Query() query: GetAllocatorReportRequest,
  ) {
    const clientPagination = {
      limit: query.clientPaginationLimit,
      page: query.clientPaginationPage,
    };

    const providerPagination = {
      limit: query.providerPaginationLimit,
      page: query.providerPaginationPage,
    };

    const clientPaginationInfo = this.validatePaginationInfo(clientPagination);
    const providerPaginationInfo =
      this.validatePaginationInfo(providerPagination);

    const clientPaginationQuery =
      this.validateQueryPagination(clientPaginationInfo);
    const providerPaginationQuery = this.validateQueryPagination(
      providerPaginationInfo,
    );

    const report = await this.allocatorReportService.getLatestReport(
      allocator,
      clientPaginationQuery,
      providerPaginationQuery,
    );

    return this.paginatedReport(report, clientPagination, providerPagination);
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
    @Query() query: GetAllocatorReportRequest,
  ) {
    const clientPagination = {
      limit: query.clientPaginationLimit,
      page: query.clientPaginationPage,
    };

    const providerPagination = {
      limit: query.providerPaginationLimit,
      page: query.providerPaginationPage,
    };

    const clientPaginationInfo = this.validatePaginationInfo(clientPagination);
    const providerPaginationInfo =
      this.validatePaginationInfo(providerPagination);

    const clientPaginationQuery =
      this.validateQueryPagination(clientPaginationInfo);
    const providerPaginationQuery = this.validateQueryPagination(
      providerPaginationInfo,
    );

    const report = await this.allocatorReportService.getReport(
      allocator,
      id,
      clientPaginationQuery,
      providerPaginationQuery,
    );

    return this.paginatedReport(report, clientPagination, providerPagination);
  }

  private async paginatedReport(
    report,
    clientPagination: PaginationInfoRequest,
    providerPagination: PaginationInfoRequest,
  ) {
    if (!report) throw new NotFoundException();

    return {
      ...report,
      clients: this.withPaginationInfo(
        {
          count: report.clients?.length,
          data: report.clients,
        },
        clientPagination,
        report.clients_total,
      ),
      storage_provider_distribution: this.withPaginationInfo(
        {
          count: report.storage_provider_distribution?.length,
          data: report.storage_provider_distribution,
        },
        providerPagination,
        report.storage_provider_distribution_total,
      ),
    };
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

    // invalidate the cache
    await this.cacheManager.del(`/allocator-report/${allocator}/latest`);
    await this.cacheManager.del(`/allocator-report/${allocator}`);

    return report;
  }
}

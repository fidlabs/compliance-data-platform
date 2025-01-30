import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { AllocatorReportService } from '../../service/allocator-report/allocator-report.service';
import { AggregatedProvidersIPNIReportingStatus } from '../../service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { IpniMisreportingCheckerService } from '../../service/ipni-misreporting-checker/ipni-misreporting-checker.service';

@Controller('allocatorReport')
export class AllocatorReportController {
  private readonly logger = new Logger(AllocatorReportController.name);

  constructor(
    private readonly allocatorReportService: AllocatorReportService,
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  // TODO move this
  @Get('/aggregated-ipni-status')
  @ApiOperation({
    summary: 'Get aggregated providers IPNI reporting status',
  })
  @ApiOkResponse({
    description: 'Aggregated providers IPNI reporting status',
    type: AggregatedProvidersIPNIReportingStatus,
  })
  async getAggregatedProvidersIPNIReportingStatus(): Promise<AggregatedProvidersIPNIReportingStatus> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatus();
  }

  @Get(':allocator')
  @ApiOperation({
    summary: 'Get list of allocator compliance reports',
  })
  @ApiOkResponse({
    description: 'List of allocator compliance reports',
    type: null,
  })
  async getAllocatorReports(@Param('allocator') allocator: string) {
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
  async getAllocatorReport(@Param('allocator') allocator: string) {
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
  async getAllocatorReportById(
    @Param('allocator') allocator: string,
    @Param('id') id: string,
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
  async generateAllocatorReport(@Param('allocator') allocator: string) {
    const report = await this.allocatorReportService.generateReport(allocator);

    if (!report) throw new NotFoundException();
    return report;
  }
}

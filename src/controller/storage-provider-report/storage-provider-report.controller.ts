import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AggregatedProvidersIPNIReportingStatus } from '../../service/ipni-misreporting-checker/types.ipni-misreporting-checker';
import { IpniMisreportingCheckerService } from '../../service/ipni-misreporting-checker/ipni-misreporting-checker.service';

@Controller('providerReport')
export class StorageProviderReportController {
  private readonly logger = new Logger(StorageProviderReportController.name);

  constructor(
    private readonly ipniMisreportingCheckerService: IpniMisreportingCheckerService,
  ) {}

  @Get('/aggregatedIpniStatus')
  @ApiOperation({
    summary: 'Get aggregated storage providers IPNI reporting status',
  })
  @ApiOkResponse({
    description: 'Aggregated storage providers IPNI reporting status',
    type: AggregatedProvidersIPNIReportingStatus,
  })
  async getAggregatedProvidersIPNIReportingStatus(): Promise<AggregatedProvidersIPNIReportingStatus> {
    return await this.ipniMisreportingCheckerService.getAggregatedProvidersReportingStatus();
  }
}

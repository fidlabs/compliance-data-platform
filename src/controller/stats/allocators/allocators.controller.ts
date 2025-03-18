import { Controller, Get, Query } from '@nestjs/common';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiExcludeController, ApiOkResponse } from '@nestjs/swagger';
import { AllocatorSpsComplianceWeekResponse } from 'src/service/allocator/types.allocator';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { CacheTTL } from '@nestjs/cache-manager';
import { StorageProviderComplianceMetrics } from 'src/service/storage-provider/types.storage-provider';

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsAccController {
  protected isAccumulative: boolean = true;

  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorClients(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getStandardAllocatorClientsWeekly(
      this.isAccumulative,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getAllocatorRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.allocatorService.getStandardAllocatorRetrievabilityWeekly(
      this.isAccumulative,
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getStandardAllocatorBiggestClientDistributionWeekly(
      this.isAccumulative,
    );
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: AllocatorSpsComplianceWeekResponse })
  public async getAllocatorSpsCompliance(
    @Query() metricsToCheck: StorageProviderComplianceMetrics,
  ): Promise<AllocatorSpsComplianceWeekResponse> {
    return await this.allocatorService.getStandardAllocatorSpsComplianceWeekly(
      this.isAccumulative,
      metricsToCheck,
    );
  }
}

@Controller('stats/allocators')
@ApiExcludeController()
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsController extends AllocatorsAccController {
  constructor(allocatorService: AllocatorService) {
    super(allocatorService);
    this.isAccumulative = false;
  }
}

import { Controller, Get } from '@nestjs/common';
import { AllocatorService } from 'src/service/allocator/allocator.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { AllocatorSpsComplianceWeekResponse } from 'src/service/allocator/types.allocator';
import {
  HistogramWeekResponse,
  RetrievabilityWeekResponse,
} from 'src/service/histogram-helper/types.histogram-helper';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('stats/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsController {
  protected isAccumulative: boolean = false;

  constructor(private readonly allocatorService: AllocatorService) {}

  @Get('clients')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorClients(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getAllocatorClientsWeekly(
      this.isAccumulative,
    );
  }

  @Get('retrievability')
  @ApiOkResponse({ type: RetrievabilityWeekResponse })
  public async getAllocatorRetrievability(): Promise<RetrievabilityWeekResponse> {
    return await this.allocatorService.getAllocatorRetrievabilityWeekly(
      this.isAccumulative,
    );
  }

  @Get('biggest-client-distribution')
  @ApiOkResponse({ type: HistogramWeekResponse })
  public async getAllocatorBiggestClientDistribution(): Promise<HistogramWeekResponse> {
    return await this.allocatorService.getAllocatorBiggestClientDistributionWeekly(
      this.isAccumulative,
    );
  }

  @Get('sps-compliance')
  @ApiOkResponse({ type: AllocatorSpsComplianceWeekResponse })
  public async getAllocatorSpsCompliance(): Promise<AllocatorSpsComplianceWeekResponse> {
    return await this.allocatorService.getAllocatorSpsComplianceWeekly(
      this.isAccumulative,
    );
  }
}

@Controller('stats/acc/allocators')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class AllocatorsAccController extends AllocatorsController {
  constructor(allocatorService: AllocatorService) {
    super(allocatorService);
    this.isAccumulative = true;
  }
}

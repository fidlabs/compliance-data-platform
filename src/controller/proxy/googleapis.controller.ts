import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { GoogleApisService } from 'src/service/googleapis/googleapis.service';

class GetAllocatorsOverviewRequest {
  tab?: string;
}

@Controller('proxy/googleapis')
export class GoogleApisController {
  constructor(private readonly googleApisService: GoogleApisService) {}

  @Get('allocators-overview')
  @UseInterceptors(CacheInterceptor)
  async getAllocatorsOverview(@Query() params: GetAllocatorsOverviewRequest) {
    return await this.googleApisService.getAllocatorsOverview(params.tab);
  }
}

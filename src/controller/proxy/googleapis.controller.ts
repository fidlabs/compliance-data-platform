import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { GetAllocatorsOverviewRequest } from 'src/dto/getAllocatorsOverviewRequest.dto';
import { GoogleApisService } from 'src/service/googleapis/googleapis.service';

@Controller('proxy/googleapis')
export class GoogleApisController {
  constructor(private readonly googleApisService: GoogleApisService) {}

  @Get('allocators-overview')
  @UseInterceptors(CacheInterceptor)
  async getAllocatorsOverview(@Query() params: GetAllocatorsOverviewRequest) {
    return await this.googleApisService.getAllocatorsOverview(params.tab);
  }
}

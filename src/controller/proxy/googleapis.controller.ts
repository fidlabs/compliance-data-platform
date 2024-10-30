import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { GoogleApisService } from 'src/service/googleapis/googleapis.service';

@Controller('proxy/googleapis')
export class GoogleApisController {
  constructor(private readonly googleApisService: GoogleApisService) {}

  @Get('allocators-overview')
  @UseInterceptors(CacheInterceptor)
  async getAllocatorsOverview() {
    return await this.googleApisService.getAllocatorsOverview();
  }
}

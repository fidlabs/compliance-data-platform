import { Controller, Get } from '@nestjs/common';
import { GoogleApisService } from 'src/service/googleapis/googleapis.service';

@Controller('proxy/googleapis')
export class GoogleApisController {
  constructor(private readonly googleApisService: GoogleApisService) {}

  @Get('allocators-overview')
  async getAllocatorsOverview() {
    return await this.googleApisService.getAllocatorsOverview();
  }
}

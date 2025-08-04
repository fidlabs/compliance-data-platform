import { Controller, Get, Query } from '@nestjs/common';
import { GoogleApisService } from 'src/service/googleapis/googleapis.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { GoogleApisSpreadsheetValues } from 'src/service/googleapis/types.googleapis';
import { GetAllocatorsOverviewRequest } from './types.googleapis';

// TODO remove me
@Controller('proxy/googleapis')
export class GoogleApisController {
  constructor(private readonly googleApisService: GoogleApisService) {}

  @Get('allocators-overview')
  @ApiOkResponse({ type: GoogleApisSpreadsheetValues })
  @ApiOperation({
    summary: 'Get allocators overview from Google Sheets',
    deprecated: true,
  })
  public async getAllocatorsOverview(
    @Query() query: GetAllocatorsOverviewRequest,
  ): Promise<GoogleApisSpreadsheetValues> {
    return await this.googleApisService.getAllocatorsOverview(query.tab);
  }
}

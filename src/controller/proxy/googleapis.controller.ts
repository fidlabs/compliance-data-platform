import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { GetAllocatorsOverviewRequest } from 'src/types/getAllocatorsOverviewRequest.dto';
import { GoogleApisService } from 'src/service/googleapis/googleapis.service';
import { GoogleApisSpreadsheetValuesDto } from '../../types/googleApisSpreadsheetValues.dto';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

@Controller('proxy/googleapis')
export class GoogleApisController {
  constructor(private readonly googleApisService: GoogleApisService) {}

  @Get('allocators-overview')
  @UseInterceptors(CacheInterceptor)
  @ApiOkResponse({ type: GoogleApisSpreadsheetValuesDto })
  @ApiOperation({
    summary: 'Get allocators overview from Google Sheets',
  })
  async getAllocatorsOverview(
    @Query() query: GetAllocatorsOverviewRequest,
  ): Promise<GoogleApisSpreadsheetValuesDto> {
    return await this.googleApisService.getAllocatorsOverview(query.tab);
  }
}

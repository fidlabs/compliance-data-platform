import { ApiProperty } from '@nestjs/swagger';
import { SpsComplianceHistogramWeekDto } from './spsComplianceHistogramWeek.dto';

export class SpsComplianceHistogramWeekResponseDto {
  @ApiProperty({ type: SpsComplianceHistogramWeekDto, isArray: true })
  results: SpsComplianceHistogramWeekDto[];

  constructor(results: SpsComplianceHistogramWeekDto[]) {
    this.results = results;
  }
}

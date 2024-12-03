import { ApiProperty } from '@nestjs/swagger';
import { SpsComplianceWeekDto } from './spsComplianceWeek.dto';

export class SpsComplianceWeekResponseDto {
  @ApiProperty({ type: SpsComplianceWeekDto, isArray: true })
  results: SpsComplianceWeekDto[];

  constructor(results: SpsComplianceWeekDto[]) {
    this.results = results;
  }
}

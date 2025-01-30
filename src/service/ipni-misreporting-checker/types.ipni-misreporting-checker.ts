import { ApiProperty } from '@nestjs/swagger';

export class AggregatedProvidersIPNIMisreportingStatus {
  @ApiProperty()
  misreporting: number;

  @ApiProperty()
  total: number;
}

export class ProviderIPNIMisreportingStatus {
  @ApiProperty()
  misreporting: boolean;

  @ApiProperty()
  actualClaimsCount: number;

  @ApiProperty({ nullable: true })
  ipniReportedClaimsCount: number | null;
}

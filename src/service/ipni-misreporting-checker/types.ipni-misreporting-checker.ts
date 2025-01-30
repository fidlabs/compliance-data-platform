import { ApiProperty } from '@nestjs/swagger';
import { StorageProviderIpniReportingStatus } from 'prisma/generated/client';

export class AggregatedProvidersIPNIReportingStatus {
  @ApiProperty()
  misreporting: number;

  @ApiProperty()
  notReporting: number;

  @ApiProperty()
  ok: number;

  @ApiProperty()
  total: number;
}

export class ProviderIPNIReportingStatus {
  status: StorageProviderIpniReportingStatus;
  actualClaimsCount: number;
  ipniReportedClaimsCount: number | null;
}

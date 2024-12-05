import { Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ComplianceReportService } from '../../service/compliance-report/compliance-report.service';

@Controller('complianceReport')
export class ComplianceReportController {
  constructor(
    private readonly complianceReportService: ComplianceReportService,
  ) {}

  @Post(':allocatorAddress')
  @ApiOperation({
    summary: 'Generate Compliance report for a given Allocator',
  })
  @ApiCreatedResponse({
    description: 'Compliance Report',
    type: null,
  })
  async generateComplianceReport(
    @Param('allocatorAddress') allocatorAddress: string,
  ) {
    await this.complianceReportService.generateReport(allocatorAddress);
  }
}

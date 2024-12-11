import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ComplianceReportService } from '../../service/compliance-report/compliance-report.service';

@Controller('complianceReport')
export class ComplianceReportController {
  constructor(
    private readonly complianceReportService: ComplianceReportService,
  ) {}

  @Get(':allocator')
  @ApiOperation({
    summary: 'Get list of compliance reports',
  })
  @ApiOkResponse({
    description: 'List of compliance reports',
    type: null,
  })
  async getComplianceReports(@Param('allocator') allocator: string) {
    return await this.complianceReportService.getReports(allocator);
  }

  @Get(':allocator/latest')
  @ApiOperation({
    summary: 'Get latest compliance report',
  })
  @ApiOkResponse({
    description: 'Compliance Report',
    type: null,
  })
  async getComplianceReport(@Param('allocator') allocator: string) {
    const report =
      await this.complianceReportService.getLatestReport(allocator);

    if (!report) throw new NotFoundException();
    return report;
  }

  @Get(':allocator/:id')
  @ApiOperation({
    summary: 'Get compliance report by id',
  })
  @ApiOkResponse({
    description: 'Compliance Report',
    type: null,
  })
  async getComplianceReportById(
    @Param('allocator') allocator: string,
    @Param('id') id: bigint,
  ) {
    const report = await this.complianceReportService.getReport(allocator, id);

    if (!report) throw new NotFoundException();
    return report;
  }

  @Post(':allocator')
  @ApiOperation({
    summary: 'Generate compliance report for a given allocator',
  })
  @ApiCreatedResponse({
    description: 'Compliance Report',
    type: null,
  })
  async generateComplianceReport(@Param('allocator') allocator: string) {
    const report = await this.complianceReportService.generateReport(allocator);

    if (!report) throw new NotFoundException();
    return report;
  }
}

import { Controller, Get, Param, Post } from '@nestjs/common';
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

  @Get(':allocatorAddress')
  @ApiOperation({
    summary: 'Get list of compliance reports',
  })
  @ApiOkResponse({
    description: 'List of compliance reports',
    type: null,
  })
  async getComplianceReports(
    @Param('allocatorAddress') allocatorAddress: string,
  ) {
    //
  }

  @Get(':allocatorAddress/latest')
  @ApiOperation({
    summary: 'Get latest compliance report',
  })
  @ApiOkResponse({
    description: 'Compliance Report',
    type: null,
  })
  async getComplianceReport(
    @Param('allocatorAddress') allocatorAddress: string,
  ) {
    //
  }

  @Get(':allocatorAddress/:id')
  @ApiOperation({
    summary: 'Get compliance report by id',
  })
  @ApiOkResponse({
    description: 'Compliance Report',
    type: null,
  })
  async getComplianceReportById(
    @Param('allocatorAddress') allocatorAddress: string,
    @Param('id') id: bigint,
  ) {
    //
  }

  @Post(':allocatorAddress')
  @ApiOperation({
    summary: 'Generate compliance report for a given allocator',
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

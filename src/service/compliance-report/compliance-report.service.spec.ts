import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceReportService } from './compliance-report.service';

describe('ComplianceReportService', () => {
  let service: ComplianceReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplianceReportService],
    }).compile();

    service = module.get<ComplianceReportService>(ComplianceReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

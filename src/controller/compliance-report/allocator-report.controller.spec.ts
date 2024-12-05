import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceReportController } from './compliance-report.controller';

describe('ComplianceReportController', () => {
  let controller: ComplianceReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceReportController],
    }).compile();

    controller = module.get<ComplianceReportController>(
      ComplianceReportController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

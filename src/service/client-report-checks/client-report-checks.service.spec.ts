import { Test, TestingModule } from '@nestjs/testing';
import { ClientReportChecksService } from './client-report-checks.service';

describe('ClientReportChecksService', () => {
  let service: ClientReportChecksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientReportChecksService],
    }).compile();

    service = module.get<ClientReportChecksService>(ClientReportChecksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

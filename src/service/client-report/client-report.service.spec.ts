import { Test, TestingModule } from '@nestjs/testing';
import { ClientReportService } from './client-report.service';

describe('ClientReportService', () => {
  let service: ClientReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientReportService],
    }).compile();

    service = module.get<ClientReportService>(ClientReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

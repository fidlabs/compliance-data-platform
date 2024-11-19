import { Test, TestingModule } from '@nestjs/testing';
import { ClientReportGeneratorJobService } from './client-report-generator-job.service';

describe('ClientReportGeneratorJobService', () => {
  let service: ClientReportGeneratorJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientReportGeneratorJobService],
    }).compile();

    service = module.get<ClientReportGeneratorJobService>(
      ClientReportGeneratorJobService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

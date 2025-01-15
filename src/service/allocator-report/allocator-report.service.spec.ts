import { Test, TestingModule } from '@nestjs/testing';
import { AllocatorReportService } from './allocator-report.service';

describe('AllocatorReportService', () => {
  let service: AllocatorReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllocatorReportService],
    }).compile();

    service = module.get<AllocatorReportService>(AllocatorReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

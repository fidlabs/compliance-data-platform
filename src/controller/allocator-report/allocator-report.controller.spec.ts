import { Test, TestingModule } from '@nestjs/testing';
import { AllocatorReportController } from './allocator-report.controller';

describe('AllocatorReportController', () => {
  let controller: AllocatorReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllocatorReportController],
    }).compile();

    controller = module.get<AllocatorReportController>(
      AllocatorReportController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

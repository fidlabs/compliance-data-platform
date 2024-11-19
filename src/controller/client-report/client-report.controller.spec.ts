import { Test, TestingModule } from '@nestjs/testing';
import { ClientReportController } from './client-report.controller';

describe('ClientReportController', () => {
  let controller: ClientReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientReportController],
    }).compile();

    controller = module.get<ClientReportController>(ClientReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DataCapStatsService } from './datacapstats.service';

describe('DatacapstatsService', () => {
  let service: DataCapStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataCapStatsService],
    }).compile();

    service = module.get<DataCapStatsService>(DataCapStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

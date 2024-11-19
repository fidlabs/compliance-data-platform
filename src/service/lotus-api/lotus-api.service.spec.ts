import { Test, TestingModule } from '@nestjs/testing';
import { LotusApiService } from './lotus-api.service';

describe('LotusApiService', () => {
  let service: LotusApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LotusApiService],
    }).compile();

    service = module.get<LotusApiService>(LotusApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

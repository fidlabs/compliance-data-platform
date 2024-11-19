import { Test, TestingModule } from '@nestjs/testing';
import { LotusApiService } from './lotus-api.service';

describe('ProteusShieldService', () => {
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

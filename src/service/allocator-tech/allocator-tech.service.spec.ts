import { Test, TestingModule } from '@nestjs/testing';
import { AllocatorTechService } from './allocator-tech.service';

describe('AllocatorTechService', () => {
  let service: AllocatorTechService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllocatorTechService],
    }).compile();

    service = module.get<AllocatorTechService>(AllocatorTechService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

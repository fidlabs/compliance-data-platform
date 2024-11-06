import { Test, TestingModule } from '@nestjs/testing';
import { ProteusShieldService } from './proteus-shield.service';

describe('ProteusShieldService', () => {
  let service: ProteusShieldService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProteusShieldService],
    }).compile();

    service = module.get<ProteusShieldService>(ProteusShieldService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

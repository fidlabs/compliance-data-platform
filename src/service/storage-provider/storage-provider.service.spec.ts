import { Test, TestingModule } from '@nestjs/testing';
import { StorageProviderService } from './storage-provider.service';

describe('StorageProviderService', () => {
  let service: StorageProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageProviderService],
    }).compile();

    service = module.get<StorageProviderService>(StorageProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

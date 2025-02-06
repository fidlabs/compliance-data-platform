import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AllocatorTechApplicationResponse } from './types.allocator-tech';
import { AllocatorTechAllocatorResponse } from './types.allocator-tech';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Cacheable } from 'src/utils/cacheable';

@Injectable()
export class AllocatorTechService {
  private readonly logger = new Logger(AllocatorTechService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Cacheable({ ttl: 1000 * 60 * 60 }) // 1 hour
  public async getApplications(): Promise<AllocatorTechApplicationResponse[]> {
    const endpoint = `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/applications`;

    const { data } = await firstValueFrom(
      this.httpService.get<AllocatorTechApplicationResponse[]>(endpoint),
    );

    return data;
  }

  @Cacheable({ ttl: 1000 * 60 * 60 }) // 1 hour
  public async getAllocators(): Promise<AllocatorTechAllocatorResponse[]> {
    const endpoint = `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/allocators`;

    const { data } = await firstValueFrom(
      this.httpService.get<AllocatorTechAllocatorResponse[]>(endpoint),
    );

    return data.filter((allocator) => allocator.address);
  }

  public async getAllocatorInfo(
    allocatorAddress: string,
  ): Promise<AllocatorTechAllocatorResponse | undefined> {
    const allocators = await this.getAllocators();

    return allocators.find(
      (allocator) => allocator.address === allocatorAddress,
    );
  }
}

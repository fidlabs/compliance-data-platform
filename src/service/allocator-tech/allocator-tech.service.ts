import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AllocatorTechApplicationResponse } from './types.allocator-tech';
import { AllocatorTechAllocatorResponse } from './types.allocator-tech';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AllocatorTechService {
  private readonly _applicationsCacheKey = 'allocatorTechCache';
  private readonly _allocatorsCacheKey = 'allocatorTechAllocatorsCache';
  private readonly logger = new Logger(AllocatorTechService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getApplications(): Promise<AllocatorTechApplicationResponse[]> {
    const cachedApplications = await this.cacheManager.get<
      AllocatorTechApplicationResponse[]
    >(this._applicationsCacheKey);
    if (cachedApplications) return cachedApplications;

    return await this.fetchAndCacheApplications();
  }

  async getAllocators(): Promise<AllocatorTechAllocatorResponse[]> {
    const cachedAllocators = await this.cacheManager.get<
      AllocatorTechAllocatorResponse[]
    >(this._allocatorsCacheKey);
    if (cachedAllocators) return cachedAllocators;

    return await this.fetchAndCacheAllocators();
  }

  async getAllocatorInfo(
    allocatorAddress: string,
  ): Promise<AllocatorTechAllocatorResponse | undefined> {
    const allocators = await this.getAllocators();
    return allocators.find(
      (allocator) => allocator.address === allocatorAddress,
    );
  }

  private async fetchAndCacheAllocators(): Promise<
    AllocatorTechAllocatorResponse[]
  > {
    const endpoint = `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/allocators`;
    const { data } = await firstValueFrom(
      this.httpService.get<AllocatorTechAllocatorResponse[]>(endpoint),
    );

    // cache
    await this.cacheManager.set(
      this._allocatorsCacheKey,
      data,
      60 * 60 * 1000, // 1 hour
    );

    return data;
  }

  private async fetchAndCacheApplications(): Promise<
    AllocatorTechApplicationResponse[]
  > {
    const endpoint = `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/applications`;
    const { data } = await firstValueFrom(
      this.httpService.get<AllocatorTechApplicationResponse[]>(endpoint),
    );

    // cache
    await this.cacheManager.set(
      this._applicationsCacheKey,
      data,
      60 * 60 * 1000, // 1 hour
    );

    return data;
  }
}

import { Controller, Get, Inject, Logger, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { StorageProviderService } from 'src/service/storage-provider/storage-provider.service';
import {
  StorageProviderComplianceMetrics,
  StorageProviderWithIpInfo,
} from 'src/service/storage-provider/types.storage-provider';
import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import { ControllerBase } from '../base/controller-base';
import { Cacheable } from 'src/utils/cacheable';
import {
  GetStorageProvidersRequest,
  GetWeekStorageProvidersWithSpsComplianceRequest,
  GetWeekStorageProvidersWithSpsComplianceRequestData,
} from './types.storage-providers';
import { lastWeek, stringToDate } from 'src/utils/utils';

@Controller('storage-providers')
@CacheTTL(1000 * 60 * 30) // 30 minutes
export class StorageProvidersController extends ControllerBase {
  private readonly logger = new Logger(StorageProvidersController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly storageProviderService: StorageProviderService,
  ) {
    super();
  }

  @Get('/ip-info')
  @ApiOperation({
    summary: 'Get list of storage providers with ip info',
  })
  @ApiOkResponse({
    description: 'List of storage providers with ip info',
    type: StorageProviderWithIpInfo,
    isArray: true,
  })
  public async getStorageProvidersWithIpInfo(): Promise<
    StorageProviderWithIpInfo[]
  > {
    return await this.storageProviderService.getProvidersWithIpInfo();
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  private async _getStorageProviders() {
    return (await this.storageProviderService.getProviders()).map((p) => ({
      provider: p.id,
      noOfVerifiedDeals: p.num_of_deals,
      verifiedDealsTotalSize: p.total_deal_size,
      noOfClients: p.num_of_clients,
      lastDealHeight: p.last_deal_height,
    }));
  }

  @Get()
  @ApiOperation({
    summary: 'Get list of all storage providers',
  })
  @ApiOkResponse({
    description: 'List of storage providers',
    type: null,
  })
  public async getStorageProviders(@Query() query: GetStorageProvidersRequest) {
    let providers = await this._getStorageProviders();

    if (query.provider) {
      providers = providers.filter(
        (provider) => provider.provider === query.provider,
      );
    }

    return this.withPaginationInfo(
      {
        count: providers.length,
        data: this.paginated(this.sorted(providers, query), query),
      },
      query,
      providers.length,
    );
  }

  @Cacheable({ ttl: 1000 * 60 * 30 }) // 30 minutes
  private async _getWeekStorageProvidersWithSpsCompliance(
    query: GetWeekStorageProvidersWithSpsComplianceRequestData,
  ) {
    const providers = await this._getStorageProviders();

    const weekAverageRetrievability =
      await this.storageProviderService.getWeekAverageProviderRetrievability(
        stringToDate(query.week!)!,
      );

    const weekProviders = await this.storageProviderService.getWeekProviders(
      stringToDate(query.week!)!,
    );

    return weekProviders
      .map((provider) => {
        const providerData = providers.find(
          (p) => p.provider === provider.provider,
        );

        return (
          providerData && {
            complianceScore:
              this.storageProviderService.calculateProviderComplianceScore(
                provider,
                weekAverageRetrievability,
                StorageProviderComplianceMetrics.of(query),
              ).complianceScore,
            ...providerData,
          }
        );
      })
      .filter((provider) => provider?.provider);
  }

  @Get('/compliance-data')
  @ApiOperation({
    summary: 'Get list of storage providers with compliance score',
  })
  @ApiOkResponse({
    description: 'List of storage providers with compliance score',
    type: null,
  })
  public async getWeekStorageProvidersWithSpsCompliance(
    @Query() query: GetWeekStorageProvidersWithSpsComplianceRequest,
  ) {
    query.week ??= lastWeek().toISOString(); // last week default

    let providers = await this._getWeekStorageProvidersWithSpsCompliance(query);

    if (query.complianceScore) {
      providers = providers.filter(
        (storageProvider) =>
          storageProvider.complianceScore === query.complianceScore,
      );
    }

    if (query.provider) {
      providers = providers.filter(
        (provider) => provider.provider === query.provider,
      );
    }

    return this.withPaginationInfo(
      {
        week: query.week,
        metricsChecked: StorageProviderComplianceMetrics.of(query),
        complianceScore: query.complianceScore,
        count: providers.length,
        data: this.paginated(this.sorted(providers, query), query),
      },
      query,
      providers.length,
    );
  }
}

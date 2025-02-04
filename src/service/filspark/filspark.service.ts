import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { RetrievabilityInfo } from './types.filspark';

@Injectable()
export class FilSparkService {
  private readonly logger = new Logger(FilSparkService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchRetrievability(date?: DateTime): Promise<RetrievabilityInfo[]> {
    const dateParam = date?.toFormat('yyyy-MM-dd');
    const endpoint =
      'https://stats.filspark.com/miners/retrieval-success-rate/summary';

    const { data } = await lastValueFrom(
      this.httpService.get<RetrievabilityInfo[]>(endpoint, {
        params: dateParam && {
          from: dateParam,
          to: dateParam,
        },
      }),
    );

    return data;
  }
}

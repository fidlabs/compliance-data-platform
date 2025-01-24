import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { RetrievabilityInfoDto } from 'src/types/retrievabilityInfo.dto';

@Injectable()
export class FilSparkService {
  private readonly logger = new Logger(FilSparkService.name);
  constructor(private readonly httpService: HttpService) {}

  async fetchRetrievability(
    date?: DateTime | null,
  ): Promise<RetrievabilityInfoDto[]> {
    const dateParam = date?.toFormat('yyyy-MM-dd');
    const endpoint =
      'https://stats.filspark.com/miners/retrieval-success-rate/summary';

    const { data } = await lastValueFrom(
      this.httpService.get<RetrievabilityInfoDto[]>(endpoint, {
        params: dateParam && {
          from: dateParam,
          to: dateParam,
        },
      }),
    );

    return data;
  }
}

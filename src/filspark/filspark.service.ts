import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { DateTime } from 'luxon';

interface RetrievabilityInfo {
  miner_id: string;
  total: string;
  successful: string;
  success_rate: number;
}

@Injectable()
export class FilSparkService {
  private readonly logger = new Logger(FilSparkService.name);
  constructor(private readonly httpService: HttpService) {}

  async fetchRetrievability(date: DateTime): Promise<RetrievabilityInfo[]> {
    const dateParam = date.toFormat('yyyy-MM-dd');
    const endpoint =
      'https://stats.filspark.com/miners/retrieval-success-rate/summary';
    const { data } = await lastValueFrom(
      this.httpService
        .get<RetrievabilityInfo[]>(endpoint, {
          params: {
            from: dateParam,
            to: dateParam,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw error;
          }),
        ),
    );
    return data;
  }
}
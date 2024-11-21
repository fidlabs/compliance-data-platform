import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, lastValueFrom } from 'rxjs';
import { GoogleApisSpreadsheetValuesDto } from '../../types/googleApisSpreadsheetValues.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleApisService {
  private readonly logger = new Logger(GoogleApisService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getAllocatorsOverview(
    tab?: string,
  ): Promise<GoogleApisSpreadsheetValuesDto> {
    tab ||= 'GRAPHS';
    const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/1Rx3ZsUh7rhjdAARBNdBHgdbhBM5zFlEnqghC7A0JZ4k/values/${tab}`;

    const { data } = await lastValueFrom(
      this.httpService
        .get<GoogleApisSpreadsheetValuesDto>(endpoint, {
          params: {
            key: this.configService.get<string>('GOOGLEAPIS_KEY'),
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

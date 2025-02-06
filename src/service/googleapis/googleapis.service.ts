import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { GoogleApisSpreadsheetValues } from './types.googleapis';

@Injectable()
export class GoogleApisService {
  private readonly logger = new Logger(GoogleApisService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  public async getAllocatorsOverview(
    tab?: string,
  ): Promise<GoogleApisSpreadsheetValues> {
    tab ||= 'GRAPHS';
    const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/1Rx3ZsUh7rhjdAARBNdBHgdbhBM5zFlEnqghC7A0JZ4k/values/${tab}`;

    const { data } = await lastValueFrom(
      this.httpService.get<GoogleApisSpreadsheetValues>(endpoint, {
        params: {
          key: this.configService.get<string>('GOOGLEAPIS_KEY'),
        },
      }),
    );
    return data;
  }
}

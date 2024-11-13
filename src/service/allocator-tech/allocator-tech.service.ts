import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { AllocatorTechApplicationsResponse } from './types.allocator-tech';

@Injectable()
export class AllocatorTechService {
  private readonly logger = new Logger(AllocatorTechService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async fetchApplications(): Promise<AllocatorTechApplicationsResponse> {
    const endpoint = `${this.configService.get<string>('ALLOCATOR_TECH_BASE_URL')}/applications`;
    const { data } = await firstValueFrom(
      this.httpService.get<AllocatorTechApplicationsResponse>(endpoint).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw error;
        }),
      ),
    );
    return data;
  }
}

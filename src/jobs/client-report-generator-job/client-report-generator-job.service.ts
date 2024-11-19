import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AllocatorTechService } from '../../service/allocator-tech/allocator-tech.service';
import { ClientReportService } from '../../service/client-report/client-report.service';
import { LotusApiService } from '../../service/proteus-shield/lotus-api.service';

@Injectable()
export class ClientReportGeneratorJobService {
  private readonly logger = new Logger(ClientReportGeneratorJobService.name);

  constructor(
    private readonly allocatorTechService: AllocatorTechService,
    private readonly clientReportService: ClientReportService,
    private readonly proteusShieldService: LotusApiService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runClientReportGenerationJob() {
    this.logger.debug('Starting Client Reports generation');
    const applications = await this.allocatorTechService.getApplications();
    for (let i = 0; i < applications.length; i++) {
      const application = applications[i];
      this.logger.debug(
        `Starting generation of Client Report for application #${application[0].ID}`,
      );

      // find Filecoin Client ID
      const filecoinId = await this.proteusShieldService.getFilecoinClientId(
        application[0].ID,
      );
      if (!filecoinId) {
        this.logger.debug(
          `Filecoin Id not found for address #${application[0].ID}`,
        );
        continue;
      }

      await this.clientReportService.generateReport(filecoinId);

      if (i > 0 && i % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 60));
      }
    }
    this.logger.debug('Finishing Client Reports generation');
  }
}

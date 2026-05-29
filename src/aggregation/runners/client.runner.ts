import { Prisma } from 'prisma/generated/client';
import { getClientsDatacapUsage } from 'prisma/generated/client/sql';
import {
  AggregationRunner,
  AggregationRunnerRunServices,
} from '../aggregation-runner';
import { AggregationTable } from '../aggregation-table';

type CreateClientInput = Prisma.clientCreateManyInput;

export class ClientRunner implements AggregationRunner {
  public async run({
    prismaService,
    prismaDmobService,
    prometheusMetricService,
  }: AggregationRunnerRunServices): Promise<void> {
    const {
      startGetDataTimerByRunnerNameMetric,
      startStoreDataTimerByRunnerNameMetric,
    } = prometheusMetricService.aggregateMetrics;

    const getDataEndTimerMetric = startGetDataTimerByRunnerNameMetric(
      ClientRunner.name,
    );

    const [verifiedClientsResults, datacapUsageResults] = await Promise.all([
      prismaDmobService.verified_client.findMany({
        where: {
          addressId: {
            not: '',
          },
        },
      }),
      prismaService.$queryRawTyped(getClientsDatacapUsage()),
    ]);

    const datacapUsagePairs = datacapUsageResults.map((result) => {
      return [result.client_id, result] as const;
    });
    const datacapUsageMap = new Map(datacapUsagePairs);
    const rowsToInsert = verifiedClientsResults.map<CreateClientInput>(
      (result) => {
        const clientDatacapUsage = datacapUsageMap.get(result.addressId);

        return {
          id: result.addressId,
          address: result.address,
          name: result.name,
          github_url: result.auditTrail === 'n/a' ? null : result.auditTrail,
          datacap_received: this.decimalToBigInt(result.initialAllowance),
          datacap_remaining: this.decimalToBigInt(result.allowance),
          datacap_used_2_weeks: clientDatacapUsage
            ? this.decimalToBigInt(clientDatacapUsage.dc_used_2_weeks)
            : 0n,
          datacap_used_90_days: clientDatacapUsage
            ? this.decimalToBigInt(clientDatacapUsage.dc_used_90_days)
            : 0n,
        };
      },
    );

    getDataEndTimerMetric();

    const storeDataEndTimerMetric = startStoreDataTimerByRunnerNameMetric(
      ClientRunner.name,
    );

    await prismaService.$transaction([
      prismaService.client.deleteMany(),
      prismaService.client.createMany({
        data: rowsToInsert,
        skipDuplicates: true,
      }),
    ]);

    storeDataEndTimerMetric();
  }

  getFilledTables(): AggregationTable[] {
    return [AggregationTable.Client];
  }

  getDependingTables(): AggregationTable[] {
    return [AggregationTable.ClientClaimsHourly];
  }

  private decimalToBigInt(decimal: Prisma.Decimal) {
    return BigInt(decimal.round().toString());
  }
}

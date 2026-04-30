import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { PrismaPromise } from 'prisma/generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { AbiEvent, GetLogsReturnType } from 'viem';
import {
  ARCHIVE_NODE_CLIENT,
  RECENT_NODE_CLIENT,
} from '../po-rep-indexer.constants';
import { PoRepConfig, PoRepPublicClient } from '../po-rep-indexer.types';

@Injectable()
export abstract class AbstractPoRepIndexerRunner<
  EventType extends AbiEvent = AbiEvent,
> {
  // Returns runner name used for storing information about indexing
  public abstract getName(): string;

  // Increase returned value to trigger cleanup on next run and index from the beginning
  protected abstract getVersion(): number;

  // Return block height from which indexing should start initially and
  // after every cleanup
  protected abstract getOriginBlock(): bigint;

  // Returns maximum number of blocks to be processed every iteration
  protected abstract getBatchBlockSize(): bigint;

  // Returns events that should be processed
  protected abstract getEventTypes(): EventType[];

  // Return DB operations necessary for cleanup when version changes
  protected abstract prepareCleanup(): PrismaPromise<unknown>[];

  // Return DB updates based on processed logs
  protected abstract prepareUpdates(
    logs: GetLogsReturnType<undefined, EventType[], undefined, bigint, bigint>,
  ): PrismaPromise<unknown>[];

  protected logger: Logger;
  private isRunning: boolean = false;

  constructor(
    protected readonly configService: ConfigService<PoRepConfig, true>,
    protected readonly prismaService: PrismaService,
    @Inject(RECENT_NODE_CLIENT)
    protected readonly recentNodeClient: PoRepPublicClient,
    @Inject(ARCHIVE_NODE_CLIENT)
    protected readonly archiveNodeClient: PoRepPublicClient,
  ) {
    this.logger = new Logger(this.getName());
  }

  // Run every hour by default. Override it with different decorator to change.
  @Cron(CronExpression.EVERY_HOUR)
  public async execute() {
    this.logger.log('Starting indexing');

    if (this.isRunning) {
      this.logger.log('Indexing already in progress, skipping execution');
      return;
    }

    try {
      this.isRunning = true;

      const startDate = DateTime.now().toUTC();
      const chainId = BigInt(this.configService.get('PO_REP_CHAIN_ID'));
      const runner = this.getName();
      const version = this.getVersion();
      const [currentBlock, lastRun] = await Promise.all([
        this.recentNodeClient.getBlockNumber(),
        this.prismaService.po_rep_indexer_run.findFirst({
          where: {
            chainId: chainId,
            runner: runner,
            version: version,
          },
          orderBy: {
            date: 'desc',
          },
        }),
      ]);

      const versionChanged = !lastRun || lastRun.version !== version;
      const fromBlock = versionChanged
        ? this.getOriginBlock()
        : lastRun.blockEnd + 1n;
      const blockDifference = currentBlock - fromBlock;
      const batchBlockSize = this.getBatchBlockSize();
      const toBlock =
        blockDifference >= batchBlockSize
          ? fromBlock + batchBlockSize - 1n
          : currentBlock;
      const shouldUseArchiveNode =
        blockDifference >= this.getArchiveNodeThreshold();
      const publicClient = shouldUseArchiveNode
        ? this.archiveNodeClient
        : this.recentNodeClient;

      this.logger.log(
        `Fetching logs in block range [${fromBlock.toString()}-${toBlock.toString()}] using ${shouldUseArchiveNode ? '"Archive Node"' : '"Recent Node"'}`,
      );

      const logs = await publicClient.getLogs({
        events: this.getEventTypes(),
        fromBlock: fromBlock,
        toBlock: toBlock,
      });

      this.logger.log(`Found ${logs.length} matching logs`);

      const operations: PrismaPromise<unknown>[] = [
        ...(versionChanged ? this.prepareCleanup() : []),
        ...this.prepareUpdates(logs),
        this.prismaService.po_rep_indexer_run.create({
          data: {
            date: startDate.toJSDate(),
            chainId: chainId,
            runner: runner,
            version: version,
            blockStart: fromBlock,
            blockEnd: toBlock,
            eventsCount: logs.length,
          },
        }),
      ];

      await this.prismaService.$transaction(operations);

      const keepRunning = currentBlock !== toBlock;
      this.logger.log(
        keepRunning
          ? `Indexed ${logs.length} logs up to block ${toBlock.toString()}. Scheduling another run.`
          : `Finished indexing ${logs.length} logs.`,
      );
      this.isRunning = false;

      // keep indexing if we havent synced up
      if (keepRunning) {
        this.execute();
      }
    } catch (error) {
      this.isRunning = false;
      this.logger.error(`Error during indexing: ${String(error)}`);
    }
  }

  protected getArchiveNodeThreshold(): bigint {
    return 1920n;
  }
}

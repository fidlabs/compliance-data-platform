import { Injectable } from '@nestjs/common';
import { InputJsonArray } from 'prisma/generated/client/runtime/library';
import { PrismaService } from 'src/db/prisma.service';
import * as z from 'zod';
import {
  DEAL_MANIFEST_NESTED_SCHEMA,
  DEAL_MANIFEST_PIECES_LIST_SCHEMA,
  DEAL_MANIFEST_SCHEMA,
} from './po-rep-indexer.constants';
import {
  CachedManifestInvalidError,
  CachedManifestLocationMismatchError,
} from './po-rep-indexer.errors';
import {
  DealManifest,
  DealManifestPiece,
  DealManifestResult,
} from './po-rep-indexer.types';
import * as fsboardManifest from './manifests/fsboard.json';
import * as pileManifest from './manifests/pile-uncopyrighted.json';
import * as rarePlanesManifest from './manifests/rare-planes.json';
import * as fidlAiBundleManifest from './manifests/fidl-ai-bundle.json';
import * as noaaManifest from './manifests/noaa.json';
import * as genomeBrowserManifest from './manifests/genome-browser.json';
import * as encodeManifest from './manifests/encode.json';
import * as filecoinTracesManifest from './manifests/filecoin-traces.json';
import { Prisma } from 'prisma/generated/client';

const missingManifests = [
  [
    'http://117.55.199.67:9090/api/preparation/fsboard/piece',
    [1, 2, 16, 17],
    fsboardManifest,
  ],
  [
    'http://117.55.199.67:9090/api/preparation/pile_uncopyrighted/piece',
    [8, 12, 15],
    pileManifest,
  ],
  [
    'http://117.55.199.67:9090/api/preparation/rare_planes/piece',
    [9, 13, 14],
    rarePlanesManifest,
  ],
  [
    'http://117.55.199.67:9090/api/preparation/bundle/piece',
    [10, 11],
    fidlAiBundleManifest,
  ],
  [
    'http://117.55.199.67:9090/api/preparation/noaa_wfs/piece',
    [18, 19, 20, 21, 22],
    noaaManifest,
  ],
  [
    'http://117.55.199.67:9090/api/preparation/genome_browser/piece',
    [23, 24, 25, 26, 27, 28, 29, 30],
    genomeBrowserManifest,
  ],
  [
    'http://117.55.199.67:9090/api/preparation/ENCODE/piece',
    [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
    encodeManifest,
  ],
  [
    'http://117.55.199.67:9090/api/preparation/filecoin_traces_0614/piece',
    [68, 69, 70, 71, 72, 75, 80],
    filecoinTracesManifest,
  ],
] as const satisfies [
  manifestLocation: string,
  dealsIds: Array<number | bigint>,
  manifestContent: InputJsonArray,
][];

@Injectable()
export class DealManifestService {
  constructor(private readonly prismaService: PrismaService) {}

  public async readDealManifest(
    dealId: bigint,
    manifestLocation: string,
  ): Promise<DealManifestResult> {
    try {
      const cachedResult =
        await this.prismaService.po_rep_deal_manifest_cache.findFirst({
          where: { deal_id: dealId },
        });

      if (!cachedResult) {
        const manifestContent =
          await this.readDealManifestFromUrl(manifestLocation);

        return {
          success: true,
          dealId: dealId,
          manifestLocation: manifestLocation,
          data: {
            cached: false,
            manifestContent: manifestContent,
          },
        };
      }

      if (cachedResult.manifest_location !== manifestLocation) {
        throw new CachedManifestLocationMismatchError(
          dealId,
          manifestLocation,
          cachedResult.manifest_location,
        );
      }

      const parsedResult = DEAL_MANIFEST_SCHEMA.safeParse(
        cachedResult.manifest_content,
      );

      if (!parsedResult.success) {
        throw new CachedManifestInvalidError(dealId);
      }

      return {
        success: true,
        dealId: dealId,
        manifestLocation: manifestLocation,
        data: {
          cached: true,
          manifestContent: parsedResult.data,
        },
      };
    } catch (error) {
      return {
        success: false,
        dealId: dealId,
        manifestLocation: manifestLocation,
        error: error,
      };
    }
  }

  public async readDealManifestFromUrl(
    manifestLocation: string,
  ): Promise<DealManifest> {
    const urlResult = z
      .url({
        protocol: /^https?$/,
      })
      .safeParse(manifestLocation);

    if (urlResult.error) {
      throw new TypeError(
        `Manifest location "${manifestLocation}" is not a valid URL.`,
      );
    }

    const response = await fetch(manifestLocation, {
      headers: [['Accept', 'application/json']],
    });

    if (!response.ok) {
      throw new Error(
        `Coult not fetch manifest contents at "${manifestLocation}". Got HTTP status ${response.status}.`,
      );
    }

    const json = await response.json();
    const manifestResult = DEAL_MANIFEST_SCHEMA.safeParse(json);

    if (!manifestResult.success) {
      throw new TypeError(
        `Content of "${manifestLocation}" is not a valid manifest JSON.`,
      );
    }

    return manifestResult.data;
  }

  public async seedMissingManifests() {
    const cacheInputs = missingManifests.flatMap((tuple) => {
      const [manifestLocation, dealsIds, manifestContent] = tuple;

      return dealsIds.map<Prisma.po_rep_deal_manifest_cacheCreateManyInput>(
        (dealId) => {
          return {
            deal_id: dealId,
            manifest_location: manifestLocation,
            manifest_content: manifestContent,
          };
        },
      );
    });

    await this.prismaService.po_rep_deal_manifest_cache.createMany({
      data: cacheInputs,
      skipDuplicates: true,
    });
  }

  public extractDealManifestPieces(
    dealManifest: DealManifest,
  ): DealManifestPiece[] {
    const nestedParseResult =
      DEAL_MANIFEST_NESTED_SCHEMA.safeParse(dealManifest);

    if (nestedParseResult.success) {
      return nestedParseResult.data[0].pieces;
    }

    const piecesListParseResult =
      DEAL_MANIFEST_PIECES_LIST_SCHEMA.safeParse(dealManifest);

    if (piecesListParseResult.success) {
      return piecesListParseResult.data;
    }

    return [];
  }
}

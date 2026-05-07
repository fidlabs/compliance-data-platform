import { Cache, CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  PipeTransform,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { uniq } from 'lodash';
import { PrismaService } from 'src/db/prisma.service';
import { ERC20TokenInfoService } from 'src/service/erc20-token-info/erc20-token-info.service';
import { ControllerBase } from '../base/controller-base';
import { PaginationInfoRequest } from '../base/types.controller-base';
import {
  FilecoinPayPayment,
  FilecoinPayRail,
  GetFilecoinPayRailPaymentsResponse,
  GetFilecoinPayRailsResponse,
} from './types.filecoin-pay';

class BigIntTransform implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    try {
      const parsedValue = BigInt(value);
      return parsedValue;
    } catch {
      const message = `'${value}' is not a valid rail id`;
      throw new BadRequestException(message, message);
    }
  }
}

@Controller('filecoin-pay')
export class FilecoinPayController extends ControllerBase {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly tokenInfoService: ERC20TokenInfoService,
  ) {
    super();
  }

  @Get('/rails')
  @ApiOperation({
    summary: 'Get list of FilecoinPay payment rails',
  })
  @ApiOkResponse({
    description: 'List of FilecoinPay payment rails',
    type: GetFilecoinPayRailsResponse,
  })
  @CacheTTL(1000 * 60 * 5) // 5 minutes
  public async getRails(
    @Query() query: PaginationInfoRequest,
  ): Promise<GetFilecoinPayRailsResponse> {
    type Rail = GetFilecoinPayRailsResponse['data'][number];
    type Token = Rail['token'];

    const paginationInfo = this.validatePaginationInfo(query);
    const [rails, totalCount] = await this.prismaService.$transaction([
      this.prismaService.filecoin_pay_rail.findMany({
        ...this.validateQueryPagination(paginationInfo),
        orderBy: {
          createdAtBlock: 'desc',
        },
      }),
      this.prismaService.filecoin_pay_rail.count(),
    ]);

    const uniqueTokens = uniq(rails.map((rail) => rail.token));
    const tokenInfoRequests = uniqueTokens.map((tokenAddress) => {
      return Promise.all([
        tokenAddress,
        this.tokenInfoService.getTokenSymbol(tokenAddress),
        this.tokenInfoService.getTokenDecimals(tokenAddress),
      ]);
    });
    const tokenInfoResponses = await Promise.all(tokenInfoRequests);
    const tokensMap = tokenInfoResponses.reduce((result, tokenInfo) => {
      const [address, symbol, decimals] = tokenInfo;
      return result.set(address, {
        address: address,
        symbol: symbol,
        decimals: decimals,
      });
    }, new Map<string, Token>());

    const data = rails.map<GetFilecoinPayRailsResponse['data'][number]>(
      (rail) => {
        const token = tokensMap.get(rail.token);

        return {
          railId: rail.railId.toString(),
          token: token,
          from: rail.from,
          to: rail.to,
          operator: rail.operator,
          validator: rail.validator,
          paymentRate: rail.paymentRate.toString(),
          lockupFixed: rail.lockupPeriod.toString(),
          lockupPeriod: rail.lockupFixed.toString(),
          settledUpTp: rail.settledUpTo.toString(),
          endEpoch: rail.endEpoch.toString(),
          commisionRateBps: rail.commissionRateBps,
          serviceFeeRecipient: rail.serviceFeeRecipient,
          finalized: rail.finalized,
          createdAtBlock: rail.createdAtBlock.toString(),
        };
      },
    );

    return this.withPaginationInfo(
      {
        data: data,
      },
      query,
      totalCount,
    );
  }

  @Get('/rails/:railId')
  @ApiOperation({
    summary: 'Get FilecoinPay payment rail by ID',
  })
  @ApiOkResponse({
    description: 'FilecoinPay payment rail with given ID',
    type: FilecoinPayRail,
  })
  @ApiBadRequestResponse({
    description: 'Invalid rail id was provided',
  })
  @ApiNotFoundResponse({
    description: 'No matching rail was found',
  })
  @CacheTTL(1000 * 60) // 1 minute
  public async getRailById(
    @Param('railId', BigIntTransform) railId: bigint,
  ): Promise<FilecoinPayRail> {
    const rail = await this.prismaService.filecoin_pay_rail.findFirst({
      where: {
        railId: railId,
      },
    });

    if (!rail) {
      const notFoundMessage = `Rail with ID '${railId.toString()}' not found`;
      throw new NotFoundException(notFoundMessage, notFoundMessage);
    }

    const [symbol, decimals] = await Promise.all([
      this.tokenInfoService.getTokenSymbol(rail.token),
      this.tokenInfoService.getTokenDecimals(rail.token),
    ]);

    return {
      railId: rail.railId.toString(),
      token: {
        address: rail.token,
        symbol: symbol,
        decimals: decimals,
      },
      from: rail.from,
      to: rail.to,
      operator: rail.operator,
      validator: rail.validator,
      paymentRate: rail.paymentRate.toString(),
      lockupFixed: rail.lockupPeriod.toString(),
      lockupPeriod: rail.lockupFixed.toString(),
      settledUpTp: rail.settledUpTo.toString(),
      endEpoch: rail.endEpoch.toString(),
      commisionRateBps: rail.commissionRateBps,
      serviceFeeRecipient: rail.serviceFeeRecipient,
      finalized: rail.finalized,
      createdAtBlock: rail.createdAtBlock.toString(),
    };
  }

  @Get('/rails/:railId/payments')
  @ApiOperation({
    summary: 'Get list of payments registered for given rail',
  })
  @ApiOkResponse({
    description: 'List of payments registered for given rail',
    type: GetFilecoinPayRailPaymentsResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid rail id was provided',
  })
  @ApiNotFoundResponse({
    description: 'No matching rail was found',
  })
  @CacheTTL(1000 * 60 * 5) // 5 minutes
  public async getRailPayments(
    @Param('railId', BigIntTransform) railId: bigint,
    @Query() query: PaginationInfoRequest,
  ): Promise<GetFilecoinPayRailPaymentsResponse> {
    const rail = await this.prismaService.filecoin_pay_rail.findFirst({
      where: {
        railId: railId,
      },
    });

    if (!rail) {
      const notFoundMessage = `Rail with ID '${railId.toString()}' not found`;
      throw new NotFoundException(notFoundMessage, notFoundMessage);
    }

    const paginationInfo = this.validatePaginationInfo(query);
    const [payments, totalCount] = await this.prismaService.$transaction([
      this.prismaService.filecoin_pay_payment.findMany({
        ...this.validateQueryPagination(paginationInfo),
        where: {
          railId: rail.railId,
        },
        orderBy: {
          createdAtBlock: 'desc',
        },
      }),
      this.prismaService.filecoin_pay_rail.count({
        where: {
          railId: rail.railId,
        },
      }),
    ]);

    const [symbol, decimals] = await Promise.all([
      this.tokenInfoService.getTokenSymbol(rail.token),
      this.tokenInfoService.getTokenDecimals(rail.token),
    ]);

    const data = payments.map<FilecoinPayPayment>((payment) => {
      return {
        id: payment.id,
        railId: payment.railId.toString(),
        token: {
          address: rail.token,
          symbol: symbol,
          decimals: decimals,
        },
        totalAmount: payment.totalAmount.toString(),
        netPayeeAmount: payment.netPayeeAmount.toString(),
        operatorCommission: payment.operatorCommission.toString(),
        networkFee: payment.networkFee.toString(),
        oneTime: payment.oneTime,
        createdAtBlock: payment.createdAtBlock.toString(),
      };
    });

    return this.withPaginationInfo(
      {
        data: data,
      },
      query,
      totalCount,
    );
  }
}

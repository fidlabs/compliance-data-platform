import { ApiProperty } from '@nestjs/swagger';
import { PaginationInfoResponse } from '../base/types.controller-base';

class ERC20TokenInfo {
  @ApiProperty({
    description: 'ERC20 token address',
  })
  address: string;

  @ApiProperty({
    description: 'ERC20 token symbol',
  })
  symbol: string;

  @ApiProperty({
    description: 'ERC20 token decimal places',
  })
  decimals: number;
}

export class FilecoinPayRail {
  @ApiProperty({
    description: 'ID of the payment rail',
  })
  railId: string;

  @ApiProperty({
    description: 'Info about token used for payments',
  })
  token: ERC20TokenInfo;

  @ApiProperty({
    description: 'Payer address',
  })
  from: string;

  @ApiProperty({
    description: 'Payee address',
  })
  to: string;

  @ApiProperty({
    description: 'Operator address',
  })
  operator: string;

  @ApiProperty({
    description: 'Validator address',
  })
  validator: string;

  @ApiProperty({
    description: 'Current payment rate per epoch',
  })
  paymentRate: string;

  @ApiProperty({
    description: 'Lockup period in epochs',
  })
  lockupPeriod: string;

  @ApiProperty({
    description: 'Fixed lockup amount',
  })
  lockupFixed: string;

  @ApiProperty({
    description: 'Epoch up to which the rail has been settled',
  })
  settledUpTp: string;

  @ApiProperty({
    description:
      'Epoch at which a terminated rail can no longer be settled, zero value means rail has not been terminated',
  })
  endEpoch: string;

  @ApiProperty({
    description:
      "Operator's commission rate in basis points (0 = 0%, 10000 = 100%)",
  })
  commisionRateBps: number;

  @ApiProperty({
    description: "Address that receives operator's commission",
  })
  serviceFeeRecipient: string;

  @ApiProperty({
    description: 'Whether or not the rail has been finialized',
  })
  finalized: boolean;

  @ApiProperty({
    description: 'Block height at which rail has been created',
  })
  createdAtBlock: string;
}

export class FilecoinPayPayment {
  @ApiProperty({
    description: 'Unique payment ID',
  })
  id: string;

  @ApiProperty({
    description: 'Payment rail id',
  })
  railId: string;

  @ApiProperty({
    description: 'Info about token used for payment',
  })
  token: ERC20TokenInfo;

  @ApiProperty({
    description: 'Total amount paid including fees',
  })
  totalAmount: string;

  @ApiProperty({
    description: 'Net amount credited to payee after fees',
  })
  netPayeeAmount: string;

  @ApiProperty({
    description: 'Commission credited to operator',
  })
  operatorCommission: string;

  @ApiProperty({
    description: 'Network fee',
  })
  networkFee: string;

  @ApiProperty({
    description:
      'Flag telling if payment was one time or due to rail settlement',
  })
  oneTime: boolean;

  @ApiProperty({
    description: 'Block at which payment was registered',
  })
  createdAtBlock: string;
}

export class GetFilecoinPayRailsResponse extends PaginationInfoResponse {
  @ApiProperty({
    description: 'List of FilcoinPay payment rails',
    type: FilecoinPayRail,
    isArray: true,
  })
  data: FilecoinPayRail[];
}

export class GetFilecoinPayRailPaymentsResponse extends PaginationInfoResponse {
  @ApiProperty({
    description: 'List of payments registered for given payment rail',
    type: FilecoinPayPayment,
    isArray: true,
  })
  data: FilecoinPayPayment[];
}

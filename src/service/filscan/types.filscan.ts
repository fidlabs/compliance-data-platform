import { ApiProperty } from '@nestjs/swagger';

export class FilscanAccountInfoByID {
  @ApiProperty()
  account_id: string;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  balance: string;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  available_balance: string;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  init_pledge: string;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  pre_deposits: string;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  locked_balance: string;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  quality_adjust_power: string;

  @ApiProperty()
  quality_power_rank: number;

  @ApiProperty({
    format: 'int64',
    example: '0.42',
  })
  quality_power_percentage: string;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  raw_power: string;

  @ApiProperty()
  total_block_count: number;

  @ApiProperty()
  total_win_count: number;

  @ApiProperty({
    format: 'int64',
    example: '42',
  })
  total_reward: string;

  @ApiProperty()
  sector_size: number;

  @ApiProperty()
  sector_count: number;

  @ApiProperty()
  live_sector_count: number;

  @ApiProperty()
  fault_sector_count: number;

  @ApiProperty()
  recover_sector_count: number;

  @ApiProperty()
  active_sector_count: number;

  @ApiProperty()
  terminate_sector_count: number;
}

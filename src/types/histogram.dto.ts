import { ApiProperty } from '@nestjs/swagger';

export class HistogramDto {
  @ApiProperty({ nullable: true })
  valueFromExclusive: number | null;

  @ApiProperty({ nullable: true })
  valueToInclusive: number | null;

  @ApiProperty({ nullable: true })
  count: number | null;

  constructor(
    valueFromExclusive: number | null,
    valueToInclusive: number | null,
    count: number | null,
  ) {
    this.valueFromExclusive = valueFromExclusive;
    this.valueToInclusive = valueToInclusive;
    this.count = count;
  }
}

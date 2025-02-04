import { ApiProperty } from '@nestjs/swagger';

export class GoogleApisSpreadsheetValues {
  @ApiProperty({
    description: 'Range of the returned data',
    example: 'GRAPHS!A1:X1021',
  })
  range: string;

  @ApiProperty({
    description: 'Primary dimension that the data are grouped by',
    example: 'ROWS',
  })
  majorDimension: string;

  @ApiProperty({
    description: 'Values per majorDimension',
    type: [String],
    isArray: true,
    example: [
      ['value11', 'value12'],
      ['value21', 'value22', 'value23'],
    ],
  })
  values: string[][];
}

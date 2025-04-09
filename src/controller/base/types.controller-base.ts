import { ApiProperty, IntersectionType } from '@nestjs/swagger';

export class PaginationInfo {
  @ApiProperty({
    description: 'Number of items per page; default is no pagination',
    required: false,
    minimum: 1,
  })
  limit?: number;

  @ApiProperty({
    description: 'Page number, starts from 1; default is no pagination',
    required: false,
    minimum: 1,
  })
  page?: number;
}

export class SortingInfo {
  @ApiProperty({
    description: 'Sorting field; default is no sorting',
    required: false,
  })
  sort?: string;

  @ApiProperty({
    description: 'Sorting order; default is ascending',
    required: false,
    enum: ['asc', 'desc'],
  })
  order?: 'asc' | 'desc';
}

export class PaginationSortingInfo extends IntersectionType(
  PaginationInfo,
  SortingInfo,
) {}

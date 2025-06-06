import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';

export class PaginationInfo {
  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
    minimum: 1,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
    minimum: 1,
  })
  page?: number;
}

export class SortingInfo {
  @ApiPropertyOptional({
    description: 'Sorting field; default is no sorting',
  })
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sorting order; default is ascending',
    enum: ['asc', 'desc'],
  })
  order?: 'asc' | 'desc';
}

export class PaginationSortingInfo extends IntersectionType(
  PaginationInfo,
  SortingInfo,
) {}

import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';

export class PaginationInfoRequest {
  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
    minimum: 1,
    type: Number,
  })
  limit?: string;

  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
    minimum: 1,
    type: Number,
  })
  page?: string;
}

export class PaginationInfo {
  limit?: number;
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
  PaginationInfoRequest,
  SortingInfo,
) {}

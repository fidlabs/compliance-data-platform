import { BadRequestException } from '@nestjs/common';
import { PaginationInfo, SortingInfo } from './types.controller-base';

export class ControllerBase {
  public withPaginationInfo(data: any, paginationInfo?: PaginationInfo): any {
    if (!paginationInfo) return data;

    return {
      pagination: {
        limit: paginationInfo.limit,
        page: paginationInfo.page,
      },
      ...data,
    };
  }

  public paginated(values: any[], paginationInfo?: PaginationInfo): any[] {
    paginationInfo = this.validatePaginationInfo(paginationInfo);
    if (!paginationInfo) return values;

    const startIndex = paginationInfo.limit * (paginationInfo.page - 1);
    if (startIndex >= values.length) return [];
    const endIndex = Math.min(values.length, startIndex + paginationInfo.limit);

    return values.slice(startIndex, endIndex);
  }

  public sorted(values: any[], sortingInfo?: SortingInfo): any[] {
    if (!sortingInfo?.sort) return values;
    sortingInfo.order ??= 'asc';

    return values.sort((_a, _b) => {
      let a = _a[sortingInfo.sort];
      let b = _b[sortingInfo.sort];

      // try to cast string to number if applicable
      if (parseFloat(a).toString() === a && parseFloat(b).toString() === b) {
        a = parseFloat(a);
        b = parseFloat(b);
      }

      if (a < b) return sortingInfo.order === 'asc' ? -1 : 1;
      if (a > b) return sortingInfo.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private validatePaginationInfo(
    paginationInfo?: PaginationInfo,
  ): PaginationInfo {
    if (!paginationInfo) return null;
    const limit = Number(paginationInfo.limit?.toString());
    const page = Number(paginationInfo.page?.toString());

    if (paginationInfo.limit && (Number.isNaN(limit) || limit <= 0))
      throw new BadRequestException(
        undefined,
        'Invalid pagination value: limit must be Integer > 0',
      );

    if (paginationInfo.page && (Number.isNaN(page) || page <= 0))
      throw new BadRequestException(
        undefined,
        'Invalid pagination value: page must be Integer > 0',
      );

    if (Number.isNaN(limit) !== Number.isNaN(page))
      throw new BadRequestException(
        undefined,
        'Invalid pagination value: page and limit must both be set',
      );

    return Number.isNaN(limit) || Number.isNaN(page) ? null : { limit, page };
  }
}

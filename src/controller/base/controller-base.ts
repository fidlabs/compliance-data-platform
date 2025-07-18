import { BadRequestException } from '@nestjs/common';
import { Prisma } from 'prismaDmob/generated/client';
import { PaginationInfo, SortingInfo } from './types.controller-base';

export class ControllerBase {
  public withPaginationInfo<T>(
    data: T,
    paginationInfo?: PaginationInfo,
    total?: number, // length of the data before pagination
  ): {
    pagination?: {
      limit: number;
      page: number;
      pages?: number;
      total?: number;
    };
  } & T {
    paginationInfo = this.validatePaginationInfo(paginationInfo);
    if (!paginationInfo) return data;

    return {
      pagination: {
        limit: paginationInfo.limit,
        page: paginationInfo.page,
        pages:
          total === undefined
            ? undefined
            : Math.ceil(total / paginationInfo.limit),
        total,
      },
      ...data,
    };
  }

  public paginated<T>(values: T[], paginationInfo?: PaginationInfo): T[] {
    paginationInfo = this.validatePaginationInfo(paginationInfo);
    if (!paginationInfo) return values;

    const startIndex = paginationInfo.limit * (paginationInfo.page - 1);
    if (startIndex >= values.length) return [];
    const endIndex = Math.min(values.length, startIndex + paginationInfo.limit);

    return values.slice(startIndex, endIndex);
  }

  public sorted<T>(values: T[], sortingInfo?: SortingInfo): T[] {
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

      if (a instanceof Prisma.Decimal) {
        if (a.lessThan(b)) return sortingInfo.order === 'asc' ? -1 : 1;
        if (a.greaterThan(b)) return sortingInfo.order === 'asc' ? 1 : -1;
      } else {
        if (a < b) return sortingInfo.order === 'asc' ? -1 : 1;
        if (a > b) return sortingInfo.order === 'asc' ? 1 : -1;
      }
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

import { BadRequestException } from '@nestjs/common';
import { Prisma } from 'prismaDmob/generated/client';
import {
  PaginationInfo,
  PaginationInfoRequest,
  PaginationInfoResponse,
  SortingInfoRequest,
} from './types.controller-base';
import { DatabasePaginationQuery } from 'src/utils/utils';

export class ControllerBase {
  public withPaginationInfo<T>(
    data: T,
    _paginationInfo?: PaginationInfoRequest,
    total?: number, // length of the data before pagination
  ): PaginationInfoResponse & T {
    const paginationInfo = this.validatePaginationInfo(_paginationInfo);

    return {
      pagination: {
        limit: paginationInfo?.limit ?? undefined,
        page: paginationInfo?.page ?? undefined,
        pages:
          total === undefined || total === null || !paginationInfo?.limit
            ? undefined
            : Math.ceil(total / paginationInfo.limit),
        total: total ?? undefined,
      },
      ...data,
    };
  }

  public paginated<T>(
    values: T[],
    _paginationInfo?: PaginationInfoRequest,
  ): T[] {
    const paginationInfo = this.validatePaginationInfo(_paginationInfo);
    if (!paginationInfo) return values;

    const startIndex = paginationInfo.limit * (paginationInfo.page - 1);
    if (startIndex >= values.length) return [];
    const endIndex = Math.min(values.length, startIndex + paginationInfo.limit);

    return values.slice(startIndex, endIndex);
  }

  public sorted<T>(values: T[], sortingInfo?: SortingInfoRequest): T[] {
    sortingInfo = this.validateSortingInfo(values, sortingInfo);
    if (!sortingInfo?.sort || !values) return values;

    const isValidStringBigInt = (value: string): boolean => {
      try {
        return BigInt(value).toString() === value;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        return false;
      }
    };

    const sortAsc = (a: any, b: any): -1 | 0 | 1 => {
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;

      if (typeof a === 'string' && typeof b === 'string') {
        if (isValidStringBigInt(a) && isValidStringBigInt(b)) {
          // try to cast string to bigint if applicable
          a = BigInt(a);
          b = BigInt(b);
        } else {
          // compare string case insensitively
          a = a.toLowerCase();
          b = b.toLowerCase();
        }
      }

      if (a instanceof Prisma.Decimal) {
        if (a.lessThan(b)) return -1;
        if (a.greaterThan(b)) return 1;
      } else {
        if (a < b) return -1;
        if (a > b) return 1;
      }

      return 0;
    };

    return values.sort((_a: T, _b: T): -1 | 0 | 1 => {
      const a = _a[sortingInfo.sort];
      const b = _b[sortingInfo.sort];

      return sortingInfo!.order === 'asc' ? sortAsc(a, b) : sortAsc(b, a);
    });
  }

  private validateSortingInfo<T>(
    values: T[],
    sortingInfo?: SortingInfoRequest,
  ): SortingInfoRequest | null {
    if (!sortingInfo) return null;

    if (sortingInfo.order && !sortingInfo.sort)
      throw new BadRequestException(
        'Invalid sorting value: sort must be set if order is set',
      );

    if (sortingInfo.order && !['asc', 'desc'].includes(sortingInfo.order))
      throw new BadRequestException(
        'Invalid sorting value: order must be "asc" or "desc"',
      );

    if (
      sortingInfo.sort &&
      values.length > 0 &&
      values[0][sortingInfo.sort] === undefined
    )
      throw new BadRequestException(
        `Invalid sorting value: sort '${sortingInfo.sort}' does not exist in the data`,
      );

    return {
      sort: sortingInfo.sort,
      order: sortingInfo.order ?? 'asc',
    };
  }

  protected validateQueryPagination = (
    paginationInfo?: PaginationInfo,
  ): DatabasePaginationQuery => {
    const take =
      paginationInfo?.limit && paginationInfo.limit > 0
        ? paginationInfo.limit
        : undefined;
    if (!take) return { take: undefined, skip: undefined };

    const page =
      paginationInfo?.page && paginationInfo.page > 0 ? paginationInfo.page : 1;
    return { take: take, skip: (page - 1) * take };
  };

  protected validatePaginationInfo(
    paginationInfo?: PaginationInfoRequest,
  ): PaginationInfo | null {
    if (!paginationInfo) return null;
    // eslint-disable-next-line no-restricted-syntax
    const limit = Number(paginationInfo.limit);

    // eslint-disable-next-line no-restricted-syntax
    const page = Number(paginationInfo.page);

    if (paginationInfo.limit && (Number.isNaN(limit) || limit <= 0))
      throw new BadRequestException(
        'Invalid pagination value: limit must be Integer > 0',
      );

    if (paginationInfo.page && (Number.isNaN(page) || page <= 0))
      throw new BadRequestException(
        'Invalid pagination value: page must be Integer > 0',
      );

    if (Number.isNaN(limit) !== Number.isNaN(page))
      throw new BadRequestException(
        'Invalid pagination value: page and limit must both be set',
      );

    return Number.isNaN(limit) || Number.isNaN(page)
      ? null
      : { limit: limit, page: page };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { groupBy } from 'lodash';
import {
  HistogramTotalDatacap,
  HistogramWeekFlat,
  HistogramWeekResults,
} from './types.histogram-helper';

@Injectable()
export class HistogramHelperService {
  private readonly logger = new Logger(HistogramHelperService.name);

  // converts flat database results to buckets grouped by week
  public async getWeeklyHistogramResult(
    histogramWeeksFlat: HistogramWeekFlat[],
    maxRangeTopValue?: number,
    minRangeLowValue: number = 0,
    includeCurrentWeek = false,
  ): Promise<HistogramWeekResults[]> {
    const histogramsByWeek = groupBy(histogramWeeksFlat, (p) => p.week);
    const results: HistogramWeekResults[] = [];

    for (const week in histogramsByWeek) {
      const weekResults = histogramsByWeek[week].map((r) => {
        return new HistogramTotalDatacap(
          r.valueFromExclusive,
          r.valueToInclusive,
          r.count,
          r.totalDatacap,
        );
      });

      results.push(
        new HistogramWeekResults(
          new Date(week),
          weekResults.reduce(
            (partialSum, response) => partialSum + response.count,
            0,
          ),
          weekResults,
        ),
      );
    }

    const sortedResult = this.sorted(
      this.withMissingBuckets(results, maxRangeTopValue, minRangeLowValue),
    );

    return includeCurrentWeek
      ? sortedResult
      : this.withoutCurrentWeek(sortedResult);
  }

  // removes current week from histogram responses if necessary
  // as there is no full data for current week yet
  public withoutCurrentWeek<T extends { week: Date }>(
    histogramWeeksSorted: T[],
  ): T[] {
    if (histogramWeeksSorted.length === 0) return histogramWeeksSorted;

    const lastHistogramWeek =
      histogramWeeksSorted[histogramWeeksSorted.length - 1].week;

    const lastHistogramWeekStartPlusSevenDays = new Date(
      lastHistogramWeek.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    if (new Date() < lastHistogramWeekStartPlusSevenDays)
      histogramWeeksSorted.pop();

    return histogramWeeksSorted;
  }

  public sorted<T extends { week: Date }>(histogramWeeks: T[]): T[] {
    return histogramWeeks.sort((a, b) => a.week.getTime() - b.week.getTime());
  }

  // calculate missing, empty histogram buckets
  private withMissingBuckets(
    histogramWeeks: HistogramWeekResults[],
    maxRangeTopValue?: number,
    minRangeLowValue: number = 0,
  ): HistogramWeekResults[] {
    const maxMinSpan = this.getMaxMinSpan(histogramWeeks);
    const allBucketsTopValues = this.getAllBucketsTopValues(
      histogramWeeks,
      maxMinSpan,
      maxRangeTopValue,
      minRangeLowValue,
    );

    for (const histogramWeek of histogramWeeks) {
      const missingBuckets = allBucketsTopValues.filter(
        (topValue) =>
          !histogramWeek.results.some((p) => p.valueToInclusive === topValue),
      );

      if (missingBuckets.length > 0) {
        histogramWeek.results.push(
          ...missingBuckets.map(
            (v) => new HistogramTotalDatacap(v - maxMinSpan, v, 0, 0n),
          ),
        );

        histogramWeek.results.sort(
          (a, b) => a.valueToInclusive - b.valueToInclusive,
        );
      }
    }

    return histogramWeeks;
  }

  private getMaxMinSpan(histogramWeeks: HistogramWeekResults[]): number {
    if (histogramWeeks.length === 0) return 0;

    const maxRangeTopValue = Math.max(
      ...histogramWeeks.flatMap((p) =>
        p.results.map((r) => r.valueToInclusive),
      ),
    );

    const maxHistogramEntry = histogramWeeks
      .flatMap((p) => p.results)
      .find((p) => p.valueToInclusive === maxRangeTopValue);

    return (
      maxHistogramEntry.valueToInclusive - maxHistogramEntry.valueFromExclusive
    );
  }

  private getAllBucketsTopValues(
    histogramWeeks: HistogramWeekResults[],
    maxMinSpan: number,
    maxRangeTopValue?: number,
    minRangeLowValue: number | undefined = 0,
  ): number[] {
    if (histogramWeeks.length === 0) return [];

    maxRangeTopValue ??= Math.max(
      ...histogramWeeks.flatMap((p) =>
        p.results.map((r) => r.valueToInclusive),
      ),
    );

    minRangeLowValue ??= Math.min(
      ...histogramWeeks.flatMap((p) =>
        p.results.map((r) => r.valueFromExclusive),
      ),
    );

    const allBucketTopValues: number[] = [];
    for (let i = maxRangeTopValue; i > minRangeLowValue; i -= maxMinSpan) {
      allBucketTopValues.push(i);
    }

    return allBucketTopValues;
  }
}

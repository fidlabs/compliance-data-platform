import { Injectable, Logger } from '@nestjs/common';
import { groupBy } from 'lodash';
import {
  Histogram,
  HistogramWeek,
  HistogramWeekFlat,
} from './types.histogram-helper';

@Injectable()
export class HistogramHelperService {
  private readonly logger = new Logger(HistogramHelperService.name);

  public async getWeeklyHistogramResult(
    results: HistogramWeekFlat[],
    maxRangeTopValue?: number,
    minRangeLowValue: number = 0,
  ): Promise<HistogramWeek[]> {
    const resultsByWeek = groupBy(results, (p) => p.week);
    const histogramWeeks: HistogramWeek[] = [];

    for (const key in resultsByWeek) {
      const weekResponses = resultsByWeek[key].map((r) => {
        return new Histogram(
          r.valueFromExclusive,
          r.valueToInclusive,
          r.count,
          r.totalDatacap,
        );
      });

      histogramWeeks.push(
        new HistogramWeek(
          new Date(key),
          weekResponses.reduce(
            (partialSum, response) => partialSum + response.count,
            0,
          ),
          weekResponses,
        ),
      );
    }

    return this.withoutCurrentWeek(
      this.sorted(
        this.withMissingBuckets(
          histogramWeeks,
          maxRangeTopValue,
          minRangeLowValue,
        ),
      ),
    );
  }

  // removes current week from histogram responses (as there is no full data for current week)
  public withoutCurrentWeek<T extends { week: Date }>(
    histogramWeeksSorted: T[],
  ): T[] {
    if (histogramWeeksSorted.length === 0) return histogramWeeksSorted;

    const lastHistogramWeek =
      histogramWeeksSorted[histogramWeeksSorted.length - 1].week;

    const lastHistogramWeekEndTime = new Date(
      lastHistogramWeek.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    if (new Date() < lastHistogramWeekEndTime) histogramWeeksSorted.pop();
    return histogramWeeksSorted;
  }

  public sorted<T extends { week: Date }>(histogramWeeks: T[]): T[] {
    return histogramWeeks.sort((a, b) => a.week.getTime() - b.week.getTime());
  }

  // calculate missing, empty histogram buckets
  private withMissingBuckets(
    _histogramWeeks: HistogramWeek[],
    maxRangeTopValue?: number,
    minRangeLowValue: number = 0,
  ): HistogramWeek[] {
    const histogramWeeks = _histogramWeeks;
    const maxMinSpan = this.getMaxMinSpan(histogramWeeks);
    const allBucketTopValues = this.getAllHistogramBucketTopValues(
      histogramWeeks,
      maxMinSpan,
      maxRangeTopValue,
      minRangeLowValue,
    );

    for (const histogramWeek of histogramWeeks) {
      const missingValues = allBucketTopValues.filter(
        (topValue) =>
          !histogramWeek.results.some((p) => p.valueToInclusive === topValue),
      );

      if (missingValues.length > 0) {
        histogramWeek.results.push(
          ...missingValues.map((v) => new Histogram(v - maxMinSpan, v, 0, 0)),
        );

        histogramWeek.results.sort(
          (a, b) => a.valueToInclusive - b.valueToInclusive,
        );
      }
    }

    return histogramWeeks;
  }

  private getMaxMinSpan(histogramWeeks: HistogramWeek[]): number {
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

  private getAllHistogramBucketTopValues(
    histogramWeeks: HistogramWeek[],
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

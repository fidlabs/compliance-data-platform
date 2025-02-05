import { Injectable, Logger } from '@nestjs/common';
import { groupBy } from 'lodash';
import {
  Histogram,
  HistogramWeek,
  HistogramWeekResponse,
} from './types.histogram-helper';

@Injectable()
export class HistogramHelperService {
  private readonly logger = new Logger(HistogramHelperService.name);

  async getWeeklyHistogramResult(
    results: {
      valueFromExclusive: number | null;
      valueToInclusive: number | null;
      count: number | null;
      week: Date;
    }[],
    totalCount: number,
  ): Promise<HistogramWeekResponse> {
    const resultsByWeek = groupBy(results, (p) => p.week);
    const histogramWeekDtos: HistogramWeek[] = [];

    for (const key in resultsByWeek) {
      const value = resultsByWeek[key];
      const weekResponses = value.map((r) => {
        return new Histogram(r.valueFromExclusive, r.valueToInclusive, r.count);
      });

      histogramWeekDtos.push(
        new HistogramWeek(
          new Date(key),
          weekResponses,
          weekResponses.reduce(
            (partialSum, response) => partialSum + response.count,
            0,
          ),
        ),
      );
    }

    // calculate missing histogram buckets
    const { maxMinSpan, allBucketTopValues } =
      this.getAllHistogramBucketTopValues(histogramWeekDtos);

    for (const histogramWeekDto of histogramWeekDtos) {
      const missingValues = allBucketTopValues.filter(
        (topValue) =>
          !histogramWeekDto.results.some(
            (p) => p.valueToInclusive === topValue,
          ),
      );

      if (missingValues.length > 0) {
        histogramWeekDto.results.push(
          ...missingValues.map((v) => new Histogram(v - maxMinSpan, v, 0)),
        );

        histogramWeekDto.results.sort(
          (a, b) => a.valueToInclusive - b.valueToInclusive,
        );
      }
    }

    const histogramWeekDtosSorted = this.removeCurrentWeekFromHistogramWeekDtos(
      histogramWeekDtos.sort((a, b) => a.week.getTime() - b.week.getTime()),
    );

    return new HistogramWeekResponse(totalCount, histogramWeekDtosSorted);
  }

  // removes current week from histogram responses (as there is no full data for current week)
  private removeCurrentWeekFromHistogramWeekDtos(
    histogramWeekDtosSorted: HistogramWeek[],
  ) {
    if (histogramWeekDtosSorted.length === 0) return histogramWeekDtosSorted;

    const lastHistogramWeekDtoWeek =
      histogramWeekDtosSorted[histogramWeekDtosSorted.length - 1].week;

    const lastHistogramWeekDtoWeekEnd = new Date(
      lastHistogramWeekDtoWeek.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    if (new Date() < lastHistogramWeekDtoWeekEnd) histogramWeekDtosSorted.pop();
    return histogramWeekDtosSorted;
  }

  private getAllHistogramBucketTopValues(histogramWeekDtos: HistogramWeek[]) {
    if (histogramWeekDtos.length === 0)
      return { maxMinSpan: 0, allBucketTopValues: [] };

    const maxRangeTopValue = Math.max(
      ...histogramWeekDtos.flatMap((p) =>
        p.results.map((r) => r.valueToInclusive),
      ),
    );

    const maxHistogramEntry = histogramWeekDtos
      .flatMap((p) => p.results)
      .find((p) => p.valueToInclusive === maxRangeTopValue);

    const maxMinSpan =
      maxHistogramEntry.valueToInclusive - maxHistogramEntry.valueFromExclusive;

    const allBucketTopValues: number[] = [];
    for (let i = maxRangeTopValue; i > 0; i -= maxMinSpan) {
      allBucketTopValues.push(i);
    }
    return { maxMinSpan, allBucketTopValues };
  }
}

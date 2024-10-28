import { Injectable } from '@nestjs/common';
import { groupBy } from 'lodash';
import { HistogramWeekDto } from '../types/histogramWeek.dto';
import { HistogramDto } from '../types/histogram.dto';
import { HistogramWeekResponseDto } from '../types/histogramWeek.response.dto';

@Injectable()
export class HistogramHelper {
  async getWeeklyHistogramResult(
    results: {
      valueFromExclusive: number | null;
      valueToInclusive: number | null;
      count: number | null;
      week: Date;
    }[],
    totalCount: number,
  ): Promise<HistogramWeekResponseDto> {
    const resultsByWeek = groupBy(results, (p) => p.week);

    const histogramWeekDtos: HistogramWeekDto[] = [];
    for (const key in resultsByWeek) {
      const value = resultsByWeek[key];
      const weekResponses = value.map((r) => {
        return new HistogramDto(
          r.valueFromExclusive,
          r.valueToInclusive,
          r.count,
        );
      });
      histogramWeekDtos.push(
        new HistogramWeekDto(
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
          ...missingValues.map((v) => new HistogramDto(v - maxMinSpan, v, 0)),
        );

        histogramWeekDto.results.sort(
          (a, b) => a.valueToInclusive - b.valueToInclusive,
        );
      }
    }

    return new HistogramWeekResponseDto(
      totalCount,
      histogramWeekDtos.sort((a, b) => a.week.getTime() - b.week.getTime()),
    );
  }

  private getAllHistogramBucketTopValues(
    histogramWeekDtos: HistogramWeekDto[],
  ) {
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

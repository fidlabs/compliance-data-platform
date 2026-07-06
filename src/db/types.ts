export type PostgresIntervalUnit =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond';

export type PostgresInterval = Partial<
  Record<`${PostgresIntervalUnit}s`, number>
>;

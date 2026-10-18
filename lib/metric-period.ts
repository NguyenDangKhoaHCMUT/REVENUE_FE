import type { DailyMetricData, UpsertDailyMetricPayload } from '@/types/metrics';

export type MetricPeriod = 'current' | 'previous';
export type PeriodMetricPayload = UpsertDailyMetricPayload & { date: string };

/** Send exactly the selected period, including blank days to clear saved data. */
export function buildPeriodMetrics(
  data: DailyMetricData[],
  period: MetricPeriod,
  previousDates: string[],
): PeriodMetricPayload[] {
  return data.map((row, index) => {
    const isCurrent = period === 'current';
    const date = isCurrent ? row.dateStr : previousDates[index];
    if (!date) throw new Error('Missing metric date. Please reload the page.');
    const blank = (isCurrent ? row.blankCurrent : row.blankPrevious) ?? [];
    const hasData = isCurrent ? row.hasCurrentData : row.hasPreviousData;
    const cell = (field: keyof UpsertDailyMetricPayload, value: number, round = false) =>
      !hasData || blank.includes(field) ? null : Math.max(round ? Math.round(value) : value, 0) || 0;

    return {
      date,
      posRevenue: cell('posRevenue', isCurrent ? row.posRevenue : row.previousDirectRevenue),
      eatclubRevenue: cell('eatclubRevenue', isCurrent
        ? row.eatclubRevenue
        : row.previousTotalRevenue - row.previousDirectRevenue),
      labourCost: cell('labourCost', isCurrent ? row.labourCost : row.previousLabourCost),
      covers: cell('covers', isCurrent ? row.covers : row.previousCovers, true),
    };
  });
}

/** Merge only acknowledged cells; preserve the other period and event state. */
export function mergePeriodMetrics(
  metrics: DailyMetricData[],
  saved: PeriodMetricPayload[],
  period: MetricPeriod,
  previousDates: string[],
): DailyMetricData[] {
  return metrics.map((row, index) => {
    const date = period === 'current' ? row.dateStr : previousDates[index];
    const match = saved.find((item) => item.date === date);
    if (!match) return row;
    const fields: (keyof UpsertDailyMetricPayload)[] = ['posRevenue', 'eatclubRevenue', 'labourCost', 'covers'];
    const blanks = fields.filter((field) => match[field] === null);
    const hasData = blanks.length < fields.length;
    return period === 'current'
      ? { ...row, posRevenue: match.posRevenue ?? 0, eatclubRevenue: match.eatclubRevenue ?? 0,
          labourCost: match.labourCost ?? 0, covers: match.covers ?? 0,
          hasCurrentData: hasData, blankCurrent: blanks }
      : { ...row, previousDirectRevenue: match.posRevenue ?? 0,
          previousTotalRevenue: (match.posRevenue ?? 0) + (match.eatclubRevenue ?? 0),
          previousLabourCost: match.labourCost ?? 0, previousCovers: match.covers ?? 0,
          hasPreviousData: hasData, blankPrevious: blanks };
  });
}

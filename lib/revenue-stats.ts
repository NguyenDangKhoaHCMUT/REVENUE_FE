import type { DailyMetricData } from '@/types/metrics';

type RevenueMetric = Pick<DailyMetricData,
  'posRevenue' | 'eatclubRevenue' | 'covers' |
  'previousDirectRevenue' | 'previousTotalRevenue' | 'previousCovers'>;

interface RevenueFilters {
  showPos: boolean;
  showEatclub: boolean;
}

/** Weekly statistics with identical revenue filters applied to both periods. */
export function calculateRevenueStats(
  metrics: readonly RevenueMetric[],
  { showPos, showEatclub }: RevenueFilters,
) {
  // Money is stored with two decimal places. Sum cents to avoid accumulation
  // and subtraction artifacts when reconstructing previous Eatclub revenue.
  const selectedRevenueInCents = (pos: number, eatclub: number) =>
    (showPos ? Math.round(pos * 100) : 0) +
    (showEatclub ? Math.round(eatclub * 100) : 0);

  let currentCents = 0;
  let previousCents = 0;
  let totalCovers = 0;
  let prevTotalCovers = 0;

  for (const day of metrics) {
    const previousEatclub = Math.round(
      (day.previousTotalRevenue - day.previousDirectRevenue) * 100,
    ) / 100;
    currentCents += selectedRevenueInCents(day.posRevenue, day.eatclubRevenue);
    previousCents += selectedRevenueInCents(day.previousDirectRevenue, previousEatclub);
    totalCovers += day.covers;
    prevTotalCovers += day.previousCovers;
  }

  const totalRevenue = currentCents / 100;
  const prevTotalRevenue = previousCents / 100;
  // Preserve the dashboard's seven-day average and zero-baseline convention.
  const avgPerDay = Math.round(totalRevenue / 7);
  const prevAvgPerDay = Math.round(prevTotalRevenue / 7);
  const differencePercent = (current: number, previous: number) =>
    (previous ? ((current - previous) / previous) * 100 : 0).toFixed(1);

  return {
    totalRevenue,
    avgPerDay,
    totalCovers,
    prevTotalRevenue,
    prevAvgPerDay,
    prevTotalCovers,
    revDiffPct: differencePercent(totalRevenue, prevTotalRevenue),
    avgDiffPct: differencePercent(avgPerDay, prevAvgPerDay),
    coversDiffPct: differencePercent(totalCovers, prevTotalCovers),
  };
}

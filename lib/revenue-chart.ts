import type { DailyMetricData } from '@/types/metrics';

type ChartMetric = Pick<DailyMetricData,
  'posRevenue' | 'eatclubRevenue' | 'labourCost' |
  'previousDirectRevenue' | 'previousTotalRevenue' | 'previousLabourCost'>;

interface ChartFilters {
  isCompareMode: boolean;
  showPos: boolean;
  showEatclub: boolean;
  showLabour: boolean;
}

export const REVENUE_CHART_HEIGHT = 300;
const BADGE_GAP = 10;
// Fits the 28px badge, hover enlargement, gap and top padding inside the plot.
const TOP_SPACE = 48;
const TICK_INTERVALS = 4;
const tickNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

function formatTick(value: number): string {
  for (const [unit, suffix] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'k']] as const) {
    if (value >= unit) return `${tickNumber.format(value / unit)}${suffix}`;
  }
  return tickNumber.format(value);
}

function niceStep(minimum: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(minimum));
  const normalized = minimum / magnitude;
  const multiplier = [1, 1.25, 1.5, 2, 2.5, 5, 10].find((step) => step >= normalized)!;
  return multiplier * magnitude;
}

/** One shared scale based only on visible stacked totals and labour bars. */
export function calculateRevenueChartLayout(
  metrics: readonly ChartMetric[],
  { isCompareMode, showPos, showEatclub, showLabour }: ChartFilters,
) {
  const amount = (value: number) => Number.isFinite(value) && value > 0
    ? Math.round(value * 100) / 100 : 0;
  const values = metrics.map((day) => ({
    pos: showPos ? amount(day.posRevenue) : 0,
    eatclub: showEatclub ? amount(day.eatclubRevenue) : 0,
    labour: showLabour ? amount(day.labourCost) : 0,
    prevPos: isCompareMode && showPos ? amount(day.previousDirectRevenue) : 0,
    prevEatclub: isCompareMode && showEatclub
      ? amount(day.previousTotalRevenue - day.previousDirectRevenue) : 0,
    prevLabour: isCompareMode && showLabour ? amount(day.previousLabourCost) : 0,
  }));
  const highestBar = values.reduce((highest, day) => Math.max(highest,
    day.pos + day.eatclub, day.labour, day.prevPos + day.prevEatclub, day.prevLabour,
  ), 0);
  const requiredMax = highestBar / (1 - TOP_SPACE / REVENUE_CHART_HEIGHT);
  const step = highestBar > 0 ? niceStep(requiredMax / TICK_INTERVALS) : 250;
  const maxScale = step * TICK_INTERVALS;
  const percent = (value: number) => (value / maxScale) * 100;

  return {
    maxScale,
    yAxisTicks: Array.from({ length: TICK_INTERVALS + 1 }, (_, index) => ({
      value: step * index,
      label: formatTick(step * index),
      pct: (index / TICK_INTERVALS) * 100,
    })),
    columns: values.map((day) => ({
      posPct: percent(day.pos),
      eatclubPct: percent(day.eatclub),
      labourPct: percent(day.labour),
      prevDirectPct: percent(day.prevPos),
      prevEatclubPct: percent(day.prevEatclub),
      prevLabourPct: percent(day.prevLabour),
      badgeBottomPct: percent(Math.max(day.pos + day.eatclub, day.labour,
        day.prevPos + day.prevEatclub, day.prevLabour)) + (BADGE_GAP / REVENUE_CHART_HEIGHT) * 100,
    })),
  };
}

import type { DailyMetricData, MetricPayloadField } from '@/types/metrics';

const SERIES = [
  { field: 'posRevenue', label: 'POS Revenue' },
  { field: 'eatclubRevenue', label: 'Eatclub Revenue' },
  { field: 'labourCost', label: 'Labour Costs' },
] as const;

export interface RevenueTooltipFilters {
  showPos: boolean;
  showEatclub: boolean;
  showLabour: boolean;
}

export function getRevenueTooltipRows(
  day: DailyMetricData,
  previous = false,
  filters: RevenueTooltipFilters = { showPos: true, showEatclub: true, showLabour: true },
) {
  // Previous total is POS + Eatclub in DataContext. The DB stores money with
  // scale 2; round the subtraction to avoid floating-point display artifacts.
  const values = previous
    ? [day.previousDirectRevenue,
        Math.round((day.previousTotalRevenue - day.previousDirectRevenue) * 100) / 100,
        day.previousLabourCost]
    : [day.posRevenue, day.eatclubRevenue, day.labourCost];
  const hasData = previous ? day.hasPreviousData : day.hasCurrentData;
  const blanks: MetricPayloadField[] = (previous ? day.blankPrevious : day.blankCurrent) ?? [];
  const visible = {
    posRevenue: filters.showPos,
    eatclubRevenue: filters.showEatclub,
    labourCost: filters.showLabour,
  };
  return SERIES.map(({ field, label }, index) => ({
    field,
    label,
    value: hasData === true && !blanks.includes(field) && Number.isFinite(values[index])
      ? values[index] : null,
  })).filter(({ field }) => visible[field]);
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export function formatTooltipRevenue(value: number | null): string {
  return value === null ? '—' : money.format(value);
}

/** Anchor above the day's baseline, then keep the whole popup in the viewport. */
export function positionRevenueTooltip(
  anchor: { left: number; right: number; bottom: number },
  popup: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const margin = 8;
  return {
    left: Math.max(margin, Math.min(
      (anchor.left + anchor.right - popup.width) / 2,
      viewport.width - popup.width - margin,
    )),
    top: Math.max(margin, Math.min(
      anchor.bottom - popup.height - 12,
      viewport.height - popup.height - margin,
    )),
  };
}

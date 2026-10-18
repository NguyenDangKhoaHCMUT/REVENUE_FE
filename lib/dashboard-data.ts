import type { DailyMetricData, MetricPayloadField } from '@/types/metrics';
import type { DashboardResponse } from '@/types/dashboard';

const FIELDS: MetricPayloadField[] = ['posRevenue', 'eatclubRevenue', 'labourCost', 'covers'];

export function mergeDashboardData(
  base: DailyMetricData[], previousDates: string[], response: DashboardResponse,
): DailyMetricData[] {
  const blanks = (metric?: DashboardResponse['metrics'][number]) =>
    metric ? FIELDS.filter((field) => metric[field] === null || metric[field] === undefined) : [];

  return base.map((day, index) => {
    const current = response.metrics.find((item) => item.date === day.dateStr);
    const previous = response.metrics.find((item) => item.date === previousDates[index]);
    const event = response.events.find((item) => item.date === day.dateStr);
    const previousPos = Number(previous?.posRevenue ?? 0);
    const previousEatclub = Number(previous?.eatclubRevenue ?? 0);
    return {
      ...day,
      posRevenue: Number(current?.posRevenue ?? 0),
      eatclubRevenue: Number(current?.eatclubRevenue ?? 0),
      labourCost: Number(current?.labourCost ?? 0),
      covers: Number(current?.covers ?? 0),
      previousDirectRevenue: previousPos,
      previousTotalRevenue: previousPos + previousEatclub,
      previousLabourCost: Number(previous?.labourCost ?? 0),
      previousCovers: Number(previous?.covers ?? 0),
      hasCurrentData: current !== undefined,
      hasPreviousData: previous !== undefined,
      blankCurrent: blanks(current),
      blankPrevious: blanks(previous),
      eventId: event?.id,
      eventImpact: event?.impact ?? null,
      eventDescription: event?.description ?? undefined,
    };
  });
}

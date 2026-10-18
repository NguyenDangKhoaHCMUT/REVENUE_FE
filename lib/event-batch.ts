import type { DailyMetricData } from '@/types/metrics';
import type { BatchEventPayload, EventItem } from '@/types/events';

export function buildEventBatch(data: DailyMetricData[]): BatchEventPayload[] {
  return data.map((row) => {
    if (!row.dateStr) throw new Error('Missing event date. Please reload the page.');
    return {
      date: row.dateStr,
      impact: row.eventImpact,
      description: row.eventImpact === null ? null : row.eventDescription?.trim() || null,
    };
  });
}

export function mergeEventBatch(
  metrics: DailyMetricData[], submitted: BatchEventPayload[], saved: EventItem[],
): DailyMetricData[] {
  const dates = new Set(submitted.map((row) => row.date));
  return metrics.map((row) => {
    if (!dates.has(row.dateStr)) return row;
    const event = saved.find((item) => item.date === row.dateStr);
    return { ...row,
      eventId: event?.id,
      eventImpact: event?.impact ?? null,
      eventDescription: event?.description ?? undefined,
    };
  });
}

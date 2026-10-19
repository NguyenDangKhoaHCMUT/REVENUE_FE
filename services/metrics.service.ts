import { apiClient } from './api-client';
import type { DailyMetricData } from '@/types';
import { getWeekRanges } from '@/lib/utils';
import type { PeriodMetricPayload } from '@/lib/metric-period';

const STORAGE_KEY = 'metrics';

const WEEK_DAYS: { id: string; day: DailyMetricData['day'] }[] = [
  { id: 'mon', day: 'Mon' },
  { id: 'tue', day: 'Tue' },
  { id: 'wed', day: 'Wed' },
  { id: 'thu', day: 'Thu' },
  { id: 'fri', day: 'Fri' },
  { id: 'sat', day: 'Sat' },
  { id: 'sun', day: 'Sun' },
];


/**
 * 7-day skeleton (Mon-Sun). When `now` is provided the dates are those of the
 * current week; otherwise dates are left empty so it is safe to call during
 * prerender (Next.js forbids reading `new Date()` there).
 */
export function buildEmptyWeekMetrics(now?: Date): DailyMetricData[] {
  const dates = now ? getWeekRanges(now).current.dates : [];
  return WEEK_DAYS.map(({ id, day }, i) => ({
    id,
    day,
    dateStr: dates[i] ?? '',
    posRevenue: 0,
    eatclubRevenue: 0,
    labourCost: 0,
    covers: 0,
    previousDirectRevenue: 0,
    previousTotalRevenue: 0,
    previousLabourCost: 0,
    previousCovers: 0,
    eventImpact: null,
  }));
}

export const metricsService = {
  async upsertPeriod(metrics: PeriodMetricPayload[], token: string): Promise<{ success: true }> {
    return apiClient<{ success: true }>('/admin/metrics', {
      method: 'PUT',
      token,
      body: JSON.stringify({ metrics }),
    });
  },

  /**
   * Get initial metrics from storage or fallback to empty week skeleton
   */
  getInitialMetrics(): DailyMetricData[] {
    // Server/prerender: date-free placeholder (client fills real week on mount)
    if (typeof window === 'undefined') return buildEmptyWeekMetrics();
    const empty = buildEmptyWeekMetrics(new Date());
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DailyMetricData[];
        // Discard cached data that belongs to a different (stale) week
        const sameWeek =
          parsed.length === 7 &&
          parsed.every((item, idx) => item.dateStr === empty[idx].dateStr);
        if (sameWeek) {
          // Upgrade browser caches created before events switched to description.
          return parsed.map((row: DailyMetricData & { eventTitle?: string }) => {
            const { eventTitle, ...metric } = row;
            return { ...metric, eventDescription: metric.eventDescription ?? eventTitle };
          });
        }
      }
      return empty;
    } catch {
      return empty;
    }
  },

  /**
   * Persist metrics to storage
   */
  saveMetrics(metrics: DailyMetricData[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    } catch {
      // ignore storage error
    }
  },

  /**
   * Reset metrics to empty defaults
   */
  resetMetrics(): DailyMetricData[] {
    const empty = buildEmptyWeekMetrics(new Date());
    this.saveMetrics(empty);
    return empty;
  },
};

import type { DailyMetric } from './metrics';
import type { EventItem } from './events';

export interface DashboardResponse {
  weekStart: string;
  metrics: Pick<DailyMetric, 'date' | 'posRevenue' | 'eatclubRevenue' | 'labourCost' | 'covers'>[];
  events: EventItem[];
}

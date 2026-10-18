import { EventImpactType } from './events';
export type { EventImpactType };

export interface DailyMetric {
  id: string;
  date: string; // YYYY-MM-DD
  posRevenue: number | null;
  eatclubRevenue: number | null;
  labourCost: number | null;
  covers: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/** null = empty (no data), 0 = a real zero */
export interface UpsertDailyMetricPayload {
  posRevenue: number | null;
  eatclubRevenue: number | null;
  labourCost: number | null;
  covers: number | null;
}

export type MetricPayloadField = keyof UpsertDailyMetricPayload;

export interface DailyMetricData {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  dateStr: string; // YYYY-MM-DD
  // Current Period
  posRevenue: number;
  eatclubRevenue: number;
  labourCost: number;
  covers: number;
  // Previous Period
  previousDirectRevenue: number;
  previousTotalRevenue: number;
  previousLabourCost: number;
  previousCovers: number;
  // Whether a record really exists for the day (a stored 0 is data, not empty)
  hasCurrentData?: boolean;
  hasPreviousData?: boolean;
  // Individual cells that are empty (null on the API) within a day that has data
  blankCurrent?: MetricPayloadField[];
  blankPrevious?: MetricPayloadField[];
  // Event Impact
  eventImpact: EventImpactType | null;
  eventTitle?: string;
  eventId?: string;
}

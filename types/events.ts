export type EventImpactType = 'positive' | 'negative';

export interface BatchEventPayload {
  date: string;
  impact: EventImpactType | null;
  description: string | null;
}

export interface EventItem {
  id: string;
  date: string; // YYYY-MM-DD
  impact: EventImpactType;
  description?: string | null;
  createdAt?: string;
}

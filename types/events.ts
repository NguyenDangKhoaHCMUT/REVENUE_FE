export type EventImpactType = 'positive' | 'negative';

export interface EventItem {
  id: string;
  date: string; // YYYY-MM-DD
  impact: EventImpactType;
  title: string;
  description?: string | null;
  createdAt?: string;
}

export interface CreateEventPayload {
  date: string;
  impact: EventImpactType;
  title: string;
  description?: string;
}

export interface UpdateEventPayload {
  date?: string;
  impact?: EventImpactType;
  title?: string;
  description?: string;
}

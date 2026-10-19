import { apiClient } from './api-client';
import type { BatchEventPayload, EventItem } from '@/types/events';

export const eventsService = {
  async upsertBatch(events: BatchEventPayload[], token: string): Promise<EventItem[]> {
    return apiClient<EventItem[]>('/admin/events', {
      method: 'PUT',
      token,
      body: JSON.stringify({ events }),
    });
  },
};

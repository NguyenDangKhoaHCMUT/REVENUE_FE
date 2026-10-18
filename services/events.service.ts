import { apiClient } from './api-client';
import type {
  EventItem,
  CreateEventPayload,
  UpdateEventPayload,
} from '@/types';
import type { BatchEventPayload } from '@/types/events';

export const eventsService = {
  async upsertBatch(events: BatchEventPayload[], token: string): Promise<EventItem[]> {
    return apiClient<EventItem[]>('/admin/events', {
      method: 'PUT',
      token,
      body: JSON.stringify({ events }),
    });
  },

  /**
   * Fetch list of events with optional date filters
   */
  async getEvents(
    params?: { from?: string; to?: string },
    token?: string
  ): Promise<EventItem[]> {
    return apiClient<EventItem[]>('/admin/events', {
      method: 'GET',
      token,
      params,
    });
  },

  /**
   * Create a new event
   */
  async createEvent(
    payload: CreateEventPayload,
    token?: string
  ): Promise<EventItem> {
    return apiClient<EventItem>('/admin/events', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing event by ID
   */
  async updateEvent(
    id: string,
    payload: UpdateEventPayload,
    token?: string
  ): Promise<EventItem> {
    return apiClient<EventItem>(`/admin/events/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete an event by ID
   */
  async deleteEvent(
    id: string,
    token?: string
  ): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/admin/events/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

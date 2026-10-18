import { apiClient } from './api-client';
import type { DashboardResponse } from '@/types/dashboard';

export const dashboardService = {
  getDashboard(weekStart: string): Promise<DashboardResponse> {
    return apiClient<DashboardResponse>('/dashboard', {
      method: 'GET',
      params: { weekStart },
      cache: 'no-store',
    });
  },
};

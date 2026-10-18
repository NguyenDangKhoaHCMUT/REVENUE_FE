'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { DailyMetricData } from '@/types/metrics';
import { AdminUser } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { metricsService, buildEmptyWeekMetrics } from '@/services/metrics.service';
import { getWeekRanges } from '@/lib/utils';
import { eventsService } from '@/services/events.service';
import { toast } from 'react-toastify';
import { buildPeriodMetrics, mergePeriodMetrics, type MetricPeriod } from '@/lib/metric-period';
import { buildEventBatch, mergeEventBatch } from '@/lib/event-batch';
import { dashboardService } from '@/services/dashboard.service';
import { mergeDashboardData } from '@/lib/dashboard-data';

interface DataContextType {
  metrics: DailyMetricData[];
  updateMetric: (id: string, updated: Partial<DailyMetricData>) => void;
  saveEvents: (data: DailyMetricData[]) => Promise<{ success: boolean; error?: string }>;
  saveMetricsPeriod: (data: DailyMetricData[], period: MetricPeriod) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  isLoadingData: boolean;
  dataError: string | null;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Date-free placeholder so SSR/prerender and first client render match.
  // The real current week is read from the public API on mount below.
  const [metrics, setMetrics] = useState<DailyMetricData[]>(() =>
    buildEmptyWeekMetrics()
  );
  const [user, setUser] = useState<AdminUser | null>(() =>
    authService.getStoredUser()
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const latestRead = useRef(0);

  const loadData = useCallback(() => {
    const requestId = ++latestRead.current;
    const now = new Date();
    const { current, previous } = getWeekRanges(now);
    return dashboardService.getDashboard(current.from)
      .then((response) => {
        if (requestId !== latestRead.current) return;
        const updated = mergeDashboardData(buildEmptyWeekMetrics(now), previous.dates, response);
        setMetrics(updated);
        setDataError(null);
        metricsService.saveMetrics(updated);
      })
      .catch((err: unknown) => {
        if (requestId === latestRead.current) {
          setDataError(err instanceof Error ? err.message : 'Unable to load dashboard data');
        }
      })
      .finally(() => {
        if (requestId === latestRead.current) setIsLoadingData(false);
      });
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    setDataError(null);
    await loadData();
  }, [loadData]);

  const cancelPendingReads = useCallback(() => { latestRead.current++; }, []);

  // Public data always loads on mount, even in a clean/anonymous browser.
  useEffect(() => {
    // Initial state is already loading; all state updates here follow the API response.
    void loadData();
    return cancelPendingReads;
  }, [loadData, cancelPendingReads]);

  const logout = useCallback(() => {
    authService.clearStoredUser();
    setUser(null);
  }, []);

  // Validate a cached admin session independently of the public dashboard read.
  useEffect(() => {
    const storedUser = authService.getStoredUser();
    if (!storedUser?.token) return;
    let cancelled = false;

    authService
      .getMe(storedUser.token)
      .then((meData) => {
        if (cancelled) return;
        setUser((prev: AdminUser | null) =>
          prev
            ? {
                ...prev,
                id: meData.id,
                name: meData.name || prev.name,
                email: meData.email || prev.email,
              }
            : null
        );
      })
      .catch((err) => {
        if (cancelled) return;
        // If unauthorized (401), clear invalid token
        if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 401) {
          logout();
          toast.warning('Your session has expired. Please sign in again.', {
            toastId: 'session-expired',
          });
        }
      });
    return () => { cancelled = true; };
  }, [logout]);

  const updateMetric = (id: string, updated: Partial<DailyMetricData>) => {
    setMetrics((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...updated } : m));
      metricsService.saveMetrics(next);
      return next;
    });
  };

  const saveMetricsPeriod = async (data: DailyMetricData[], period: MetricPeriod) => {
    const token = user?.token;
    if (!token) return { success: false, error: 'Unauthorized: Please log in again.' };
    if (isLoadingData || dataError) return { success: false, error: 'Please load the latest data before saving.' };
    try {
      const previousDates = getWeekRanges().previous.dates;
      const payload = buildPeriodMetrics(data, period, previousDates);
      await metricsService.upsertPeriod(payload, token);
      setMetrics((existing) => {
        const updated = mergePeriodMetrics(existing, payload, period, previousDates);
        metricsService.saveMetrics(updated);
        return updated;
      });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save metrics' };
    }
  };

  const saveEvents = async (
    data: DailyMetricData[]
  ): Promise<{ success: boolean; error?: string }> => {
    const token = user?.token;
    if (!token) {
      return { success: false, error: 'Unauthorized: Please log in again.' };
    }
    if (isLoadingData || dataError) return { success: false, error: 'Please load the latest data before saving.' };

    try {
      const payload = buildEventBatch(data);
      const saved = await eventsService.upsertBatch(payload, token);
      setMetrics((existing) => {
        const updated = mergeEventBatch(existing, payload, saved);
        metricsService.saveMetrics(updated);
        return updated;
      });
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes to server';
      return { success: false, error: message };
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      return { success: false, error: 'Email and password cannot be empty' };
    }

    try {
      const adminUser = await authService.authenticate({
        email: trimmedEmail,
        password,
      });
      setUser(adminUser);
      // Fetch data after successful login
      void refreshData();
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign in. Please verify your credentials.';
      return { success: false, error: message };
    }
  };

  return (
    <DataContext.Provider
      value={{
        metrics,
        updateMetric,
        saveEvents,
        saveMetricsPeriod,
        refreshData,
        isLoadingData,
        dataError,
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

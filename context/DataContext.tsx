'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DailyMetric,
  DailyMetricData,
  MetricPayloadField,
} from '@/types/metrics';
import { AdminUser } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { metricsService, buildEmptyWeekMetrics } from '@/services/metrics.service';
import { getWeekRanges } from '@/lib/utils';
import { eventsService } from '@/services/events.service';
import { toast } from 'react-toastify';
import { buildPeriodMetrics, mergePeriodMetrics, type MetricPeriod } from '@/lib/metric-period';
import { buildEventBatch, mergeEventBatch } from '@/lib/event-batch';

interface DataContextType {
  metrics: DailyMetricData[];
  updateMetric: (id: string, updated: Partial<DailyMetricData>) => void;
  saveEvents: (data: DailyMetricData[]) => Promise<{ success: boolean; error?: string }>;
  saveMetricsPeriod: (data: DailyMetricData[], period: MetricPeriod) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  isLoadingData: boolean;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const PAYLOAD_FIELDS: MetricPayloadField[] = [
  'posRevenue',
  'eatclubRevenue',
  'labourCost',
  'covers',
];

/** Fields of a stored record that are null (empty) */
function blankFields(metric?: DailyMetric): MetricPayloadField[] {
  if (!metric) return [];
  return PAYLOAD_FIELDS.filter((f) => metric[f] === null || metric[f] === undefined);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Date-free placeholder so SSR/prerender and first client render match.
  // The real current week (+ cached values) is loaded on mount below.
  const [metrics, setMetrics] = useState<DailyMetricData[]>(() =>
    buildEmptyWeekMetrics()
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMetrics(metricsService.getInitialMetrics());
  }, []);
  const [user, setUser] = useState<AdminUser | null>(() =>
    authService.getStoredUser()
  );
  const [isLoadingData, setIsLoadingData] = useState(false);

  const refreshData = async (tokenOverride?: string) => {
    const token = tokenOverride || user?.token;
    if (!token) return;

    try {
      setIsLoadingData(true);
      const { current, previous } = getWeekRanges();
      const [remoteMetrics, remoteEvents] = await Promise.all([
        // Previous + current week in a single request
        metricsService
          .getMetrics({ from: previous.from, to: current.to }, token)
          .catch(() => []),
        eventsService
          .getEvents({ from: current.from, to: current.to }, token)
          .catch(() => []),
      ]);

      setMetrics(() => {
        const base = buildEmptyWeekMetrics(new Date());
        const updated = base.map((item, idx) => {
          const matchMetric = remoteMetrics.find((m) => m.date === item.dateStr);
          const matchEvent = remoteEvents.find((e) => e.date === item.dateStr);
          const prevMetric = remoteMetrics.find(
            (m) => m.date === previous.dates[idx]
          );
          const prevPos = prevMetric ? Number(prevMetric.posRevenue) : 0;
          const prevEatclub = prevMetric ? Number(prevMetric.eatclubRevenue) : 0;

          return {
            ...item,
            posRevenue:
              matchMetric !== undefined ? Number(matchMetric.posRevenue) : 0,
            eatclubRevenue:
              matchMetric !== undefined
                ? Number(matchMetric.eatclubRevenue)
                : 0,
            labourCost:
              matchMetric !== undefined ? Number(matchMetric.labourCost) : 0,
            covers: matchMetric !== undefined ? Number(matchMetric.covers) : 0,
            previousDirectRevenue: prevPos,
            previousTotalRevenue: prevPos + prevEatclub,
            previousLabourCost: prevMetric ? Number(prevMetric.labourCost) : 0,
            previousCovers: prevMetric ? Number(prevMetric.covers) : 0,
            hasCurrentData: matchMetric !== undefined,
            hasPreviousData: prevMetric !== undefined,
            blankCurrent: blankFields(matchMetric),
            blankPrevious: blankFields(prevMetric),
            eventImpact: matchEvent ? matchEvent.impact : null,
            eventDescription: matchEvent?.description ?? undefined,
            eventId: matchEvent ? matchEvent.id : undefined,
          };
        });

        metricsService.saveMetrics(updated);
        return updated;
      });
    } catch {
      // keep current state
    } finally {
      setIsLoadingData(false);
    }
  };

  const logout = () => {
    authService.clearStoredUser();
    setUser(null);
  };

  // Validate session against backend /auth/me and load remote data on mount
  useEffect(() => {
    if (!user?.token) return;

    authService
      .getMe(user.token)
      .then((meData) => {
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
        refreshData(user.token);
      })
      .catch((err) => {
        // If unauthorized (401), clear invalid token
        if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 401) {
          logout();
          toast.warning('Your session has expired. Please sign in again.', {
            toastId: 'session-expired',
          });
        }
      });
  }, []);

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
      refreshData(adminUser.token);
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

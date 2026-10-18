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

interface DataContextType {
  metrics: DailyMetricData[];
  updateMetric: (id: string, updated: Partial<DailyMetricData>) => void;
  saveAllMetricsAndEvents: (data: DailyMetricData[]) => Promise<{ success: boolean; error?: string }>;
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

/** Number >= 0, or null when the cell is blank */
const orNull = (blank: boolean, value: number, round = false): number | null =>
  blank ? null : Math.max(round ? Math.round(value) : value, 0) || 0;

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
            eventTitle: matchEvent ? matchEvent.title : undefined,
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

  const saveAllMetricsAndEvents = async (
    data: DailyMetricData[]
  ): Promise<{ success: boolean; error?: string }> => {
    const token = user?.token;
    if (!token) {
      return { success: false, error: 'Unauthorized: Please log in again.' };
    }

    try {
      const updatedList = [...data];
      const { previous } = getWeekRanges();

      for (let i = 0; i < updatedList.length; i++) {
        const item = updatedList[i];
        if (!item.dateStr) continue;

        const existing = metrics.find((m) => m.id === item.id);
        const isBlank = (f: MetricPayloadField) =>
          item.blankCurrent?.includes(f) ?? false;
        const isPrevBlank = (f: MetricPayloadField) =>
          item.blankPrevious?.includes(f) ?? false;

        // 1. Current week: upsert if the day has data, delete if it was emptied
        if (item.hasCurrentData) {
          await metricsService.upsertMetric(
            item.dateStr,
            {
              posRevenue: orNull(isBlank('posRevenue'), Number(item.posRevenue)),
              eatclubRevenue: orNull(isBlank('eatclubRevenue'), Number(item.eatclubRevenue)),
              labourCost: orNull(isBlank('labourCost'), Number(item.labourCost)),
              covers: orNull(isBlank('covers'), Number(item.covers), true),
            },
            token
          );
        } else if (existing?.hasCurrentData) {
          await metricsService.deleteMetric(item.dateStr, token);
        }

        // 1b. Same weekday of the previous week (Previous Period)
        const prevDate = previous.dates[i];
        if (prevDate) {
          if (item.hasPreviousData) {
            const prevDirect = Math.max(Number(item.previousDirectRevenue) || 0, 0);
            const prevTotal = Math.max(Number(item.previousTotalRevenue) || 0, 0);
            await metricsService.upsertMetric(
              prevDate,
              {
                posRevenue: orNull(isPrevBlank('posRevenue'), prevDirect),
                // total = direct (POS) + eatclub, so eatclub is the remainder
                eatclubRevenue: orNull(
                  isPrevBlank('eatclubRevenue'),
                  prevTotal - prevDirect
                ),
                labourCost: orNull(
                  isPrevBlank('labourCost'),
                  Number(item.previousLabourCost)
                ),
                covers: orNull(isPrevBlank('covers'), Number(item.previousCovers), true),
              },
              token
            );
          } else if (existing?.hasPreviousData) {
            await metricsService.deleteMetric(prevDate, token);
          }
        }

        // 2. Synchronize event to backend
        if (
          item.eventImpact &&
          (item.eventImpact === 'positive' || item.eventImpact === 'negative')
        ) {
          if (item.eventId) {
            await eventsService.updateEvent(
              item.eventId,
              {
                impact: item.eventImpact,
                title: item.eventTitle?.trim() || 'Event',
              },
              token
            );
          } else {
            const newEvent = await eventsService.createEvent(
              {
                date: item.dateStr,
                impact: item.eventImpact,
                title: item.eventTitle?.trim() || 'Event',
              },
              token
            );
            updatedList[i] = {
              ...item,
              eventId: newEvent.id,
            };
          }
        } else if (item.eventImpact === null && item.eventId) {
          await eventsService.deleteEvent(item.eventId, token);
          updatedList[i] = {
            ...item,
            eventId: undefined,
            eventTitle: undefined,
          };
        }
      }

      setMetrics(updatedList);
      metricsService.saveMetrics(updatedList);
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
        saveAllMetricsAndEvents,
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

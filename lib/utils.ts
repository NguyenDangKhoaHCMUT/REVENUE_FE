/**
 * Format a number as currency (e.g. $1,700)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with comma separators (e.g. 1,200)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Utility for combining Tailwind/CSS class names conditionally
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a Date as YYYY-MM-DD using local time (avoids UTC shift of toISOString)
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Date ranges (Monday -> Sunday) of the current week and the previous week,
 * computed from the current date.
 */
export function getWeekRanges(now: Date = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offsetFromMonday = (monday.getDay() + 6) % 7; // Sunday -> 6
  monday.setDate(monday.getDate() - offsetFromMonday);

  const addDays = (base: Date, n: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  };
  const weekDates = (start: Date) =>
    Array.from({ length: 7 }, (_, i) => formatLocalDate(addDays(start, i)));

  const prevMonday = addDays(monday, -7);
  return {
    current: {
      from: formatLocalDate(monday),
      to: formatLocalDate(addDays(monday, 6)),
      dates: weekDates(monday),
    },
    previous: {
      from: formatLocalDate(prevMonday),
      to: formatLocalDate(addDays(prevMonday, 6)),
      dates: weekDates(prevMonday),
    },
  };
}

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Hook to detect whether the component has hydrated on the client
 * Avoids SSR hydration mismatch for client-only state (e.g. localStorage)
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

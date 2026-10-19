'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { Navbar } from '@/components/Navbar';
import {
  DailyMetricData,
  EventImpactType,
  MetricPayloadField,
} from '@/types/metrics';
import { useIsClient, getWeekRanges } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
  Save,
  ShieldAlert,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

type FieldKey =
  | 'posRevenue'
  | 'eatclubRevenue'
  | 'labourCost'
  | 'covers'
  | 'prevPos'
  | 'prevEatclub'
  | 'prevLabour'
  | 'prevCovers';

const CURRENT_FIELDS: FieldKey[] = ['posRevenue', 'eatclubRevenue', 'labourCost', 'covers'];
const PREVIOUS_FIELDS: FieldKey[] = ['prevPos', 'prevEatclub', 'prevLabour', 'prevCovers'];
// Same order as CURRENT_FIELDS / PREVIOUS_FIELDS, mapped to the API field names
const PAYLOAD_KEYS: MetricPayloadField[] = [
  'posRevenue',
  'eatclubRevenue',
  'labourCost',
  'covers',
];

const fieldKey = (id: string, field: FieldKey) => `${id}:${field}`;

/** Turn metric rows into input strings; days without a record stay empty */
function buildFields(rows: DailyMetricData[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const cur = (f: MetricPayloadField, v: number) =>
      r.hasCurrentData && !r.blankCurrent?.includes(f) ? String(v) : '';
    const prev = (f: MetricPayloadField, v: number) =>
      r.hasPreviousData && !r.blankPrevious?.includes(f) ? String(v) : '';
    out[fieldKey(r.id, 'posRevenue')] = cur('posRevenue', r.posRevenue);
    out[fieldKey(r.id, 'eatclubRevenue')] = cur('eatclubRevenue', r.eatclubRevenue);
    out[fieldKey(r.id, 'labourCost')] = cur('labourCost', r.labourCost);
    out[fieldKey(r.id, 'covers')] = cur('covers', r.covers);
    out[fieldKey(r.id, 'prevPos')] = prev('posRevenue', r.previousDirectRevenue);
    out[fieldKey(r.id, 'prevEatclub')] = prev(
      'eatclubRevenue',
      Math.max(r.previousTotalRevenue - r.previousDirectRevenue, 0)
    );
    out[fieldKey(r.id, 'prevLabour')] = prev('labourCost', r.previousLabourCost);
    out[fieldKey(r.id, 'prevCovers')] = prev('covers', r.previousCovers);
  }
  return out;
}

export default function AdminPage() {
  const router = useRouter();
  const {
    metrics,
    saveEvents,
    saveMetricsPeriod,
    isAuthenticated,
    isLoadingData,
    dataError,
    refreshData,
  } = useData();
  const isClient = useIsClient();

  // Local state for editing form
  const [formData, setFormData] = useState<DailyMetricData[]>(metrics);
  const [prevMetrics, setPrevMetrics] = useState(metrics);
  // Numeric inputs kept as strings: '' = empty (no data), '0' = a real zero
  const [fields, setFields] = useState<Record<string, string>>(() =>
    buildFields(metrics)
  );
  const [activeTab, setActiveTab] = useState<'current' | 'previous' | 'events'>(
    'current'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync if metrics change externally (e.g. after refreshData or initial load)
  if (metrics !== prevMetrics) {
    setPrevMetrics(metrics);
    // A period save must not discard edits in the other tabs.
    setFormData((draft) => metrics.map((row) => {
      const before = prevMetrics.find((item) => item.id === row.id);
      const edited = draft.find((item) => item.id === row.id);
      if (!before || !edited) return row;
      return { ...row,
        eventImpact: edited.eventImpact !== before.eventImpact ? edited.eventImpact : row.eventImpact,
        eventDescription: edited.eventDescription !== before.eventDescription ? edited.eventDescription : row.eventDescription,
      };
    }));
    setFields((draft) => {
      const before = buildFields(prevMetrics);
      const after = buildFields(metrics);
      return Object.fromEntries(Object.entries(after).map(([key, value]) =>
        [key, draft[key] !== before[key] ? draft[key] : value]));
    });
  }

  const handleField = (id: string, field: FieldKey, value: string) => {
    setFields((prev) => ({ ...prev, [fieldKey(id, field)]: value }));
  };

  const handleChange = (
    id: string,
    field: keyof DailyMetricData,
    value: string | number | EventImpactType | null
  ) => {
    setFormData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]:
              typeof value === 'string' &&
              !isNaN(Number(value)) &&
              field !== 'eventDescription' &&
              field !== 'eventImpact' &&
              field !== 'day' &&
              field !== 'id' &&
              field !== 'dateStr' &&
              field !== 'eventId'
                ? Number(value)
                : value,
          };
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Build the payload from the string fields: blank = no data, 0 = real zero
    const data: DailyMetricData[] = formData.map((row) => {
      const raw = (f: FieldKey) => fields[fieldKey(row.id, f)] ?? '';
      const num = (f: FieldKey) => Number(raw(f)) || 0;
      const prevPos = num('prevPos');
      return {
        ...row,
        posRevenue: num('posRevenue'),
        eatclubRevenue: num('eatclubRevenue'),
        labourCost: num('labourCost'),
        covers: num('covers'),
        previousDirectRevenue: prevPos,
        previousTotalRevenue: prevPos + num('prevEatclub'),
        previousLabourCost: num('prevLabour'),
        previousCovers: num('prevCovers'),
        hasCurrentData: CURRENT_FIELDS.some((f) => raw(f) !== ''),
        hasPreviousData: PREVIOUS_FIELDS.some((f) => raw(f) !== ''),
        blankCurrent: PAYLOAD_KEYS.filter((_, i) => raw(CURRENT_FIELDS[i]) === ''),
        blankPrevious: PAYLOAD_KEYS.filter((_, i) => raw(PREVIOUS_FIELDS[i]) === ''),
      };
    });

    try {
      const res = activeTab === 'events'
        ? await saveEvents(data)
        : await saveMetricsPeriod(data, activeTab);
      if (res.success) {
        toast.success('Saved successfully!');
      } else {
        toast.error(res.error || 'Failed!');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed!');
    } finally {
      setIsSaving(false);
    }
  };

  // Neutral shell during SSR to prevent hydration mismatch with client localStorage
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  // If not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200 text-center shadow-sm">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 border border-amber-200">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">
              Administrator Access Required
            </h2>
            <p className="text-sm text-neutral-500 mt-2 mb-6">
              You need to log in to access the management and data editing panel.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              Go to Login Page &rarr;
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Computed after the SSR/auth early returns so `new Date()` never runs during prerender
  const previousWeek = getWeekRanges().previous;

  const renderInput = (id: string, field: FieldKey, width = 'w-28') => (
    <input
      type="number"
      min="0"
      placeholder="Empty"
      value={fields[fieldKey(id, field)] ?? ''}
      onChange={(e) => handleField(id, field, e.target.value)}
      className={`${width} px-3 py-1.5 rounded-lg border border-neutral-300 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900`}
    />
  );

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
      <Navbar />

      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {isLoadingData && <p role="status" className="text-sm text-neutral-600">Loading the latest data…</p>}
        {dataError && !isLoadingData && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Unable to load the latest data. Load it successfully before saving.
            <button type="button" onClick={() => void refreshData()} className="ml-3 font-semibold underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'current'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Current Period</span>
          </button>

          <button
            onClick={() => setActiveTab('previous')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'previous'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Previous Period</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Event Impacts</span>
          </button>
        </div>

        {/* Tab 1: Current Period */}
        {activeTab === 'current' && (
          <div className="min-w-0 bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200/80 shadow-xs overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Day</th>
                  <th className="py-3 px-3">POS Revenue ($)</th>
                  <th className="py-3 px-3">Eatclub Revenue ($)</th>
                  <th className="py-3 px-3">Labour Costs ($)</th>
                  <th className="py-3 px-3">Total Covers</th>
                  <th className="py-3 px-3">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {formData.map((row) => {
                  const posVal = fields[fieldKey(row.id, 'posRevenue')] ?? '';
                  const eatVal = fields[fieldKey(row.id, 'eatclubRevenue')] ?? '';
                  const dayTotal = Number(posVal || 0) + Number(eatVal || 0);
                  return (
                    <tr key={row.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-neutral-900">{row.day}</div>
                        <div className="text-xs text-neutral-400 font-mono">{row.dateStr}</div>
                      </td>
                      <td className="py-3 px-3">{renderInput(row.id, 'posRevenue')}</td>
                      <td className="py-3 px-3">{renderInput(row.id, 'eatclubRevenue')}</td>
                      <td className="py-3 px-3">{renderInput(row.id, 'labourCost')}</td>
                      <td className="py-3 px-3">{renderInput(row.id, 'covers', 'w-24')}</td>
                      <td className="py-3 px-3 font-semibold text-neutral-900">
                        {posVal === '' && eatVal === '' ? '—' : `$${dayTotal.toLocaleString()}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Previous Period */}
        {activeTab === 'previous' && (
          <div className="min-w-0 bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200/80 shadow-xs overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Day</th>
                  <th className="py-3 px-3">POS Revenue ($)</th>
                  <th className="py-3 px-3">Eatclub Revenue ($)</th>
                  <th className="py-3 px-3">Labour Costs ($)</th>
                  <th className="py-3 px-3">Total Covers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {formData.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-neutral-800">{row.day}</div>
                      <div className="text-xs text-neutral-400 font-mono">
                        {previousWeek.dates[idx]}
                      </div>
                    </td>
                    <td className="py-3 px-3">{renderInput(row.id, 'prevPos')}</td>
                    <td className="py-3 px-3">{renderInput(row.id, 'prevEatclub')}</td>
                    <td className="py-3 px-3">{renderInput(row.id, 'prevLabour')}</td>
                    <td className="py-3 px-3">{renderInput(row.id, 'prevCovers', 'w-24')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Events Impact */}
        {activeTab === 'events' && (
          <div className="min-w-0 bg-white rounded-3xl p-4 sm:p-6 border border-neutral-200/80 shadow-xs">
            <div className="mb-4">
              <h3 className="text-base font-bold text-neutral-900">
                Configure Event Impact Badges
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.map((row) => (
                <div
                  key={row.id}
                  className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-sm text-neutral-900">
                        {row.day}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono ml-2">
                        ({row.dateStr})
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleChange(row.id, 'eventImpact', null)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          row.eventImpact === null
                            ? 'bg-neutral-800 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                        }`}
                      >
                        None
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleChange(row.id, 'eventImpact', 'positive')
                        }
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          row.eventImpact === 'positive'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Positive</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleChange(row.id, 'eventImpact', 'negative')
                        }
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          row.eventImpact === 'negative'
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Negative</span>
                      </button>
                    </div>
                  </div>

                  {row.eventImpact !== null && (
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">
                        Event Description:
                      </label>
                      <textarea
                        rows={3}
                        value={row.eventDescription || ''}
                        onChange={(e) =>
                          handleChange(row.id, 'eventDescription', e.target.value)
                        }
                        placeholder="e.g. Music Festival, Heavy rain storm..."
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end pt-2 pb-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoadingData || !!dataError}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

'use client';

import { DailyMetricData } from '@/types/metrics';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useId, useState } from 'react';
import { RevenueTooltip } from './RevenueTooltip';

interface RevenueChartProps {
  metrics: DailyMetricData[];
  isCompareMode: boolean;
  showPos: boolean;
  showEatclub: boolean;
  showLabour: boolean;
}

export function RevenueChart({
  metrics,
  isCompareMode,
  showPos,
  showEatclub,
  showLabour,
}: RevenueChartProps) {
  const tooltipId = useId();
  const [active, setActive] = useState<{ id: string; anchor: HTMLElement; touch: boolean } | null>(null);
  const activeDay = active ? metrics.find((day) => day.id === active.id) : undefined;
  const maxScale = 3000;
  const yAxisTicks = [
    { label: '3k', pct: 100 },
    { label: '2.25k', pct: 75 },
    { label: '1.5k', pct: 50 },
    { label: '0.75k', pct: 25 },
    { label: '0k', pct: 0 },
  ];

  return (
    <div className="w-full mt-6 select-none">
      {/* Chart Canvas Area */}
      <div className="relative w-full h-[300px] flex">
        {/* Y Axis Labels */}
        <div className="w-10 sm:w-12 h-full relative text-xs text-neutral-400 font-medium select-none shrink-0">
          {yAxisTicks.map((tick) => (
            <span
              key={tick.label}
              style={{ bottom: `${tick.pct}%` }}
              className="absolute right-3 transform translate-y-1/2 text-right"
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Chart Grid & Columns Area */}
        <div className="relative flex-1 h-full">
          {/* Horizontal Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {yAxisTicks.map((tick) => (
              <div
                key={tick.label}
                style={{ bottom: `${tick.pct}%` }}
                className="absolute left-0 right-0 border-b border-dashed border-neutral-200 h-0"
              />
            ))}
          </div>

          {/* 7 Columns for Days */}
          <div className="relative h-full flex justify-between items-end px-1 sm:px-4 md:px-6">
            {metrics.map((day) => {
              // Percentage calculation (clamped to 100%)
              const posPct = showPos
                ? Math.min(100, (day.posRevenue / maxScale) * 100)
                : 0;
              const eatclubPct = showEatclub
                ? Math.min(100, (day.eatclubRevenue / maxScale) * 100)
                : 0;
              const labourPct = showLabour
                ? Math.min(100, (day.labourCost / maxScale) * 100)
                : 0;

              // Previous period calculations
              const prevDirectPct = showPos
                ? Math.min(100, (day.previousDirectRevenue / maxScale) * 100)
                : 0;
              const prevEatclubPortion = Math.max(
                0,
                day.previousTotalRevenue - day.previousDirectRevenue
              );
              const prevEatclubPct = showEatclub
                ? Math.min(100, (prevEatclubPortion / maxScale) * 100)
                : 0;
              const prevLabourPct = showLabour
                ? Math.min(100, (day.previousLabourCost / maxScale) * 100)
                : 0;

              return (
                <div
                  key={day.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${day.day}${day.dateStr ? ` ${day.dateStr}` : ''} revenue details`}
                  aria-describedby={active?.id === day.id ? tooltipId : undefined}
                  aria-expanded={active?.id === day.id}
                  className="min-w-0 flex-1 flex flex-col items-center h-full justify-end relative px-0.5 sm:px-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setActive({ id: day.id, anchor: event.currentTarget, touch: false });
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') setActive((current) => current?.id === day.id ? null : current);
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerType !== 'mouse') {
                      const anchor = event.currentTarget;
                      setActive((current) => current?.id === day.id ? null : { id: day.id, anchor, touch: true });
                    }
                  }}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(':focus-visible')) setActive({ id: day.id, anchor: event.currentTarget, touch: false });
                  }}
                  onBlur={() => setActive((current) => current?.id === day.id ? null : current)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      const anchor = event.currentTarget;
                      setActive((current) => current?.id === day.id ? null : { id: day.id, anchor, touch: false });
                    }
                  }}
                >
                  {/* Event Impact Badges */}
                  {day.eventImpact === 'negative' && (
                    <div
                      style={{
                        bottom: `${Math.max(posPct + eatclubPct, labourPct) + 5}%`,
                      }}
                      className="absolute z-10 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-50 border border-rose-200 text-rose-500 shadow-xs cursor-pointer transition-transform hover:scale-110 pointer-events-auto"
                      title={day.eventDescription || 'Negative Event Impact'}
                    >
                      <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    </div>
                  )}

                  {day.eventImpact === 'positive' && (
                    <div
                      style={{
                        bottom: `${Math.max(posPct + eatclubPct, labourPct) + 5}%`,
                      }}
                      className="absolute z-10 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-500 shadow-xs cursor-pointer transition-transform hover:scale-110 pointer-events-auto"
                      title={day.eventDescription || 'Positive Event Impact'}
                    >
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    </div>
                  )}

                  {/* Bars Container */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 md:gap-2 h-full">
                    {/* --- Group 1: Current Period --- */}
                    <div className="flex items-end gap-0.5 sm:gap-1 h-full">
                      {/* Current Stacked Revenue Bar */}
                      {(showPos || showEatclub) && (
                        <div
                          style={{ height: `${posPct + eatclubPct}%` }}
                          className={`flex flex-col items-center justify-end ${
                            isCompareMode
                              ? 'w-3.5 sm:w-5 md:w-6 lg:w-7'
                              : 'w-7 sm:w-10 md:w-12 lg:w-14'
                          } transition-all duration-300`}
                        >
                          {/* Eatclub on top */}
                          {showEatclub && eatclubPct > 0 && (
                            <div
                              style={{
                                height: `${(eatclubPct / (posPct + eatclubPct)) * 100}%`,
                              }}
                              className="w-full bg-[#5252E6] rounded-t-sm sm:rounded-t-md transition-all duration-300"
                            />
                          )}
                          {/* POS on bottom */}
                          {showPos && posPct > 0 && (
                            <div
                              style={{
                                height: `${(posPct / (posPct + eatclubPct)) * 100}%`,
                              }}
                              className={`w-full bg-[#27272A] ${
                                !showEatclub || eatclubPct === 0
                                  ? 'rounded-t-sm sm:rounded-t-md'
                                  : ''
                              } transition-all duration-300`}
                            />
                          )}
                        </div>
                      )}

                      {/* Current Labour Cost Bar */}
                      {showLabour && labourPct > 0 && (
                        <div
                          style={{ height: `${labourPct}%` }}
                          className={`${
                            isCompareMode
                              ? 'w-2.5 sm:w-4 md:w-5 lg:w-6'
                              : 'w-6 sm:w-8 md:w-10 lg:w-11'
                          } bg-[#EA580C] rounded-t-sm sm:rounded-t-md transition-all duration-300`}
                        />
                      )}
                    </div>

                    {/* --- Group 2: Previous Period (Compare Mode Only) --- */}
                    {isCompareMode && (
                      <div className="flex items-end gap-0.5 sm:gap-1 h-full">
                        {/* Previous Stacked Revenue Bar */}
                        {(showPos || showEatclub) && (
                          <div
                            style={{ height: `${prevDirectPct + prevEatclubPct}%` }}
                            className="flex flex-col items-center justify-end w-3.5 sm:w-5 md:w-6 lg:w-7 transition-all duration-300"
                          >
                            {/* Prev Eatclub Portion */}
                            {showEatclub && prevEatclubPct > 0 && (
                              <div
                                style={{
                                  height: `${
                                    (prevEatclubPct /
                                      (prevDirectPct + prevEatclubPct)) *
                                    100
                                  }%`,
                                }}
                                className="w-full bg-[#A5B4FC]/80 rounded-t-sm sm:rounded-t-md transition-all duration-300"
                              />
                            )}
                            {/* Prev Direct Revenue */}
                            {showPos && prevDirectPct > 0 && (
                              <div
                                style={{
                                  height: `${
                                    (prevDirectPct /
                                      (prevDirectPct + prevEatclubPct)) *
                                    100
                                  }%`,
                                }}
                                className={`w-full bg-[#9CA3AF]/80 ${
                                  !showEatclub || prevEatclubPct === 0
                                    ? 'rounded-t-sm sm:rounded-t-md'
                                    : ''
                                } transition-all duration-300`}
                              />
                            )}
                          </div>
                        )}

                        {/* Previous Labour Cost Bar */}
                        {showLabour && prevLabourPct > 0 && (
                          <div
                            style={{ height: `${prevLabourPct}%` }}
                            className="w-2.5 sm:w-4 md:w-5 lg:w-6 bg-[#FED7AA] rounded-t-sm sm:rounded-t-md transition-all duration-300"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X Axis Labels */}
      <div className="flex ml-10 sm:ml-12 px-1 sm:px-4 md:px-6 pt-3 text-xs sm:text-sm font-medium text-neutral-500 justify-between">
        {metrics.map((day) => (
          <div key={day.id} className="flex-1 text-center">
            {day.day}
          </div>
        ))}
      </div>

      {active && activeDay && (
        <RevenueTooltip
          id={tooltipId}
          day={activeDay}
          anchor={active.anchor}
          isCompareMode={isCompareMode}
          touch={active.touch}
          onClose={() => setActive(null)}
        />
      )}

      {/* Legend */}
      <div className="mt-8 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-7 gap-y-2.5 text-xs sm:text-sm text-neutral-700">
        {!isCompareMode ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#27272A]" />
              <span>POS Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#5252E6]" />
              <span>Eatclub Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#EA580C]" />
              <span>Labour Costs</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#27272A]" />
              <span>POS Revenue (Current)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#5252E6]" />
              <span>Eatclub Revenue (Current)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#EA580C]" />
              <span>Labour Costs (Current)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#9CA3AF]" />
              <span>POS Revenue (Previous)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#A5B4FC]" />
              <span>Eatclub Revenue (Previous)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FED7AA]" />
              <span>Labour Costs (Previous)</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Positive Event Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <span>Negative Event Impact</span>
        </div>
      </div>
    </div>
  );
}

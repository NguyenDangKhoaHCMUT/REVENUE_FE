'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { DailyMetricData } from '@/types/metrics';
import { formatTooltipRevenue, getRevenueTooltipRows, positionRevenueTooltip, type RevenueTooltipFilters } from '@/lib/revenue-tooltip';

interface RevenueTooltipProps extends RevenueTooltipFilters {
  id: string;
  day: DailyMetricData;
  anchor: HTMLElement;
  isCompareMode: boolean;
  touch: boolean;
  onClose: () => void;
}

export function RevenueTooltip({ id, day, anchor, isCompareMode, showPos, showEatclub, showLabour, touch, onClose }: RevenueTooltipProps) {
  const popup = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reposition = () => {
      const element = popup.current;
      if (!element) return;
      // CSS vw includes the scrollbar on desktop/narrow windows; use the actual
      // content viewport so the rightmost popup never disappears behind it.
      element.style.maxWidth = `${Math.max(0, document.documentElement.clientWidth - 16)}px`;
      const position = positionRevenueTooltip(anchor.getBoundingClientRect(), element.getBoundingClientRect(), {
        width: document.documentElement.clientWidth, height: window.innerHeight,
      });
      element.style.left = `${position.left}px`;
      element.style.top = `${position.top}px`;
      element.style.visibility = 'visible';
    };
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    const observer = new ResizeObserver(reposition);
    if (popup.current) observer.observe(popup.current);
    observer.observe(anchor);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      observer.disconnect();
    };
  }, [anchor, day, isCompareMode, showPos, showEatclub, showLabour]);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchor.contains(event.target) && !popup.current?.contains(event.target)) onClose();
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [anchor, onClose]);

  const section = (previous: boolean) => (
    <section className={previous ? 'mt-2 border-t border-neutral-700 pt-2' : ''}>
      {isCompareMode && (
        <h3 className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
          {previous ? 'Previous Period' : 'Current Period'}
        </h3>
      )}
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 text-[11px] leading-4">
        {getRevenueTooltipRows(day, previous, { showPos, showEatclub, showLabour }).map((row) => (
          <div key={row.field} className="contents">
            <dt className={row.field === 'eatclubRevenue' ? 'text-indigo-300' : row.field === 'labourCost' ? 'text-orange-300' : 'text-neutral-200'}>
              {row.label}
            </dt>
            <dd className={`m-0 whitespace-nowrap text-right font-semibold tabular-nums ${row.value === null ? 'text-neutral-400' : 'text-white'}`}>
              {formatTooltipRevenue(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );

  return createPortal(
    <div
      ref={popup}
      id={id}
      role="tooltip"
      className="fixed z-[100] w-max min-w-[10.5rem] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-white shadow-xl"
      style={{ visibility: 'hidden', pointerEvents: touch ? 'auto' : 'none' }}
    >
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-neutral-700 pb-1">
        <strong className="text-xs">{day.day}</strong>
        {day.dateStr && <span className="text-[10px] tabular-nums text-neutral-400">{day.dateStr}</span>}
      </header>
      {section(false)}
      {isCompareMode && section(true)}
    </div>,
    document.body,
  );
}

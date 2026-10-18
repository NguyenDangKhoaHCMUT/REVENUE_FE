'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { RevenueChart } from '@/components/RevenueChart';
import { Navbar } from '@/components/Navbar';
import {
  BarChart2,
  Download,
} from 'lucide-react';

export default function DashboardPage() {
  const { metrics } = useData();

  // Mode toggles
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showPos, setShowPos] = useState(true);
  const [showEatclub, setShowEatclub] = useState(true);
  const [showLabour, setShowLabour] = useState(true);

  // Calculations
  const stats = useMemo(() => {
    const totalPos = metrics.reduce((acc, m) => acc + (showPos ? m.posRevenue : 0), 0);
    const totalEatclub = metrics.reduce(
      (acc, m) => acc + (showEatclub ? m.eatclubRevenue : 0),
      0
    );
    const totalRevenue = totalPos + totalEatclub;
    const avgPerDay = Math.round(totalRevenue / 7);
    const totalCovers = metrics.reduce((acc, m) => acc + m.covers, 0);

    // Previous period stats
    const prevTotalRevenue = metrics.reduce(
      (acc, m) => acc + m.previousTotalRevenue,
      0
    );
    const prevAvgPerDay = Math.round(prevTotalRevenue / 7);
    const prevTotalCovers = metrics.reduce((acc, m) => acc + m.previousCovers, 0);

    const revDiffPct = prevTotalRevenue
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : 0;
    const avgDiffPct = prevAvgPerDay
      ? ((avgPerDay - prevAvgPerDay) / prevAvgPerDay) * 100
      : 0;
    const coversDiffPct = prevTotalCovers
      ? ((totalCovers - prevTotalCovers) / prevTotalCovers) * 100
      : 0;

    return {
      totalRevenue,
      avgPerDay,
      totalCovers,
      prevTotalRevenue,
      prevAvgPerDay,
      prevTotalCovers,
      revDiffPct: revDiffPct.toFixed(1),
      avgDiffPct: avgDiffPct.toFixed(1),
      coversDiffPct: coversDiffPct.toFixed(1),
    };
  }, [metrics, showPos, showEatclub]);

  const handleExportPNG = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Main Dashboard Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 md:p-8 border border-neutral-200/70 shadow-xs transition-all overflow-hidden">
          {/* Top Bar: Title, Series Checkboxes, Action Buttons */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
            {/* Title */}
            <div className="max-w-md">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight leading-snug">
                {isCompareMode ? (
                  <span>
                    This Week&apos;s Revenue Trend vs<br className="hidden sm:inline" /> Previous Period
                  </span>
                ) : (
                  <span>This Week&apos;s Revenue Trend</span>
                )}
              </h1>
            </div>

            {/* Controls: Checkboxes & Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 justify-start xl:justify-end">
              {/* Checkboxes */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium text-neutral-700">
                {/* POS Revenue checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={showPos}
                    onChange={(e) => setShowPos(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                  />
                  <span className="w-2.5 h-0.5 bg-neutral-900 inline-block" />
                  <span className="group-hover:text-neutral-900 text-xs sm:text-sm">POS Revenue</span>
                </label>

                {/* Eatclub Revenue checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={showEatclub}
                    onChange={(e) => setShowEatclub(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-[#5252E6]"
                  />
                  <span className="w-2.5 h-0.5 bg-[#5252E6] inline-block" />
                  <span className="group-hover:text-neutral-900 text-xs sm:text-sm">Eatclub Revenue</span>
                </label>

                {/* Labour Costs checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={showLabour}
                    onChange={(e) => setShowLabour(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-[#EA580C]"
                  />
                  <span className="w-2.5 h-0.5 bg-[#EA580C] inline-block" />
                  <span className="group-hover:text-neutral-900 text-xs sm:text-sm">Labour Costs</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Compare to Previous Button */}
                <button
                  type="button"
                  onClick={() => setIsCompareMode((prev) => !prev)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer ${
                    isCompareMode
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'bg-[#EAB308] hover:bg-[#FACC15] text-neutral-900'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Compare to Previous</span>
                </button>

                {/* Export PNG Button */}
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-neutral-600" />
                  <span>Export PNG</span>
                </button>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {/* Total Revenue Card */}
            <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-neutral-100 flex flex-col justify-center">
              <span className="text-xs sm:text-sm text-neutral-500 font-medium">
                Total Revenue
              </span>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                  ${stats.totalRevenue.toLocaleString()}
                </span>
                {isCompareMode && (
                  <span className="text-xs sm:text-sm font-medium text-neutral-500">
                    vs ${stats.prevTotalRevenue.toLocaleString()}{' '}
                    <span className="text-emerald-600 font-semibold">
                      ({Number(stats.revDiffPct) >= 0 ? '+' : ''}
                      {stats.revDiffPct}%)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Average per Day Card */}
            <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-neutral-100 flex flex-col justify-center">
              <span className="text-xs sm:text-sm text-neutral-500 font-medium">
                Average per Day
              </span>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                  ${stats.avgPerDay.toLocaleString()}
                </span>
                {isCompareMode && (
                  <span className="text-xs sm:text-sm font-medium text-neutral-500">
                    vs ${stats.prevAvgPerDay.toLocaleString()}{' '}
                    <span className="text-emerald-600 font-semibold">
                      ({Number(stats.avgDiffPct) >= 0 ? '+' : ''}
                      {stats.avgDiffPct}%)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Total Covers Card */}
            <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-neutral-100 flex flex-col justify-center">
              <span className="text-xs sm:text-sm text-neutral-500 font-medium">
                Total Covers
              </span>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                  {stats.totalCovers.toLocaleString()}
                </span>
                {isCompareMode && (
                  <span className="text-xs sm:text-sm font-medium text-neutral-500">
                    vs {stats.prevTotalCovers.toLocaleString()}{' '}
                    <span className="text-emerald-600 font-semibold">
                      ({Number(stats.coversDiffPct) >= 0 ? '+' : ''}
                      {stats.coversDiffPct}%)
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <RevenueChart
            metrics={metrics}
            isCompareMode={isCompareMode}
            showPos={showPos}
            showEatclub={showEatclub}
            showLabour={showLabour}
          />
        </div>
      </main>
    </div>
  );
}

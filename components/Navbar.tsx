'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { useIsClient } from '@/lib/utils';
import { LayoutDashboard, Lock, Settings, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useData();
  const isClient = useIsClient();

  return (
    <nav className="bg-white border-b border-neutral-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
              S
            </div>
            <span className="font-bold text-lg text-neutral-900 tracking-tight">
              Revenue Analytics
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {!isClient ? (
            <div className="w-24 h-8" />
          ) : !isAuthenticated ? (
            <Link
              href="/login"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/login'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Admin Login</span>
            </Link>
          ) : (
            <>
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'bg-neutral-100 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Admin Management</span>
              </Link>

              <button
                onClick={() => {
                  logout();
                  toast.success('Signed out successfully.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors ml-1 cursor-pointer"
                title={`Logged in as ${user?.name}`}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

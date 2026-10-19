'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { useIsClient } from '@/lib/utils';
import { CircleDollarSign, LayoutDashboard, Lock, Settings, LogOut, Menu, X } from 'lucide-react';
import { toast } from 'react-toastify';

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useData();
  const isClient = useIsClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    // close menu when clicking outside
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    // close menu when pressing escape
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };

    // close menu on desktop (not used, keep it incase needed in future)
    // const desktop = window.matchMedia('(min-width: 768px)');
    // const dismissOnDesktop = () => {
    //   if (desktop.matches) setMenuOpen(false);
    // };

    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    // desktop.addEventListener('change', dismissOnDesktop);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
      // desktop.removeEventListener('change', dismissOnDesktop);
    };
  }, [menuOpen]);

  return (
    <nav ref={navRef} aria-label="Main navigation" className="sticky top-0 z-30 w-full min-w-0 border-b border-neutral-200/80 bg-white shadow-xs">
      <div className="relative mx-auto flex h-16 w-full max-w-7xl min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setMenuOpen(false)} className="group flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-sm">
            <CircleDollarSign aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="truncate text-base font-bold tracking-tight text-neutral-900 sm:text-lg">
            Revenue Analytics
          </span>
        </Link>

        <button
          ref={toggleRef}
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 md:hidden"
        >
          {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>

        <div
          id={menuId}
          className={`${menuOpen ? 'flex' : 'hidden'} absolute inset-x-4 top-full mt-2 flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg md:static md:mt-0 md:flex md:flex-row md:items-center md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <Link
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
            className={`flex min-h-11 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors md:min-h-0 md:gap-1.5 md:py-1.5 ${
              pathname === '/'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <LayoutDashboard aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </Link>

          {!isClient ? (
            <div className="w-24 h-8" />
          ) : !isAuthenticated ? (
            <Link
              href="/login"
              aria-current={pathname === '/login' ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors md:min-h-0 md:gap-1.5 md:py-1.5 ${
                pathname === '/login'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>Admin Login</span>
            </Link>
          ) : (
            <>
              <Link
                href="/admin"
                aria-current={pathname === '/admin' ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors md:min-h-0 md:gap-1.5 md:py-1.5 ${
                  pathname === '/admin'
                    ? 'bg-neutral-100 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Settings aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>Admin Management</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                  toast.success('Signed out successfully.');
                }}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 md:min-h-0 md:gap-1.5 md:px-3 md:py-1.5"
                title={`Logged in as ${user?.name}`}
              >
                <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>Log out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

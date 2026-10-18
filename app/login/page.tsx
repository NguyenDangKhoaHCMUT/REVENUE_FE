'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { Navbar } from '@/components/Navbar';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useData();

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@12345');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, show notice or redirect
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success('Signed in successfully.');
        router.push('/admin');
      } else {
        toast.error(res.error || 'Login failed');
      }
    } catch {
      toast.error('An error occurred, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl p-8 border border-neutral-200/80 shadow-sm">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-md mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                Admin Login
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Authenticate as an administrator to manage metrics
              </p>
            </div>

            {/* Already authenticated banner */}
            {isAuthenticated && (
              <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>You are currently logged in as Admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="font-bold underline hover:text-emerald-950 cursor-pointer"
                >
                  Go to Admin Panel &rarr;
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@restaurant.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm bg-neutral-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm bg-neutral-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

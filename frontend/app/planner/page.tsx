'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function PlannerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats] = useState({
    totalLeads: 24,
    unlockedLeads: 8,
    activeClients: 3,
    revenue: 450000,
  });

  return (
    <div className="min-h-screen bg-[#3A2563]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#3A2563]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#3A2563] mb-1">
                Planner dashboard
              </h1>
              <p className="text-[#3A2563]/70">
                Manage leads and clients
              </p>
            </div>
            <button
              onClick={() => {
                useAuthStore.getState().clearAuth();
                router.push('/');
              }}
              className="px-4 py-2 bg-[#3A2563] text-[#E2B451] rounded-lg font-semibold hover:bg-[#3A2563]/90 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#E2B451]/10 rounded-lg p-6 border-2 border-[#E2B451]/20">
            <p className="text-[#E2B451]/60 text-sm mb-1">Total leads</p>
            <p className="text-4xl font-bold text-[#E2B451]">{stats.totalLeads}</p>
          </div>
          <div className="bg-[#E2B451]/10 rounded-lg p-6 border-2 border-[#E2B451]/20">
            <p className="text-[#E2B451]/60 text-sm mb-1">Unlocked</p>
            <p className="text-4xl font-bold text-[#E2B451]">{stats.unlockedLeads}</p>
          </div>
          <div className="bg-[#E2B451]/10 rounded-lg p-6 border-2 border-[#E2B451]/20">
            <p className="text-[#E2B451]/60 text-sm mb-1">Active clients</p>
            <p className="text-4xl font-bold text-[#E2B451]">{stats.activeClients}</p>
          </div>
          <div className="bg-[#E2B451]/10 rounded-lg p-6 border-2 border-[#E2B451]/20">
            <p className="text-[#E2B451]/60 text-sm mb-1">Revenue (₹)</p>
            <p className="text-4xl font-bold text-[#E2B451]">
              {(stats.revenue / 100000).toFixed(1)}L
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/planner/leads')}
            className="bg-[#E2B451] hover:bg-[#E2B451]/90 transition-all p-8 rounded-lg text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#3A2563] rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#E2B451]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-[#3A2563] group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#3A2563] mb-2">Browse leads</h3>
            <p className="text-[#3A2563]/70">Find new wedding clients</p>
          </button>

          <button
            onClick={() => router.push('/planner/clients')}
            className="bg-[#E2B451] hover:bg-[#E2B451]/90 transition-all p-8 rounded-lg text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#3A2563] rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#E2B451]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-[#3A2563] group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#3A2563] mb-2">My clients</h3>
            <p className="text-[#3A2563]/70">Manage active weddings</p>
          </button>

          <button
            onClick={() => router.push('/planner/profile')}
            className="bg-[#E2B451] hover:bg-[#E2B451]/90 transition-all p-8 rounded-lg text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#3A2563] rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[#E2B451]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-[#3A2563] group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#3A2563] mb-2">My profile</h3>
            <p className="text-[#3A2563]/70">Update business info</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6">
          <h2 className="text-2xl font-bold text-[#E2B451] mb-4">Recent activity</h2>
          <div className="space-y-3">
            {[
              { text: 'New lead available: Priya & Raj', time: '2 hours ago', type: 'new' },
              { text: 'Message from Neha & Arjun', time: '5 hours ago', type: 'message' },
              { text: 'Payment received: ₹150,000', time: '1 day ago', type: 'payment' },
            ].map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-[#3A2563]/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.type === 'new'
                        ? 'bg-[#F08A3C]'
                        : activity.type === 'message'
                        ? 'bg-[#E2B451]'
                        : 'bg-[#1E4636]'
                    }`}
                  />
                  <p className="text-[#E2B451]">{activity.text}</p>
                </div>
                <p className="text-[#E2B451]/60 text-sm">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

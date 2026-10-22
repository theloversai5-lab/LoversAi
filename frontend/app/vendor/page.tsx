'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function VendorDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats] = useState({
    totalInquiries: 18,
    activeQuotes: 5,
    bookings: 2,
    revenue: 280000,
  });

  return (
    <div className="min-h-screen bg-[#1E4636]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#F08A3C]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1E4636] mb-1">
                Vendor dashboard
              </h1>
              <p className="text-[#1E4636]/70">
                Manage inquiries and bookings
              </p>
            </div>
            <button
              onClick={() => {
                useAuthStore.getState().clearAuth();
                router.push('/');
              }}
              className="px-4 py-2 bg-[#1E4636] text-[#E2B451] rounded-lg font-semibold hover:bg-[#1E4636]/90 transition-colors"
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
            <p className="text-[#E2B451]/60 text-sm mb-1">Total inquiries</p>
            <p className="text-4xl font-bold text-[#E2B451]">{stats.totalInquiries}</p>
          </div>
          <div className="bg-[#E2B451]/10 rounded-lg p-6 border-2 border-[#E2B451]/20">
            <p className="text-[#E2B451]/60 text-sm mb-1">Active quotes</p>
            <p className="text-4xl font-bold text-[#E2B451]">{stats.activeQuotes}</p>
          </div>
          <div className="bg-[#E2B451]/10 rounded-lg p-6 border-2 border-[#E2B451]/20">
            <p className="text-[#E2B451]/60 text-sm mb-1">Bookings</p>
            <p className="text-4xl font-bold text-[#E2B451]">{stats.bookings}</p>
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
            onClick={() => router.push('/vendor/inquiries')}
            className="bg-[#E2B451] hover:bg-[#E2B451]/90 transition-all p-8 rounded-lg text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#1E4636] rounded-full flex items-center justify-center">
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
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-[#1E4636] group-hover:translate-x-1 transition-transform"
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
            <h3 className="text-2xl font-bold text-[#1E4636] mb-2">View inquiries</h3>
            <p className="text-[#1E4636]/70">Respond to wedding requests</p>
          </button>

          <button
            onClick={() => router.push('/vendor/portfolio')}
            className="bg-[#E2B451] hover:bg-[#E2B451]/90 transition-all p-8 rounded-lg text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#1E4636] rounded-full flex items-center justify-center">
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-[#1E4636] group-hover:translate-x-1 transition-transform"
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
            <h3 className="text-2xl font-bold text-[#1E4636] mb-2">My portfolio</h3>
            <p className="text-[#1E4636]/70">Showcase your work</p>
          </button>

          <button
            onClick={() => router.push('/vendor/profile')}
            className="bg-[#E2B451] hover:bg-[#E2B451]/90 transition-all p-8 rounded-lg text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#1E4636] rounded-full flex items-center justify-center">
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-[#1E4636] group-hover:translate-x-1 transition-transform"
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
            <h3 className="text-2xl font-bold text-[#1E4636] mb-2">Settings</h3>
            <p className="text-[#1E4636]/70">Update business info</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6">
          <h2 className="text-2xl font-bold text-[#E2B451] mb-4">Recent activity</h2>
          <div className="space-y-3">
            {[
              { text: 'New inquiry from Priya & Siddharth', time: '1 hour ago', type: 'inquiry' },
              { text: 'Quote accepted by Neha & Arjun', time: '3 hours ago', type: 'quote' },
              { text: 'Message from Riya & Karthik', time: '1 day ago', type: 'message' },
            ].map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-[#1E4636]/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.type === 'inquiry'
                        ? 'bg-[#F08A3C]'
                        : activity.type === 'quote'
                        ? 'bg-[#E2B451]'
                        : 'bg-[#3A2563]'
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

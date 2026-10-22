'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_CLIENTS, formatBudget, formatDate, getStatusColor, getStatusLabel } from '@/lib/mock/clients';

export default function PlannerClientsPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'planning' | 'upcoming' | 'completed'>('all');

  const filteredClients = MOCK_CLIENTS.filter(
    (client) => selectedStatus === 'all' || client.status === selectedStatus
  );

  return (
    <div className="min-h-screen bg-[#3A2563]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#3A2563]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => router.push('/planner')}
                className="text-[#3A2563]/70 hover:text-[#3A2563] mb-2 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to dashboard
              </button>
              <h1 className="text-4xl font-bold text-[#3A2563] mb-2">
                My clients
              </h1>
              <p className="text-[#3A2563]/70">
                Active wedding projects
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#3A2563]/60 text-sm">Total clients</p>
              <p className="text-4xl font-bold text-[#3A2563]">{MOCK_CLIENTS.length}</p>
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex gap-3">
            {[
              { id: 'all', label: 'All clients' },
              { id: 'planning', label: 'In planning' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedStatus(filter.id as any)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedStatus === filter.id
                    ? 'bg-[#3A2563] text-[#E2B451]'
                    : 'bg-[#3A2563]/20 text-[#3A2563] hover:bg-[#3A2563]/30'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredClients.length === 0 ? (
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-12 text-center">
            <p className="text-[#E2B451] text-lg mb-4">No clients found</p>
            <button
              onClick={() => setSelectedStatus('all')}
              className="px-6 py-3 bg-[#E2B451] text-[#3A2563] rounded-lg font-semibold hover:bg-[#E2B451]/90"
            >
              Show all clients
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 overflow-hidden hover:border-[#E2B451]/40 transition-colors cursor-pointer"
                onClick={() => router.push(`/planner/clients/${client.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-[#3A2563]/20">
                        <img
                          src={client.avatar}
                          alt={client.coupleNames}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-[#E2B451] mb-1">
                          {client.coupleNames}
                        </h3>
                        <p className="text-[#E2B451]/70 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {client.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                        style={{
                          backgroundColor: `${getStatusColor(client.status)}20`,
                          color: getStatusColor(client.status),
                        }}
                      >
                        {getStatusLabel(client.status)}
                      </span>
                    </div>
                  </div>

                  {/* Wedding Date */}
                  <div className="mb-4">
                    <p className="text-[#E2B451]/60 text-sm mb-1">Wedding date</p>
                    <p className="text-[#E2B451] font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {formatDate(client.weddingDate)}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#E2B451]/60 text-sm">Planning progress</p>
                      <p className="text-[#E2B451] font-semibold">{client.progress}%</p>
                    </div>
                    <div className="h-2 bg-[#3A2563]/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F08A3C] transition-all duration-500"
                        style={{ width: `${client.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Info Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-[#E2B451]/60 text-xs mb-1">Budget</p>
                      <p className="text-[#E2B451] font-semibold">{formatBudget(client.budget)}</p>
                    </div>
                    <div>
                      <p className="text-[#E2B451]/60 text-xs mb-1">Guests</p>
                      <p className="text-[#E2B451] font-semibold">{client.guestCount}</p>
                    </div>
                    <div>
                      <p className="text-[#E2B451]/60 text-xs mb-1">Last contact</p>
                      <p className="text-[#E2B451] font-semibold">{client.lastContact}</p>
                    </div>
                  </div>

                  {/* Next Milestone */}
                  <div className="bg-[#F08A3C]/10 rounded-lg p-4 mb-4">
                    <p className="text-[#E2B451]/60 text-xs mb-1">Next milestone</p>
                    <p className="text-[#E2B451] font-semibold">{client.nextMilestone}</p>
                  </div>

                  {/* Services */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {client.services.map((service) => (
                      <span
                        key={service}
                        className="px-3 py-1 bg-[#3A2563]/20 text-[#E2B451] text-sm rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-[#E2B451]/20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/planner/clients/${client.id}`);
                      }}
                      className="flex-1 px-4 py-2 bg-[#E2B451] text-[#3A2563] rounded-lg font-semibold hover:bg-[#E2B451]/90 transition-colors"
                    >
                      View details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/planner/clients/${client.id}/message`);
                      }}
                      className="px-4 py-2 bg-[#3A2563]/20 text-[#E2B451] rounded-lg font-semibold hover:bg-[#3A2563]/30 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Message
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Inquiry {
  id: string;
  coupleNames: string;
  weddingDate: string;
  location: string;
  budget: number;
  guestCount: number;
  message: string;
  status: 'new' | 'quoted' | 'accepted' | 'declined';
  receivedDate: string;
}

const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: 'inq1',
    coupleNames: 'Priya & Siddharth',
    weddingDate: '2026-12-14',
    location: 'Udaipur, Rajasthan',
    budget: 3500000,
    guestCount: 350,
    message: 'We loved your portfolio! Looking for full day coverage including pre-wedding shoot.',
    status: 'new',
    receivedDate: '1 hour ago',
  },
  {
    id: 'inq2',
    coupleNames: 'Rhea & Kabir',
    weddingDate: '2026-11-28',
    location: 'Alibaug, Maharashtra',
    budget: 2200000,
    guestCount: 200,
    message: 'Daytime garden wedding. Need photographer with experience in natural light photography.',
    status: 'quoted',
    receivedDate: '2 days ago',
  },
  {
    id: 'inq3',
    coupleNames: 'Meera & Arjun',
    weddingDate: '2027-01-18',
    location: 'Jaipur, Rajasthan',
    budget: 5000000,
    guestCount: 400,
    message: 'Royal palace wedding. Multi-day event requiring comprehensive coverage.',
    status: 'accepted',
    receivedDate: '5 days ago',
  },
];

export default function VendorInquiriesPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'new' | 'quoted' | 'accepted' | 'declined'>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');

  const filteredInquiries = MOCK_INQUIRIES.filter(
    (inquiry) => selectedStatus === 'all' || inquiry.status === selectedStatus
  );

  const getStatusBadge = (status: Inquiry['status']) => {
    const styles = {
      new: 'bg-[#F08A3C] text-[#1E4636]',
      quoted: 'bg-[#E2B451] text-[#1E4636]',
      accepted: 'bg-[#1E4636] text-[#E2B451]',
      declined: 'bg-[#E2B451]/20 text-[#E2B451]',
    };
    const labels = {
      new: 'New',
      quoted: 'Quoted',
      accepted: 'Accepted',
      declined: 'Declined',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#1E4636]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#F08A3C]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/vendor')}
            className="text-[#1E4636]/70 hover:text-[#1E4636] mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </button>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[#1E4636] mb-2">
                Inquiries
              </h1>
              <p className="text-[#1E4636]/70">
                Wedding requests from couples
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#1E4636]/60 text-sm">Total inquiries</p>
              <p className="text-4xl font-bold text-[#1E4636]">{MOCK_INQUIRIES.length}</p>
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex gap-3">
            {[
              { id: 'all', label: 'All' },
              { id: 'new', label: 'New' },
              { id: 'quoted', label: 'Quoted' },
              { id: 'accepted', label: 'Accepted' },
              { id: 'declined', label: 'Declined' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedStatus(filter.id as any)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedStatus === filter.id
                    ? 'bg-[#1E4636] text-[#E2B451]'
                    : 'bg-[#1E4636]/20 text-[#1E4636] hover:bg-[#1E4636]/30'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredInquiries.length === 0 ? (
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-12 text-center">
            <p className="text-[#E2B451] text-lg mb-4">No inquiries found</p>
            <button
              onClick={() => setSelectedStatus('all')}
              className="px-6 py-3 bg-[#E2B451] text-[#1E4636] rounded-lg font-semibold hover:bg-[#E2B451]/90"
            >
              Show all inquiries
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6 hover:border-[#E2B451]/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-[#E2B451] mb-1">
                      {inquiry.coupleNames}
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
                      {inquiry.location}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(inquiry.status)}
                    <p className="text-[#E2B451]/60 text-sm mt-2">{inquiry.receivedDate}</p>
                  </div>
                </div>

                {/* Wedding Details */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-[#E2B451]/60 text-xs mb-1">Wedding date</p>
                    <p className="text-[#E2B451] font-semibold">
                      {new Date(inquiry.weddingDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#E2B451]/60 text-xs mb-1">Budget</p>
                    <p className="text-[#E2B451] font-semibold">
                      ₹{(inquiry.budget / 100000).toFixed(1)}L
                    </p>
                  </div>
                  <div>
                    <p className="text-[#E2B451]/60 text-xs mb-1">Guests</p>
                    <p className="text-[#E2B451] font-semibold">{inquiry.guestCount}</p>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-[#1E4636]/20 rounded-lg p-4 mb-4">
                  <p className="text-[#E2B451]/60 text-xs mb-2">Message from couple</p>
                  <p className="text-[#E2B451]">{inquiry.message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {inquiry.status === 'new' && (
                    <>
                      <button
                        onClick={() => setSelectedInquiry(inquiry)}
                        className="flex-1 px-4 py-3 bg-[#E2B451] text-[#1E4636] rounded-lg font-semibold hover:bg-[#E2B451]/90 transition-colors"
                      >
                        Send quote
                      </button>
                      <button className="px-4 py-3 bg-[#E2B451]/20 text-[#E2B451] rounded-lg font-semibold hover:bg-[#E2B451]/30 transition-colors flex items-center gap-2">
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
                    </>
                  )}
                  {inquiry.status === 'quoted' && (
                    <button className="flex-1 px-4 py-3 bg-[#E2B451]/20 text-[#E2B451] rounded-lg font-semibold">
                      Waiting for response
                    </button>
                  )}
                  {inquiry.status === 'accepted' && (
                    <button className="flex-1 px-4 py-3 bg-[#1E4636]/50 text-[#E2B451] rounded-lg font-semibold">
                      Quote accepted ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-[#1E4636] border-4 border-[#E2B451] rounded-lg max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-4">Send quote</h2>
            <p className="text-[#E2B451]/80 mb-6">
              Sending quote to {selectedInquiry.coupleNames}
            </p>
            
            <div className="mb-6">
              <label className="block text-[#E2B451] font-semibold mb-2">
                Quote amount (₹)
              </label>
              <input
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="75000"
                className="w-full px-4 py-3 bg-[#E2B451]/10 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedInquiry(null);
                  setQuoteAmount('');
                }}
                className="flex-1 px-4 py-3 bg-[#E2B451]/20 text-[#E2B451] rounded-lg font-semibold hover:bg-[#E2B451]/30"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Mock send quote
                  setSelectedInquiry(null);
                  setQuoteAmount('');
                }}
                disabled={!quoteAmount}
                className="flex-1 px-4 py-3 bg-[#E2B451] text-[#1E4636] rounded-lg font-semibold hover:bg-[#E2B451]/90 disabled:opacity-50"
              >
                Send quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

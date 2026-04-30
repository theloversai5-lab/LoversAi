import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quoteAPI, vendorAPI } from '../../api/api';

export default function PlannerBuildQuote() {
  const { bidId } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quotedMessage, setQuotedMessage] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await quoteAPI.getById(bidId);
        if (data.success) {
          setQuote(data.quote);
          // Pre-fill budget info
          const budget = data.quote.eventDetails?.budget;
          if (budget) {
            const num = parseInt(String(budget).replace(/[^0-9]/g, ''));
            if (!isNaN(num)) setQuotedPrice(String(num));
          }
        } else {
          setError('Quote not found');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load quote details');
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [bidId]);

  const formatCurrency = (amount) => {
    const num = parseInt(amount);
    if (isNaN(num)) return '—';
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
    return `₹${num}`;
  };

  const handleSendQuote = async () => {
    if (!quotedPrice || parseInt(quotedPrice) <= 0) {
      setError('Please enter a valid quote amount');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = await quoteAPI.respond(bidId, {
        quotedPrice: parseInt(quotedPrice),
        quotedMessage: quotedMessage.trim(),
      });

      if (data.success) {
        setSubmitSuccess(true);
        setShowConfirm(false);
        setTimeout(() => navigate('/planner/quotes'), 2000);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to submit quote';
      setError(errMsg);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-loverai-gold/30 border-t-loverai-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => navigate('/planner/bids')} className="text-loverai-gold hover:underline">
          ← Back to Leads
        </button>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="text-center animate-fadeInUp">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-heading loverai-gradient-text mb-3">Quote Sent!</h2>
          <p className="text-white/50 text-sm">The couple has been notified. Redirecting...</p>
        </div>
      </div>
    );
  }

  const coupleName = quote?.couple?.fullName || 'Couple';
  const city = quote?.eventDetails?.city || 'TBD';
  const budget = quote?.eventDetails?.budget || '—';
  const guestCount = quote?.eventDetails?.guestCount || '—';
  const tradition = quote?.eventDetails?.tradition || '';
  const notes = quote?.eventDetails?.notes || '';
  const primaryImage = quote?.images?.[0]?.url || '/images/planner.png';

  // Calculate moodboard expiry
  const moodboardExpiry = quote?.moodboardExpiresAt ? new Date(quote.moodboardExpiresAt) : null;
  const isExpired = moodboardExpiry && new Date() > moodboardExpiry;
  const daysLeft = moodboardExpiry ? Math.max(0, Math.ceil((moodboardExpiry - new Date()) / (1000 * 60 * 60 * 24))) : null;

  return (
    <div className="max-w-6xl mx-auto animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/planner/bids')} className="p-2 text-gray-400 hover:text-amber-400 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white heading-font">Build Quote</h1>
          <p className="text-gray-500 text-sm">For {coupleName} · {city}</p>
        </div>
      </div>

      {/* Expired Banner */}
      {isExpired && (
        <div className="rounded-xl p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          ⚠️ This moodboard has expired. The couple needs to regenerate their vision before you can quote.
        </div>
      )}

      {/* Moodboard Expiry Indicator */}
      {!isExpired && daysLeft !== null && (
        <div className="rounded-xl p-3 mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Moodboard valid for {daysLeft} more day{daysLeft !== 1 ? 's' : ''}
        </div>
      )}

      {/* Bid Summary Card */}
      <div
        className="rounded-xl p-4 mb-6 flex flex-col lg:flex-row gap-4"
        style={{
          background: 'linear-gradient(152.97deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(225,195,135,0.08)',
        }}
      >
        <img src={primaryImage} alt="preview" className="w-full lg:w-32 h-24 rounded-lg object-cover" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-white font-semibold text-[16px]">{coupleName}</span>
            <span className="text-amber-400 text-[13px]">Budget: {budget}</span>
          </div>
          <p className="text-gray-500 text-[12px] mb-1">{city} {tradition ? `· ${tradition}` : ''} · {guestCount} guests</p>
          {notes && <p className="text-gray-400 text-[13px] italic">"{notes}"</p>}
        </div>
        {/* All vision images */}
        {quote?.images?.length > 1 && (
          <div className="flex gap-2 flex-shrink-0">
            {quote.images.slice(0, 4).map((img, i) => (
              <img key={i} src={img.url} alt={`Vision ${i+1}`} className="w-16 h-16 rounded-lg object-cover border border-white/10" />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Quote Details */}
        <div className="flex-1 space-y-4">
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-white font-semibold text-[16px] mb-4">Your Quote</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-white/50 text-xs mb-1.5">Quoted Price (₹)</label>
                <input
                  type="number"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(e.target.value)}
                  placeholder="e.g. 1500000"
                  className="w-full glass-input rounded-lg px-4 py-3 text-sm text-white"
                />
                {quotedPrice && (
                  <p className="text-loverai-gold text-xs mt-1.5">{formatCurrency(quotedPrice)}</p>
                )}
              </div>

              <div>
                <label className="block text-white/50 text-xs mb-1.5">Message to Couple</label>
                <textarea
                  value={quotedMessage}
                  onChange={(e) => setQuotedMessage(e.target.value)}
                  placeholder="Describe what's included, your experience with similar weddings, etc."
                  rows={4}
                  className="w-full glass-input rounded-lg px-4 py-3 text-sm text-white resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="glass-card-subtle rounded-lg p-3 text-xs text-white/40 flex items-start gap-2">
                <svg className="w-4 h-4 text-loverai-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p>Submitting a quote costs <strong className="text-loverai-gold">5 credits</strong>. Credits will be deducted upon submission.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Submit Panel */}
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <div
            className="rounded-xl p-5 sticky top-20"
            style={{
              background: 'linear-gradient(152.97deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(225,195,135,0.08)',
            }}
          >
            <h2 className="text-white font-semibold text-[16px] mb-4">Quote Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Couple</span>
                <span className="text-white">{coupleName}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Location</span>
                <span className="text-white">{city}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Budget</span>
                <span className="text-white">{budget}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Your Quote</span>
                <span className="text-amber-400 font-medium">{quotedPrice ? formatCurrency(quotedPrice) : '—'}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Credit Cost</span>
                <span className="text-white">5 credits</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!quotedPrice || parseInt(quotedPrice) <= 0 || isExpired || submitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400"
            >
              {submitting ? 'Sending...' : 'Send Quote to Couple'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 max-w-md w-full"
            style={{
              background: 'linear-gradient(152.97deg, rgba(40,30,15,0.98) 0%, rgba(25,18,10,0.99) 100%)',
              border: '1px solid rgba(225,195,135,0.15)',
            }}
          >
            <h3 className="text-white font-bold text-lg mb-2">Confirm Quote Submission</h3>
            <p className="text-gray-400 text-sm mb-4">
              This will send a quote of <strong className="text-amber-400">{formatCurrency(quotedPrice)}</strong> to <strong className="text-amber-400">{coupleName}</strong>.
              <br /><span className="text-white/40 text-xs">5 credits will be deducted from your account.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendQuote}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 transition disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { quoteAPI, chatAPI } from '../../api/api';
import { io } from 'socket.io-client';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const stepsMap = [
  { label: "Bid Placed", key: "pending" },
  { label: "Vendor Review", key: "viewed" },
  { label: "Quotation Received", key: "quoted" },
  { label: "Booking Complete", key: "accepted" },
];

const getStepStatus = (currentStatus, stepKey) => {
  const statusOrder = ['pending', 'viewed', 'quoted', 'accepted', 'rejected', 'expired'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const stepIndex = statusOrder.indexOf(stepKey);

  if (currentStatus === 'rejected' || currentStatus === 'expired') {
    if (stepIndex > 1) return 'pending';
    return stepIndex <= currentIndex ? 'done' : 'pending';
  }

  if (currentIndex > stepIndex) return 'done';
  if (currentIndex === stepIndex) return 'active';
  return 'pending';
};

const CoupleBidProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await quoteAPI.getById(id);
        if (data.success) {
          setQuote(data.quote);
        } else {
          setError('Failed to load bid details');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'An error occurred fetching the bid');
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [id]);

  // Socket.io real-time listener for quote updates
  useEffect(() => {
    if (!currentUser?.id) return;

    const socket = io(apiBaseUrl, { transports: ['websocket', 'polling'] });
    socket.emit('join', currentUser.id);

    socket.on('quote_update', (data) => {
      if (data.quoteId === id) {
        // Re-fetch the quote to get full updated data
        quoteAPI.getById(id).then((res) => {
          if (res.success) setQuote(res.quote);
        });
      }
    });

    return () => {
      socket.off('quote_update');
      socket.disconnect();
    };
  }, [currentUser?.id, id]);

  const handleAccept = async (plannerId) => {
    setActionLoading(`accept_${plannerId}`);
    try {
      const data = await quoteAPI.accept(id, { plannerId });
      if (data.success) setQuote(data.quote);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept quote');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (plannerId) => {
    setActionLoading(`reject_${plannerId}`);
    try {
      const data = await quoteAPI.reject(id, { plannerId });
      if (data.success) setQuote(data.quote);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject quote');
    } finally {
      setActionLoading('');
    }
  };

  const handleChat = async (plannerId) => {
    if (!plannerId) return;
    try {
      await chatAPI.createRoom({ participantId: plannerId, quoteId: quote._id });
      // Navigate straight to the new Profile/Dashboard which holds the messages natively
      navigate('/profile', { state: { activeTab: 'messages' } });
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen loverai-page-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-loverai-gold/30 border-t-loverai-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen loverai-page-bg flex flex-col items-center justify-center text-center p-6">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl text-white mb-2 font-heading">Bid Not Found</h2>
        <p className="text-white/50 mb-6">{error}</p>
        <button onClick={() => navigate('/couple/profile')} className="loverai-btn-primary !rounded-xl">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen loverai-page-bg pt-24 px-4 sm:px-8 pb-12">
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 py-6 border-b border-white/10 mb-8">
          <button 
            onClick={() => navigate('/couple/profile')}
            className="w-10 h-10 rounded-full glass-card hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-loverai-gold transition-colors"
          >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-loverai-gold">Bid Progress</h1>
            <p className="text-white/40 text-sm mt-1">ID: {quote._id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Timeline Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-3xl p-8 sm:p-12">
              <div className="space-y-0 relative pl-4">
                {/* Timeline base line */}
                <div className="absolute left-8 top-8 bottom-8 w-[2px] bg-white/5"></div>

                {stepsMap.map((step, i) => {
                  const status = getStepStatus(quote.status, step.key);
                  return (
                    <div key={step.label} className="relative flex gap-6 pb-12 last:pb-0">
                      
                      {/* Icon */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                          status === "done" 
                            ? "bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-emerald-500/30" 
                            : status === "active" 
                            ? "bg-gradient-to-br from-loverai-gold to-loverai-gold-bright text-black shadow-loverai-gold/40 animate-pulse" 
                            : "bg-white/5 border border-white/10 text-white/20"
                        }`}>
                          {status === "done" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : status === "active" ? (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="pt-2">
                        <p className={`font-semibold tracking-wide ${
                          status === "done" ? "text-emerald-400" :
                          status === "active" ? "loverai-gradient-text" :
                          "text-white/30"
                        }`}>
                          {step.label}
                        </p>
                        
                        {/* Status specific sub-texts and actions */}
                        {status === "active" && step.key === "pending" && (
                           <p className="text-xs text-white/50 mt-1.5 opacity-80 animate-fade-in">Finding the perfect planners for your vision...</p>
                        )}
                        {status === "active" && step.key === "viewed" && (
                           <p className="text-xs text-loverai-gold/80 mt-1.5 opacity-80 animate-fade-in">Planners are reviewing your request and preparing quotes.</p>
                        )}
                        {status === "active" && step.key === "quoted" && quote.responses && quote.responses.length > 0 && (
                          <div className="mt-4 flex flex-col gap-4 w-full">
                            <p className="text-sm text-loverai-gold font-medium mb-1">
                               {quote.responses.length} Planner{quote.responses.length !== 1 ? 's have' : ' has'} bid on your vision!
                            </p>
                            {quote.responses.map((resp, idx) => (
                               <div key={resp._id || idx} className="bg-white/[0.04] rounded-2xl p-4 border border-white/10 flex flex-col gap-3 transition hover:bg-white/[0.08]">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-loverai-gold to-yellow-600 flex items-center justify-center text-black font-bold uppercase shadow-lg shadow-loverai-gold/20 flex-shrink-0">
                                         {resp.planner?.avatar ? <img src={resp.planner.avatar} className="w-full h-full object-cover rounded-full" alt="" /> : (resp.planner?.fullName || resp.planner?.company_name || 'P')[0]}
                                       </div>
                                       <div>
                                          <p className="text-sm text-white font-semibold flex items-center gap-2">
                                            {resp.planner?.fullName || resp.planner?.company_name || 'Planner'}
                                            {resp.status === 'rejected' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase">Rejected</span>}
                                          </p>
                                          <button onClick={() => window.open(`/planner/profile/${resp.planner?._id}`, '_blank')} className="text-[10px] text-loverai-gold/70 hover:text-loverai-gold transition-colors underline underline-offset-2">View Portfolio</button>
                                       </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                       <p className="text-lg font-bold text-loverai-gold tracking-tight">₹{resp.quotedPrice?.toLocaleString()}</p>
                                       <p className="text-[9px] text-white/30 uppercase mt-0.5">{new Date(resp.createdAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  
                                  {resp.quotedMessage && (
                                    <div className="relative mt-2 p-3 bg-black/40 rounded-xl border border-white/5">
                                      <svg className="absolute -top-2 left-4 w-4 h-4 text-white/5" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                                      <p className="text-[11px] text-white/70 italic pl-6 leading-relaxed relative z-10">"{resp.quotedMessage}"</p>
                                    </div>
                                  )}

                                  {resp.status === 'pending' && (
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => handleChat(resp.planner._id)}
                                        className="flex-1 bg-white/10 text-white rounded-lg py-2 text-xs font-semibold hover:bg-white/20 transition-colors border border-white/5"
                                      >
                                        💬 Message
                                      </button>
                                      <button
                                        onClick={() => handleAccept(resp.planner._id)}
                                        disabled={actionLoading}
                                        className="flex-1 bg-gradient-to-r from-loverai-gold to-yellow-600 text-black rounded-lg py-2 text-xs font-bold hover:brightness-110 shadow-lg shadow-loverai-gold/20 transition-all disabled:opacity-50"
                                      >
                                        {actionLoading === `accept_${resp.planner._id}` ? '...' : 'Accept Proposal'}
                                      </button>
                                      <button
                                        onClick={() => handleReject(resp.planner._id)}
                                        disabled={actionLoading}
                                        className="px-3 bg-red-500/10 text-red-500 rounded-lg py-2 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50 border border-red-500/20 flex items-center justify-center font-bold"
                                        title="Decline this proposal"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                               </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Accepted state — show chat option */}
                        {status === "done" && step.key === "accepted" && quote.status === "accepted" && quote.hiredPlanner && (
                           <div className="mt-2 bg-gradient-to-r from-emerald-500/10 to-green-500/5 border border-emerald-500/20 p-4 rounded-xl">
                             <p className="text-xs text-emerald-400/90 mb-3 font-medium">🎉 Booking confirmed with {quote.hiredPlanner?.fullName || quote.hiredPlanner?.company_name}!</p>
                             <button
                               onClick={() => handleChat(quote.hiredPlanner._id)}
                               className="text-xs px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-2 font-semibold"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                               Open Chat
                             </button>
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Handling for Rejected / Expired */}
              {(quote.status === 'rejected' || quote.status === 'expired') && (
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <h3 className="text-red-400 font-semibold">Bid {quote.status === 'expired' ? 'Expired' : 'Rejected'}</h3>
                  <p className="text-xs text-white/40 mt-1">Unfortunately, this request could not be fulfilled at this time.</p>
                </div>
              )}
            </div>
          </div>

          {/* Vision Details Column */}
          <div className="space-y-4">
            <h3 className="text-sm font-heading tracking-widest text-white/40 uppercase mb-2">Request Overview</h3>
            
            {/* Embedded Vision Images */}
            {quote.images && quote.images.length > 0 && (
               <div className="glass-card rounded-2xl p-4 overflow-hidden relative">
                 <img 
                   src={quote.images[0].url} 
                   alt="Primary Vision" 
                   className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10"
                 />
                 <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white font-medium flex items-center gap-2">
                   <svg className="w-3.5 h-3.5 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   {quote.images.length} Vision{quote.images.length !== 1 ? 's' : ''}
                 </div>
               </div>
            )}

            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-light pb-3">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">Budget</span>
                <span className="text-white font-medium">{quote.eventDetails?.budget || 'Flexible'}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-light pb-3">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">Location</span>
                <span className="text-white font-medium">{quote.eventDetails?.city || 'TBD'}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-light pb-3">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">Guests</span>
                <span className="text-white font-medium">{quote.eventDetails?.guestCount || 'TBD'}</span>
              </div>
              <div className="flex flex-col gap-1 text-sm pt-1">
                <span className="text-white/40 uppercase tracking-widest text-[10px]">Any special notes</span>
                <p className="text-white/70 text-xs italic">
                  {quote.eventDetails?.notes ? `"${quote.eventDetails.notes}"` : 'None specified.'}
                </p>
              </div>
            </div>

            <div className="glass-card-subtle p-4 rounded-xl flex items-start gap-4 text-xs text-white/50">
               <svg className="w-5 h-5 text-loverai-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p>Your contact details remain hidden from planners until you choose to accept a proposal.</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoupleBidProgress;

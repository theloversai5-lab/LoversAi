import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { quoteAPI, chatAPI, userAPI, paymentAPI } from '../../api/api';

const CoupleProfile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'overview');
  const [quotes, setQuotes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('Free');
  const [loading, setLoading] = useState(true);

  // Dynamic premium fonts injection
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quoteRes, chatRes, paymentRes] = await Promise.all([
          quoteAPI.getMyQuotes().catch(() => ({ quotes: [] })),
          chatAPI.getRooms().catch(() => ({ rooms: [] })),
          paymentAPI.getPaymentStatus().catch(() => ({}))
        ]);
        
        if (quoteRes.success) setQuotes(quoteRes.quotes);
        if (chatRes.success) {
           // format recent messages
           const rms = chatRes.rooms.filter(r => r.lastMessage).map(r => {
              const other = r.participants?.find(p => p._id !== currentUser.id) || {};
              return {
                 id: r._id,
                 sender: other.fullName || other.company_name || 'Planner',
                 content: r.lastMessage.content,
                 timestamp: new Date(r.lastMessage.timestamp),
                 avatar: other.avatar,
                 plannerId: other._id
              };
           }).sort((a,b) => b.timestamp - a.timestamp);
           setMessages(rms);
        }
        if (paymentRes.success) {
           setCredits(paymentRes.user?.credits || 0);
           setPlan(paymentRes.subscription?.plan || 'Free');
        }
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const wp = currentUser?.weddingProfile || {};
  const initials = `${wp.partnerName1?.[0] || 'P'}&${wp.partnerName2?.[0] || 'A'}`;
  const coupleName = (wp.partnerName1 && wp.partnerName2) ? `${wp.partnerName1} & ${wp.partnerName2}` : currentUser?.fullName || 'Couple';

  const bidCounts = {
    accepted: quotes.filter(q => q.status === 'accepted').length,
    pending: quotes.filter(q => q.status === 'pending' || q.status === 'viewed' || q.status === 'quoted').length,
    rejected: quotes.filter(q => q.status === 'rejected' || q.status === 'expired').length,
  };

  const navs = [
    { id: 'overview', label: 'Overview' },
    { id: 'bids', label: `Bids (${quotes.length})` },
    { id: 'messages', label: `Messages`, badge: messages.length > 0 ? messages.length : null },
    { id: 'settings', label: 'Settings' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative font-sans">
        <div
          className="absolute inset-0 bg-cover bg-center -z-20"
          style={{
            backgroundImage: 'url("/images/signup.png")',
            filter: "brightness(0.7) contrast(1.05)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-[#0c0806] -z-10" />
        <div className="w-10 h-10 border-4 border-[#e6c6b2]/30 border-t-[#e6c6b2] rounded-full animate-spin"></div>
      </div>
    );
  }

  const serif = { fontFamily: "'Cormorant Garamond', serif" };

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden font-sans pb-24">
      {/* Background Image Setup matching Moodboard & Cart */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-20 animate-scaleIn"
        style={{
          backgroundImage: 'url("/images/signup.png")',
          filter: "brightness(0.75) contrast(1.05)",
          backgroundAttachment: "fixed",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0a0604] -z-10" />

      {/* Header Profile Section */}
      <div className="pt-32 pb-8 px-6">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-white">
            {/* Initials Circle */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#e6c6b2] to-amber-700 flex items-center justify-center text-[#201913] font-serif text-3xl font-bold tracking-widest shrink-0 shadow-[0_10px_30px_rgba(230,198,178,0.25)] border border-[#e6c6b2]/30 animate-fadeIn">
               {initials}
            </div>
            
            <div className="flex-1 text-center md:text-left">
               <h1 style={serif} className="text-3.5xl md:text-5xl font-semibold tracking-wide mb-3 text-white">
                 {coupleName}
               </h1>
               <div className="flex flex-wrap gap-2 text-white/70 text-[10px] md:text-[11px] tracking-wider uppercase justify-center md:justify-start">
                 {currentUser?.email && (
                   <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                     ✉ {currentUser.email}
                   </span>
                 )}
                 {currentUser?.phone && (
                   <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                     📞 {currentUser.phone}
                   </span>
                 )}
                 {(wp.city || wp.location) && (
                   <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-[#e6c6b2]/20 text-[#e6c6b2] backdrop-blur-md">
                     📍 {wp.city || wp.location}
                   </span>
                 )}
                 {wp.weddingDate && (
                   <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-[#e6c6b2]/20 text-[#e6c6b2] backdrop-blur-md">
                     📅 {new Date(wp.weddingDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                   </span>
                 )}
               </div>
            </div>
            
            <div className="flex flex-wrap gap-3 shrink-0 mt-6 md:mt-0 justify-center">
               <button 
                 onClick={() => navigate('/pricing')} 
                 className="px-6 py-3 rounded-full bg-gradient-to-r from-[#e6c6b2] to-[#dfb479] text-[#1a0f08] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_8px_24px_rgba(230,198,178,0.2)] uppercase tracking-wider flex items-center gap-1.5"
               >
                 👑 Subscriptions
               </button>
               <button 
                 onClick={() => navigate('/user-form')} 
                 className="px-6 py-3 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white text-xs font-bold hover:bg-white/10 active:scale-95 transition-all uppercase tracking-wider"
               >
                 Edit Profile
               </button>
            </div>
         </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-6">
         {/* Navigation Tabs */}
         <div className="inline-flex bg-white/5 p-1 rounded-full border border-white/10 mb-8 backdrop-blur-md">
            {navs.map(nav => (
               <button
                 key={nav.id}
                 onClick={() => setActiveTab(nav.id)}
                 className={`relative px-5 py-2 md:px-6 md:py-2.5 rounded-full text-[10px] md:text-xs uppercase tracking-wider font-bold transition-all duration-300 ${
                   activeTab === nav.id 
                     ? 'bg-[#e6c6b2] text-black shadow-md font-extrabold' 
                     : 'text-white/60 hover:text-white hover:bg-white/5'
                 }`}
               >
                 {nav.label}
                 {nav.badge && (
                   <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${
                     activeTab === nav.id 
                       ? 'bg-black text-[#e6c6b2]' 
                       : 'bg-[#e6c6b2] text-black animate-pulse'
                   }`}>
                     {nav.badge}
                   </span>
                 )}
               </button>
            ))}
         </div>

         {/* Overview Tab Content */}
         {activeTab === 'overview' && (
           <div className="space-y-6">
              {/* Credits Row */}
              <div className="bg-gradient-to-r from-[#201915]/80 via-[#16100d]/90 to-[#201915]/80 backdrop-blur-md rounded-[20px] border border-[#e6c6b2]/15 p-6 flex flex-col sm:flex-row items-center justify-between text-white gap-4 shadow-[0_15px_35px_rgba(0,0,0,0.3)] hover:border-[#e6c6b2]/25 transition-all duration-300">
                 <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                    <div className="w-12 h-12 rounded-full bg-[#e6c6b2]/10 border border-[#e6c6b2]/20 flex items-center justify-center text-[#e6c6b2] text-xl shadow-inner">✨</div>
                    <div>
                       <p className="font-semibold text-lg text-[#F9F7F5]">Lover's Credits: <span className="text-[#e6c6b2] font-black">{credits.toLocaleString()}</span></p>
                       <p className="text-white/55 text-xs uppercase tracking-wider mt-0.5">Current Plan: <span className="text-[#e6c6b2] font-bold">{plan}</span></p>
                    </div>
                 </div>
                 <button 
                   onClick={() => navigate('/pricing')} 
                   style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }} 
                   className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-full hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(225,195,135,0.25)] uppercase tracking-wider"
                 >
                   Manage Plan
                 </button>
              </div>

              {/* Grid: Bids & Messages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Bid Summary */}
                 <div className="rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] hover:border-[#e6c6b2]/20 transition-all duration-300 flex flex-col text-white">
                    <h3 style={serif} className="text-2xl font-semibold text-[#F9F7F5] mb-6 tracking-wide border-b border-white/5 pb-3">Bid Summary</h3>
                    <div className="space-y-4 flex-1">
                       <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                         <span className="flex items-center gap-2.5 text-sm text-white/80"><span className="text-green-500 font-bold">✓</span> Accepted</span>
                         <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">{bidCounts.accepted}</span>
                       </div>
                       <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                         <span className="flex items-center gap-2.5 text-sm text-white/80"><span className="text-yellow-500 font-bold">⏳</span> Pending</span>
                         <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-bold">{bidCounts.pending}</span>
                       </div>
                       <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                         <span className="flex items-center gap-2.5 text-sm text-white/80"><span className="text-red-500 font-bold">✕</span> Rejected</span>
                         <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">{bidCounts.rejected}</span>
                       </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('bids')} 
                      className="mt-6 text-[#e6c6b2] text-xs font-bold uppercase tracking-wider hover:underline flex items-center justify-between w-full border-t border-white/10 pt-4"
                    >
                       View all bids <span className="text-base">→</span>
                    </button>
                 </div>

                 {/* Recent Messages */}
                 <div className="rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] hover:border-[#e6c6b2]/20 transition-all duration-300 flex flex-col text-white">
                    <h3 style={serif} className="text-2xl font-semibold text-[#F9F7F5] mb-6 tracking-wide border-b border-white/5 pb-3">Recent Messages</h3>
                    <div className="space-y-4 flex-1">
                       {messages.slice(0, 3).map((msg, i) => (
                          <div key={i} className="flex gap-3.5 items-center py-2.5 border-b border-white/[0.04] last:border-b-0">
                             <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-[#e6c6b2] shrink-0 overflow-hidden shadow-md">
                                {msg.avatar ? <img src={msg.avatar} alt="" className="w-full h-full object-cover" /> : msg.sender[0].toUpperCase()}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                   <p className="text-sm font-semibold text-white truncate">{msg.sender}</p>
                                   <p className="text-[10px] text-white/40 font-medium">{msg.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                </div>
                                <p className="text-xs text-white/50 truncate pr-4 leading-normal">{msg.content}</p>
                             </div>
                          </div>
                       ))}
                       {messages.length === 0 && (
                          <p className="text-white/30 text-sm italic py-4">No recent messages from planners.</p>
                       )}
                    </div>
                    <button 
                      onClick={() => setActiveTab('messages')} 
                      className="mt-6 text-[#e6c6b2] text-xs font-bold uppercase tracking-wider hover:underline flex items-center justify-between w-full border-t border-white/10 pt-4"
                    >
                       View all messages <span className="text-base">→</span>
                    </button>
                 </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-8">
                 <h3 style={serif} className="text-3xl font-semibold text-[#F9F7F5] mb-5 tracking-wide">Quick Actions</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                      onClick={() => navigate('/couples')} 
                      className="px-5 py-4 rounded-[16px] border border-white/10 bg-white/5 hover:bg-[#e6c6b2]/10 hover:border-[#e6c6b2]/40 text-white/80 hover:text-[#e6c6b2] text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                    >
                       👤 Dashboard
                    </button>
                    <button 
                      onClick={() => navigate('/love-story')} 
                      className="px-5 py-4 rounded-[16px] border border-white/10 bg-white/5 hover:bg-[#e6c6b2]/10 hover:border-[#e6c6b2]/40 text-white/80 hover:text-[#e6c6b2] text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                    >
                       🎨 GenAI Vision
                    </button>
                    <button 
                      onClick={() => navigate('/couple/cart')} 
                      className="px-5 py-4 rounded-[16px] border border-white/10 bg-white/5 hover:bg-[#e6c6b2]/10 hover:border-[#e6c6b2]/40 text-white/80 hover:text-[#e6c6b2] text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                    >
                       🛒 My Cart
                    </button>
                    <button 
                      onClick={() => setActiveTab('bids')} 
                      style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }} 
                      className="px-5 py-4 rounded-[16px] text-xs transition flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(225,195,135,0.3)] font-bold uppercase tracking-wider active:scale-95 transition-all"
                    >
                       📍 Track Bids
                    </button>
                 </div>
              </div>
           </div>
         )}

         {/* Bids Tab Content */}
         {activeTab === 'bids' && (
           <div className="space-y-4 max-w-4xl">
              <h2 style={serif} className="text-3xl font-semibold mb-6">Your Quote Requests</h2>
              {quotes.length === 0 ? (
                 <p className="text-white/40 italic">You have not submitted any visions for quoting yet.</p>
              ) : (
                 <div className="grid gap-4">
                   {quotes.map(q => (
                      <div 
                        key={q._id} 
                        onClick={() => navigate(`/couple/quote/${q._id}`)} 
                        className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-[#1e1713]/70 hover:border-[#e6c6b2]/30 transition-all duration-300 cursor-pointer flex justify-between items-center shadow-md animate-fadeIn"
                      >
                         <div className="flex items-center gap-4">
                            {q.images?.[0]?.url ? (
                              <img src={q.images[0].url} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#e6c6b2] text-xl font-bold font-serif">✨</div>
                            )}
                            <div>
                               <p className="text-base font-semibold text-white">{q.eventDetails?.city || 'Undecided Location'}</p>
                               <p className="text-xs text-white/50 mt-1">{q.responses?.length || 0} planner responses • Submitted {new Date(q.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold 
                               ${q.status === 'accepted' ? 'bg-green-500/20 text-green-400' : q.status === 'pending' || q.status === 'quoted' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                               {q.status}
                            </span>
                            <span className="text-white/20 text-lg">›</span>
                         </div>
                      </div>
                   ))}
                 </div>
              )}
           </div>
         )}

         {/* Messages Tab Content */}
         {activeTab === 'messages' && (
           <div className="space-y-4 max-w-4xl">
              <h2 style={serif} className="text-3xl font-semibold mb-6">Messages from Planners</h2>
              {messages.length === 0 ? (
                 <p className="text-white/40 italic">No messages yet. Planners will contact you here once they bid.</p>
              ) : (
                 <div className="grid gap-4">
                   {messages.map(msg => (
                      <div 
                        key={msg.id} 
                        onClick={() => navigate(`/couple/quote/${msg.id}`)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-[#1e1713]/70 hover:border-[#e6c6b2]/30 transition-all duration-300 cursor-pointer flex justify-between items-center shadow-md animate-fadeIn"
                      >
                         <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-full border border-loverai-gold/30 flex items-center justify-center text-[#e6c6b2] overflow-hidden bg-white/5 shadow-inner">
                               {msg.avatar ? <img src={msg.avatar} alt="" className="w-full h-full object-cover" /> : msg.sender[0]}
                            </div>
                            <div>
                               <p className="text-base font-semibold text-[#e6c6b2]">{msg.sender}</p>
                               <p className="text-sm text-white/70 truncate max-w-md mt-1">{msg.content}</p>
                            </div>
                         </div>
                         <p className="text-[10px] text-white/40 font-medium">{msg.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                      </div>
                   ))}
                 </div>
              )}
              <div className="mt-8 p-4 border border-white/10 rounded-2xl bg-white/[0.02] text-center">
                <p className="text-xs text-white/40">To continue chatting, please accept a planner's proposal via the Bids tracking screen.</p>
              </div>
           </div>
         )}
         
         {activeTab === 'settings' && (
            <div className="flex items-center justify-center py-20 text-white/30 italic">
               Settings and Preferences coming soon...
            </div>
         )}
      </div>
    </div>
  );
};

export default CoupleProfile;

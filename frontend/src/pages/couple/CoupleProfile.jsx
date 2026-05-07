import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { quoteAPI, chatAPI, paymentAPI } from '../../api/api';
import { getCoupleDisplayName, getCoupleInitials } from '../../utils/coupleProfile';

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
                 roomId: r._id,
                 quoteId: r.relatedQuote?._id || null,
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
  const initials = getCoupleInitials(currentUser);
  const coupleName = getCoupleDisplayName(currentUser);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: "url('/images/signup.png')", backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}>
        <div className="w-10 h-10 border-4 border-[#e6c6b2]/30 border-t-[#e6c6b2] rounded-full animate-spin"></div>
      </div>
    );
  }

  const pageStyle = {
    width: "100%",
    minHeight: "100vh",
    backgroundImage: "url('/images/signup.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    color: "#F9F7F5",
    fontFamily: "'Poppins', sans-serif",
  };

  return (
    <div style={pageStyle} className="pb-20">
      {/* Header Profile Section */}
      <div className="pt-32 pb-8 px-6">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-white">
            {/* Initials Circle */}
            <div className="w-24 h-24 rounded-full border border-[#e6c6b2]/30 flex shadow-[0_0_30px_rgba(225,195,135,0.1)] items-center justify-center text-[#e6c6b2] font-heading text-2xl tracking-widest shrink-0">
               {initials}
            </div>
            <div className="flex-1 text-center md:text-left">
               <h1 className="text-3xl md:text-4xl font-heading font-medium tracking-wide mb-2 text-[#F9F7F5]">
                 {coupleName}
               </h1>
               <div className="flex flex-wrap gap-x-6 gap-y-2 text-white/70 text-xs tracking-wide justify-center md:justify-start">
                 {currentUser?.email && <span className="flex items-center gap-2">✉ {currentUser.email}</span>}
                 {currentUser?.phone && <span className="flex items-center gap-2">📞 {currentUser.phone}</span>}
                 {(wp.city || wp.location) && <span className="flex items-center gap-2">📍 {wp.city || wp.location}</span>}
                 {wp.weddingDate && <span className="flex items-center gap-2">📅 {new Date(wp.weddingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
               </div>
            </div>
            <div className="flex gap-3 shrink-0 mt-4 md:mt-0">
               <button onClick={() => navigate('/pricing')} className="px-5 py-2.5 rounded-lg border border-[#e6c6b2]/40 text-[#e6c6b2] text-xs font-semibold hover:bg-[#e6c6b2]/10 transition-colors uppercase tracking-widest">
                 👑 Subscriptions
               </button>
               <button onClick={() => navigate('/user-form')} className="px-5 py-2.5 rounded-lg border border-white/20 text-white text-xs font-semibold hover:bg-white/5 transition-colors uppercase tracking-widest">
                 Edit Profile
               </button>
            </div>
         </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-6">
         {/* Navigation Tabs */}
         <div className="inline-flex bg-black/40 p-1 rounded-xl border border-white/10 mb-8 backdrop-blur-md">
            {navs.map(nav => (
               <button
                 key={nav.id}
                 onClick={() => setActiveTab(nav.id)}
                 className={`relative px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === nav.id ? 'bg-[#e6c6b2]/10 text-[#e6c6b2] shadow-sm border border-[#e6c6b2]/20' : 'text-white/60 hover:text-white'}`}
               >
                 {nav.label}
                 {nav.badge && <span className="absolute top-1.5 right-1 w-4 h-4 bg-[#e6c6b2] text-black rounded-full text-[9px] flex items-center justify-center font-bold">{nav.badge}</span>}
               </button>
            ))}
         </div>

         {/* Overview Tab Content */}
         {activeTab === 'overview' && (
           <div className="space-y-6">
              {/* Credits Row */}
              <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/[0.08] p-6 flex items-center justify-between text-white">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#e6c6b2]/20 flex items-center justify-center text-[#e6c6b2]">✨</div>
                    <div>
                       <p className="font-medium text-white">Lover's Credits: <span className="text-[#e6c6b2]">{credits.toLocaleString()}</span></p>
                       <p className="text-white/60 text-xs mt-0.5">Current Plan: {plan}</p>
                    </div>
                 </div>
                 <button onClick={() => navigate('/pricing')} style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }} className="px-5 py-2 text-xs font-bold rounded-lg hover:brightness-110 transition-all uppercase tracking-wide">
                   Manage Plan
                 </button>
              </div>

              {/* Grid: Bids & Messages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Bid Summary */}
                 <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/[0.08] p-6 flex flex-col text-white">
                    <h3 className="font-heading text-xl text-[#F9F7F5] mb-6 tracking-wide">Bid Summary</h3>
                    <div className="space-y-4 flex-1">
                       <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
                         <span className="flex items-center gap-2 text-sm text-white/70"><span className="text-green-500">✓</span> Accepted</span>
                         <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs">{bidCounts.accepted}</span>
                       </div>
                       <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
                         <span className="flex items-center gap-2 text-sm text-white/70"><span className="text-yellow-500">⏳</span> Pending</span>
                         <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs">{bidCounts.pending}</span>
                       </div>
                       <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
                         <span className="flex items-center gap-2 text-sm text-white/70"><span className="text-red-500">✕</span> Rejected</span>
                         <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs">{bidCounts.rejected}</span>
                       </div>
                    </div>
                    <button onClick={() => setActiveTab('bids')} className="mt-4 text-[#e6c6b2] text-sm font-medium hover:underline flex items-center justify-between w-full">
                       View all bids <span className="text-lg">›</span>
                    </button>
                 </div>

                 {/* Recent Messages */}
                 <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/[0.08] p-6 flex flex-col text-white">
                    <h3 className="font-heading text-xl text-[#F9F7F5] mb-6 tracking-wide">Recent Messages</h3>
                    <div className="space-y-5 flex-1">
                       {messages.slice(0, 3).map((msg, i) => (
                          <div key={i} className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-loverai-gold shrink-0">
                                {msg.avatar ? <img src={msg.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : msg.sender[0].toUpperCase()}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                   <p className="text-sm font-medium text-white truncate">{msg.sender} <span className="w-1.5 h-1.5 rounded-full bg-loverai-gold inline-block ml-1"></span></p>
                                   <p className="text-[10px] text-white/30">{msg.timestamp.toLocaleDateString()}</p>
                                </div>
                                <p className="text-xs text-white/50 truncate pr-4">{msg.content}</p>
                             </div>
                          </div>
                       ))}
                       {messages.length === 0 && (
                          <p className="text-white/30 text-sm italic py-4">No recent messages from planners.</p>
                       )}
                    </div>
                    <button onClick={() => setActiveTab('messages')} className="mt-4 text-loverai-gold text-sm font-medium hover:underline flex items-center justify-between w-full">
                       View all messages <span>›</span>
                    </button>
                 </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-10">
                 <h3 className="font-heading text-xl text-[#F9F7F5] mb-4 tracking-wide">Quick Actions</h3>
                 <div className="flex flex-wrap gap-4">
                    <button onClick={() => navigate('/couples')} className="px-5 py-2.5 rounded-xl border border-[#e6c6b2]/40 text-[#e6c6b2] text-sm hover:bg-[#e6c6b2]/10 transition flex items-center gap-2">
                       👤 Dashboard
                    </button>
                    <button onClick={() => navigate('/love-story')} className="px-5 py-2.5 rounded-xl border border-[#e6c6b2]/40 text-[#e6c6b2] text-sm hover:bg-[#e6c6b2]/10 transition flex items-center gap-2">
                       🎨 GenAI Vision →
                    </button>
                    <button onClick={() => navigate('/couple/cart')} className="px-5 py-2.5 rounded-xl border border-[#e6c6b2]/40 text-[#e6c6b2] text-sm hover:bg-[#e6c6b2]/10 transition flex items-center gap-2">
                       🛒 My Cart →
                    </button>
                    <button onClick={() => setActiveTab('bids')} style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }} className="px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2 shadow-[0_4px_15px_rgba(225,195,135,0.3)] font-semibold">
                       📍 Track Bids →
                    </button>
                 </div>
              </div>
           </div>
         )}

         {/* Bids Tab Content */}
         {activeTab === 'bids' && (
           <div className="space-y-4">
              <h2 className="text-xl font-heading mb-4">Your Quote Requests</h2>
              {quotes.length === 0 ? (
                 <p className="text-white/40">You have not submitted any visions for quoting yet.</p>
              ) : (
                 quotes.map(q => (
                    <div key={q._id} onClick={() => navigate(`/couple/bid-dashboard/${q._id}`)} className="bg-[#18130f] border border-white/5 rounded-xl p-5 hover:bg-[#1e1713] transition cursor-pointer flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          {q.images?.[0]?.url && <img src={q.images[0].url} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />}
                          <div>
                             <p className="text-sm font-medium">{q.eventDetails?.city || 'Undecided Location'}</p>
                             <p className="text-[11px] text-white/40 mt-1">{q.responses?.length || 0} planner responses • Submitted {new Date(q.createdAt).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold 
                             ${q.status === 'accepted' ? 'bg-green-500/20 text-green-400' : q.status === 'pending' || q.status === 'quoted' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                             {q.status}
                          </span>
                          <span className="text-white/20">›</span>
                       </div>
                    </div>
                 ))
              )}
           </div>
         )}

         {/* Messages Tab Content */}
         {activeTab === 'messages' && (
           <div className="space-y-4 max-w-3xl">
              <h2 className="text-xl font-heading mb-4">Messages from Planners</h2>
              {messages.length === 0 ? (
                 <p className="text-white/40">No messages yet. Planners will contact you here once they bid.</p>
              ) : (
                 messages.map(msg => (
                    <div
                      key={msg.id}
                      onClick={() => msg.quoteId && navigate(`/couple/bid-dashboard/${msg.quoteId}`, { state: { activePanel: 'messages', roomId: msg.roomId } })}
                      className="bg-[#18130f] border border-white/5 rounded-xl p-5 hover:bg-[#1e1713] transition cursor-pointer flex justify-between items-center"
                    >
                       <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-full border border-loverai-gold/30 flex items-center justify-center text-loverai-gold overflow-hidden">
                             {msg.avatar ? <img src={msg.avatar} alt="" className="w-full h-full object-cover" /> : msg.sender[0]}
                          </div>
                          <div>
                             <p className="text-sm font-medium text-loverai-gold">{msg.sender}</p>
                             <p className="text-xs text-white/60 truncate max-w-md mt-1">{msg.content}</p>
                          </div>
                       </div>
                       <p className="text-[10px] text-white/30">{msg.timestamp.toLocaleDateString()}</p>
                    </div>
                 ))
              )}
              <div className="mt-8 p-4 border border-white/10 rounded-xl bg-white/[0.02]">
                <p className="text-xs text-white/40 text-center">Open any conversation above to continue inside the quote CRM. Accepted planners can continue requirements and finalization there.</p>
              </div>
           </div>
         )}
         
         {activeTab === 'settings' && (
            <div className="flex items-center justify-center py-20 text-white/30">
               Settings and Preferences coming soon...
            </div>
         )}
      </div>
    </div>
  );
};

export default CoupleProfile;

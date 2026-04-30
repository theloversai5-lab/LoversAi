import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../api/api';

const sidebarLinks = [
  { to: '/vendor/dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg> },
  { to: '/vendor/inventory', label: 'Inventory', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
  { to: '/vendor/requests', label: 'Planner Requests', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { to: '/vendor/messages', label: 'Messages', badgeKey: 'unread', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  { to: '/vendor/portfolio', label: 'Portfolio', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { to: '/vendor/profile', label: 'Profile', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { to: '/vendor/earnings', label: 'Earnings', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

export default function VendorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    chatAPI.getUnreadCount().then(d => { if (d.success) setUnreadCount(d.unreadCount || 0); }).catch(() => {});
    const interval = setInterval(() => {
      chatAPI.getUnreadCount().then(d => { if (d.success) setUnreadCount(d.unreadCount || 0); }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { 
    logout(); 
    navigate('/'); // Redirect to home page instead of login
  };
  
  const userName = currentUser?.fullName || currentUser?.email?.split('@')[0] || 'Vendor';

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
    <div style={pageStyle} className="min-h-screen flex text-white font-body">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full w-[220px] z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 glass-sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 pt-5 pb-2">
          <Link to="/" className="flex items-center gap-2 mb-6 group">
            <img src="/images/LogoLoversai.png" alt="LoversAI" className="h-10 w-auto object-contain group-hover:scale-105 transition-transform" />
          </Link>
          <p className="text-[10px] font-semibold tracking-[2px] text-loverai-gold/40 uppercase mb-4">Vendor Portal</p>
        </div>

        <nav className="flex flex-col gap-1 px-3 flex-1">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            const badge = link.badgeKey === 'unread' ? unreadCount : 0;
            return (
              <Link key={link.to} to={link.to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group ${isActive ? 'glass-card text-loverai-gold border-loverai-gold/20' : 'text-white/50 hover:text-loverai-gold/80 hover:bg-white/[0.04]'}`}>
                <span className={`transition-colors ${isActive ? 'text-loverai-gold' : 'text-white/30 group-hover:text-loverai-gold/60'}`}>{link.icon}</span>
                {link.label}
                {badge > 0 && <span className="ml-auto bg-loverai-gold-bright/80 text-loverai-dark text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-2 text-white/30 hover:text-red-400 transition text-[12px] w-full px-2 py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-14 glass-topbar">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-white/40 hover:text-loverai-gold transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-loverai-gold font-semibold text-[15px]">LoversAi</span>
              <span className="text-white/30 text-[13px]">· Vendor</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/vendor/messages" className="relative cursor-pointer hover:text-white transition">
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 bg-red-500 text-[9px] font-bold text-white items-center justify-center rounded-full border-2 border-loverai-dark">{unreadCount}</span>}
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-white/40 text-sm pl-2 border-l border-white/5">
              <span>{userName}</span>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 flex items-center justify-center text-loverai-dark font-bold text-sm hover:ring-2 hover:ring-loverai-gold/50 transition-all"
              >
                {userName.charAt(0).toUpperCase()}
              </button>
              
              {profileDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-xl py-2 z-50 animate-fadeInUp">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-white/90 text-sm font-medium truncate">{userName}</p>
                      <p className="text-white/40 text-xs truncate">{currentUser?.email}</p>
                    </div>
                    
                    <Link 
                      to="/vendor/profile" 
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-loverai-gold hover:bg-white/5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View Profile
                    </Link>
                    
                    <Link 
                      to="/vendor/dashboard" 
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-loverai-gold hover:bg-white/5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                      </svg>
                      Dashboard
                    </Link>
                    
                    <div className="border-t border-white/10 my-1"></div>
                    
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 relative z-10"><Outlet /></main>
      </div>
    </div>
  );
}

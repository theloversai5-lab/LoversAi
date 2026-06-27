import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { chatAPI } from "../../api/api";
import PlannerQuickMenu from "../../components/PlannerQuickMenu";

const sidebarLinks = [
  {
    to: "/planner/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    to: "/planner/bids",
    label: "Find Leads",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    to: "/planner/quotes",
    label: "Quotes",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: "/planner/messages",
    label: "Messages",
    badgeKey: "unread",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    to: "/planner/deals",
    label: "My Deals",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    to: "/planner/venue-ai",
    label: "Venue AI",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    to: "/planner/library",
    label: "Library",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    to: "/planner/profile",
    label: "Profile",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function PlannerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    chatAPI
      .getUnreadCount()
      .then((data) => {
        if (data.success) setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      chatAPI
        .getUnreadCount()
        .then((data) => {
          if (data.success) setUnreadCount(data.unreadCount || 0);
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const userName =
    currentUser?.fullName || currentUser?.email?.split("@")[0] || "Planner";

  return (
    <div
      className="min-h-screen loverai-page-bg flex text-white font-body"
      style={{
        backgroundImage: "url('/images/signup.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-[220px] flex-col glass-sidebar transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 pb-2 pt-5">
          <Link to="/planner" className="group mb-6 flex items-center gap-2">
            <img
              src="/images/LogoLoversai.png"
              alt="LoversAI"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[2px] text-loverai-gold/40">
            Planner Menu
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.to;
            const badge = link.badgeKey === "unread" ? unreadCount : 0;
            const isFeatured = Boolean(link.featured);

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "glass-card border-loverai-gold/20 text-loverai-gold"
                    : isFeatured
                      ? "border-[#d0b1a4]/30 bg-[linear-gradient(135deg,rgba(208,177,164,0.16),rgba(208,177,164,0.06))] text-[#f2d9cf] shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:border-[#d0b1a4]/45 hover:bg-[linear-gradient(135deg,rgba(208,177,164,0.22),rgba(208,177,164,0.1))] hover:text-white"
                      : "border-transparent text-white/50 hover:bg-white/[0.04] hover:text-loverai-gold/80"
                }`}
              >
                <span
                  className={`transition-colors ${
                    isActive
                      ? "text-loverai-gold"
                      : isFeatured
                        ? "text-[#e6c5b7] group-hover:text-[#f8e7df]"
                        : "text-white/30 group-hover:text-loverai-gold/60"
                  }`}
                >
                  {link.icon}
                </span>
                {link.label}
                {badge > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-loverai-gold-bright/80 text-[10px] font-bold text-loverai-dark">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-2 py-2 text-[12px] text-white/30 transition hover:text-red-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-[220px]">
        <header className="glass-topbar sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-loverai-gold lg:hidden"
              aria-label={sidebarOpen ? "Close planner menu" : "Open planner menu"}
              aria-expanded={sidebarOpen}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-loverai-gold">
                LoversAi
              </span>
              <span className="text-[13px] text-white/30">· Planner</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/planner/messages"
              className="relative cursor-pointer transition hover:text-white"
            >
              <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-loverai-dark bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden items-center gap-2 border-l border-white/5 pl-2 text-sm text-white/40 md:flex">
              <span>{userName}</span>
            </div>

            <PlannerQuickMenu className="relative z-40 right-0 top-0 sm:right-0 sm:top-0" />
          </div>
        </header>

        <main className="relative z-10 flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

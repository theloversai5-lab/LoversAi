import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/api";

const STORAGE_KEY = "loversai_theme_moodboards";

const THEMES = [
  {
    key: "haldi",
    name: "Haldi",
    tone: "Turmeric yellows, marigold florals, warm daylight",
    image: "/images/golden.png",
  },
  {
    key: "mehendi",
    name: "Mehendi",
    tone: "Henna greens, intimate lounges, floral detailing",
    image: "/images/gallery_left.jpeg",
  },
  {
    key: "sangeet",
    name: "Sangeet",
    tone: "Stage lighting, jewel tones, dance-floor energy",
    image: "/images/mandap-image.png",
  },
  {
    key: "wedding",
    name: "Wedding",
    tone: "Sacred ceremony, mandap styling, regal celebration",
    image: "/images/couple_wedding.jpeg",
  },
];

const normalizeTheme = (value = "") => {
  const text = value.toLowerCase();
  if (text.includes("haldi")) return "haldi";
  if (text.includes("mehendi") || text.includes("mehandi")) return "mehendi";
  if (text.includes("sangeet")) return "sangeet";
  return "wedding";
};

const formatBudgetLabel = (budget) => {
  if (budget >= 100) return "1 Cr";
  return `${budget} L`;
};

const SparkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M19 16v5" />
    <path d="M21.5 18.5h-5" />
  </svg>
);

const readBoards = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export function saveThemeMoodboard(entry) {
  const theme = normalizeTheme(entry.functionType || entry.theme);
  const boards = readBoards();
  const nextEntry = {
    ...entry,
    theme,
    id: entry.id || `${theme}_${Date.now()}`,
    createdAt: entry.createdAt || new Date().toISOString(),
  };

  boards[theme] = [nextEntry, ...(boards[theme] || [])].slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  return theme;
}

function groupImages(board) {
  const images = board?.images || [];
  return {
    lead: images[0],
    top: images.slice(1, 3),
    bottom: images.slice(3),
  };
}

export default function CoupleThemeMoodboard() {
  const navigate = useNavigate();
  const { theme } = useParams();
  const { currentUser, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const activeTheme = normalizeTheme(theme || "");
  const boards = useMemo(readBoards, []);
  const selectedTheme = THEMES.find((item) => item.key === activeTheme) || THEMES[0];
  const selectedBoards = boards[selectedTheme.key] || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedBoardId, setAddedBoardId] = useState(null);

  const activeBoard = selectedBoards[activeIndex] || null;
  const groupedImages = groupImages(activeBoard);

  const openTheme = (nextTheme) => {
    setActiveIndex(0);
    navigate(`/couple/moodboard/${nextTheme}`);
  };
  const goPrev = () => setActiveIndex((prev) => Math.max(0, prev - 1));
  const goNext = () => setActiveIndex((prev) => Math.min(selectedBoards.length - 1, prev + 1));

  const handleAddToCart = async () => {
    if (!activeBoard || addingToCart) return;
    setAddingToCart(true);
    try {
      const images = activeBoard.images || [];
      const primaryUrl = images[0]?.url || "";
      await apiFetch("/cart/add", {
        method: "POST",
        data: {
          type: "vision",
          url: primaryUrl,
          moodboard: images.map((img) => img.url),
          label: activeBoard.title || `${activeBoard.style || ""} ${activeBoard.functionType || selectedTheme.name} Moodboard`,
          prompt: activeBoard.prompt || "",
          details: {
            functionType: activeBoard.functionType || selectedTheme.name,
            style: activeBoard.style || "",
            atmosphere: activeBoard.atmosphere || "",
            timing: activeBoard.timing || "",
            planningType: activeBoard.details?.planningType || "",
            venueType: activeBoard.details?.venueType || "",
            theme: activeBoard.details?.theme || "",
          },
        },
      });
      setAddedBoardId(activeBoard.id);
    } catch (err) {
      console.error("Failed to add to cart:", err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      setProfileMenuOpen(false);
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const getUserInitials = () => {
    if (!currentUser?.displayName && !currentUser?.email) return "U";
    const name = currentUser.displayName || currentUser.email;
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <main className="h-screen w-screen relative px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-5 text-white overflow-hidden flex flex-col">
      {/* Background Image Setup matching the Dashboard exactly */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-20 animate-scaleIn"
        style={{
          backgroundImage: 'url("/images/signup.png")',
          filter: "brightness(0.75) contrast(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0a0604] -z-10" />

      <div className="mx-auto w-full max-w-[1380px] relative z-10 flex flex-col flex-1 min-h-0">
        
        {/* Elegant Top Controls Row */}
        <div className="mb-2.5 flex items-center justify-between text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => navigate("/love-story")}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => navigate("/couple/cart")}
              className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              Cart
            </button>
          </div>

          {/* Premium Hamburger Menu Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-10 h-10 rounded-full border border-white/15 bg-white/10 flex items-center justify-center text-white transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95"
              aria-label="Toggle Menu"
            >
              <div className="flex flex-col gap-[3px]">
                <span className={`block h-[2px] w-4 bg-white transition-all duration-300 ${profileMenuOpen ? "translate-y-[5px] rotate-45" : ""}`} />
                <span className={`block h-[2px] w-4 bg-white transition-all duration-300 ${profileMenuOpen ? "opacity-0" : "opacity-100"}`} />
                <span className={`block h-[2px] w-4 bg-white transition-all duration-300 ${profileMenuOpen ? "-translate-y-[5px] -rotate-45" : ""}`} />
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-48 rounded-2xl bg-gradient-to-br from-[#1c120e]/95 to-[#120c09]/95 backdrop-blur-md border border-[#e6c6b2]/20 p-3.5 shadow-2xl flex flex-col gap-1 z-50 animate-fadeIn text-left">
                {currentUser && (
                  <div className="px-2 py-2 border-b border-white/10 mb-2 flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-[#e6c6b2] to-amber-700 rounded-full flex items-center justify-center text-[#201913] text-[11px] font-bold">
                      {getUserInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#e6c6b2] truncate">
                        {currentUser.displayName || currentUser.email?.split("@")[0]}
                      </p>
                      <p className="text-[9px] text-white/40 truncate leading-none mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    navigate("/couple/cart");
                    setProfileMenuOpen(false);
                  }}
                  className="group flex items-center w-full px-3 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/5 hover:text-[#e6c6b2] border border-transparent hover:border-[#e6c6b2]/10 transition-all duration-300 text-left"
                >
                  My Cart
                </button>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setProfileMenuOpen(false);
                  }}
                  className="group flex items-center w-full px-3 py-2 text-xs font-semibold rounded-lg text-white/70 hover:bg-white/5 hover:text-[#e6c6b2] border border-transparent hover:border-[#e6c6b2]/10 transition-all duration-300 text-left"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2.5 text-xs font-semibold rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 text-left border-t border-white/10 mt-1.5 pt-2.5"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Core Glassmorphic Frame Wrapper */}
        <section className="rounded-[24px] border border-white/15 bg-white/5 backdrop-blur-2xl p-4 md:p-5 shadow-[0_30px_70px_rgba(0,0,0,0.45)] flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-0.5 py-0.5 flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* Header Titles */}
            <div className="text-center mb-3.5 flex-shrink-0">
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl md:text-[30px] font-semibold text-[#ffffff] tracking-wide leading-none">
                Your Dream Moodboard
              </h1>
              <p className="text-[10px] text-white/70 uppercase tracking-widest mt-1">
                Curate and organize your themed wedding visions
              </p>
            </div>

            {/* Premium Theme Selection Tabs Grid */}
            <div className="mb-5 grid gap-3.5 grid-cols-2 lg:grid-cols-4 flex-shrink-0">
              {THEMES.map((item) => {
                const isActive = item.key === selectedTheme.key;
                const count = (boards[item.key] || []).length;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openTheme(item.key)}
                    className={`rounded-[16px] border px-4 py-3.5 text-left transition-all duration-300 transform active:scale-[0.98] shadow-sm select-none ${
                      isActive
                        ? "border-[#e6c6b2] bg-[#e6c6b2]/15 text-[#e6c6b2] shadow-md shadow-[#e6c6b2]/5"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-[21px] font-bold tracking-wide">{item.name}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${
                        isActive 
                          ? "bg-[#e6c6b2] text-[#3D1B2D]" 
                          : "bg-white/10 text-white/80"
                      }`}>
                        {count}
                      </span>
                    </div>
                    <p className={`mt-1 text-[11px] leading-relaxed font-sans font-medium ${
                      isActive ? "text-[#e6c6b2]/75" : "text-white/40"
                    }`}>{item.tone}</p>
                  </button>
                );
              })}
            </div>

            {/* Collage Canvas Area (Bento blocks / Empty Placeholder) */}
            {!activeBoard ? (
              /* High-End Glassmorphic Empty Placeholder State */
              <div className="flex-1 rounded-[20px] border border-dashed border-white/15 bg-white/5 backdrop-blur-md p-10 text-center flex flex-col items-center justify-center min-h-0 overflow-y-auto">
                <div className="rounded-full border border-white/[0.08] bg-white/[0.04] p-5 text-[#e6c6b2] mb-4 animate-pulse shadow-[0_0_20px_rgba(230,198,178,0.1)]">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-[26px] md:text-[32px] font-semibold text-white tracking-wide leading-none">
                  No {selectedTheme.name} board yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-white/40 font-medium">
                  Generate a function vision first. Once you add it, it will appear here in the themed moodboard flow.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/love-story")}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#e6c6b2] to-[#e6c6b2] px-6 py-3 text-sm font-semibold text-[#3D1B2D] transition hover:scale-[1.02] shadow-[0_10px_25px_rgba(230,198,178,0.25)] hover:brightness-95 border border-white/15 cursor-pointer font-sans"
                >
                  <SparkIcon />
                  Create Vision
                </button>
              </div>
            ) : (
              /* Premium Staggered Glassmorphic Bento Collage Canvas */
              <article className="mx-auto w-full max-w-[800px] rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-3.5 min-h-0 flex-1 overflow-hidden">
                
                {/* Collage Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-[#e6c6b2] px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#3D1B2D] shadow-sm">
                      {activeBoard.functionType || selectedTheme.name} Decor
                    </span>
                    <span className="text-[11px] font-extrabold text-[#e6c6b2]/85 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-0.5">
                      {activeBoard.style}
                    </span>
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-[#e6c6b2] bg-white/[0.04] border border-white/10 rounded-full px-3 py-1 font-sans">
                    {activeIndex + 1} OF {selectedBoards.length}
                  </span>
                </div>

                {/* Main Bento Collage Grid */}
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-3 relative min-h-0 flex-1 rounded-[16px] overflow-hidden">
                  
                  {/* Left Big Lead Image Slot */}
                  <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-black/40 shadow-inner group">
                    {groupedImages.lead ? (
                      <img
                        src={groupedImages.lead.url}
                        alt={groupedImages.lead.label || "Moodboard lead"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/20 text-xs uppercase font-bold tracking-widest bg-white/[0.01]">
                        Lead Scene Empty
                      </div>
                    )}
                    <span className="absolute bottom-2.5 left-2.5 rounded-[6px] bg-black/60 px-2 py-1 text-[9px] uppercase tracking-wider text-white backdrop-blur-sm border border-white/5">
                      {groupedImages.lead?.label || "Lead Scene"}
                    </span>
                  </div>

                  {/* Right Column Grid for Detail Slots */}
                  <div className="grid grid-rows-2 gap-3 min-h-0">
                    
                    {/* Top Right Slot Grid (2 columns) */}
                    <div className="grid grid-cols-2 gap-3 min-h-0">
                      {Array.from({ length: 2 }).map((_, idx) => {
                        const img = groupedImages.top[idx];
                        return (
                          <div key={`top-right-${idx}`} className="relative overflow-hidden rounded-[14px] border border-white/10 bg-black/40 shadow-inner group">
                            {img ? (
                              <img
                                src={img.url}
                                alt={img.label || "Moodboard thumbnail"}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-white/10 text-[9px] uppercase font-bold tracking-widest bg-white/[0.01]">
                                Empty Slot
                              </div>
                            )}
                            <span className="absolute bottom-2.5 left-2.5 rounded-[6px] bg-black/60 px-2 py-1 text-[9px] uppercase tracking-wider text-white backdrop-blur-sm border border-white/5">
                              {img?.label || `Detail ${idx + 1}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Right Slot Grid (2 columns) */}
                    <div className="grid grid-cols-2 gap-3 min-h-0">
                      {Array.from({ length: 2 }).map((_, idx) => {
                        const img = groupedImages.bottom[idx];
                        return (
                          <div key={`bottom-right-${idx}`} className="relative overflow-hidden rounded-[14px] border border-white/10 bg-black/40 shadow-inner group">
                            {img ? (
                              <img
                                src={img.url}
                                alt={img.label || "Moodboard thumbnail"}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-white/10 text-[9px] uppercase font-bold tracking-widest bg-white/[0.01]">
                                Empty Slot
                              </div>
                            )}
                            <span className="absolute bottom-2.5 left-2.5 rounded-[6px] bg-black/60 px-2 py-1 text-[9px] uppercase tracking-wider text-white backdrop-blur-sm border border-white/5">
                              {img?.label || `Detail ${idx + 3}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Left & Right Pagination Overlay Buttons */}
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={activeIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition duration-250 hover:bg-[#e6c6b2] hover:text-[#3D1B2D] hover:scale-105 disabled:opacity-30 disabled:pointer-events-none shadow-md cursor-pointer font-bold text-lg hover:shadow-[0_0_15px_rgba(230,198,178,0.3)] active:scale-90"
                    title="Previous Board"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={activeIndex >= selectedBoards.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition duration-250 hover:bg-[#e6c6b2] hover:text-[#3D1B2D] hover:scale-105 disabled:opacity-30 disabled:pointer-events-none shadow-md cursor-pointer font-bold text-lg hover:shadow-[0_0_15px_rgba(230,198,178,0.3)] active:scale-90"
                    title="Next Board"
                  >
                    →
                  </button>
                </div>

                {/* Collage Footer Details */}
                <div className="mt-1 border-t border-white/10 pt-3 flex flex-wrap items-center justify-between text-xs text-white/50 flex-shrink-0">
                  <div className="flex items-center gap-4">
                    {activeBoard.details?.budget && (
                      <span className="font-bold uppercase tracking-wider text-[10px] text-white/40">
                        Budget: <strong className="text-[#e6c6b2] font-black tracking-normal text-xs ml-1">{formatBudgetLabel(activeBoard.details.budget)}</strong>
                      </span>
                    )}
                    {activeBoard.details?.guestCount > 0 && (
                      <span className="font-bold uppercase tracking-wider text-[10px] text-white/40">
                        Guests: <strong className="text-[#e6c6b2] font-black tracking-normal text-xs ml-1">{activeBoard.details.guestCount} PAX</strong>
                      </span>
                    )}
                  </div>
                  <span className="font-bold uppercase tracking-widest text-[9px] text-white/30 font-sans">
                    Created on {new Date(activeBoard.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Add to Cart + View Cart action row */}
                <div className="mt-3 flex items-center gap-2.5 flex-shrink-0">
                  {addedBoardId === activeBoard.id ? (
                    <>
                      <div className="flex-1 flex items-center gap-2 rounded-[12px] border border-[#89b86b]/40 bg-[#89b86b]/10 px-4 py-2.5 text-[12px] font-semibold text-[#d8efc8]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Added to Cart!
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/couple/cart")}
                        className="inline-flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-[#e6c6b2] to-[#e6c6b2] px-5 py-2.5 text-[12px] font-bold text-[#3D1B2D] transition hover:scale-[1.02] hover:brightness-95 shadow-[0_8px_20px_rgba(230,198,178,0.25)] border border-white/10 cursor-pointer"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 20a1 1 0 1 0 0 2 1 1 0 1 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM3 3h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8.5 16H21v-2H8.5l1.1-2h7.45a2 2 0 0 0 1.9-1.4l2.5-9v-.1H5.21L4.27 2H1v2h2z" />
                        </svg>
                        View Cart & Place Bid →
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/15 bg-white/8 hover:bg-[#e6c6b2]/10 hover:border-[#e6c6b2]/40 px-5 py-2.5 text-[12px] font-semibold text-white/80 hover:text-[#e6c6b2] transition-all duration-250 hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {addingToCart ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                          Adding to Cart...
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 20a1 1 0 1 0 0 2 1 1 0 1 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM3 3h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8.5 16H21v-2H8.5l1.1-2h7.45a2 2 0 0 0 1.9-1.4l2.5-9v-.1H5.21L4.27 2H1v2h2z" />
                          </svg>
                          Add to Cart
                        </>
                      )}
                    </button>
                  )}
                </div>
              </article>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

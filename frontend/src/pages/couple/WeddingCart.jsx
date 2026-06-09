import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, quoteAPI } from "../../api/api";
import { getCoupleDisplayName } from "../../utils/coupleProfile";
import { userAPI } from "../../api/api";

const normalizeTheme = (value = "") => {
  const text = String(value).toLowerCase();
  if (text.includes("haldi")) return "Haldi";
  if (text.includes("mehndi") || text.includes("mehendi") || text.includes("mehandi")) return "Mehndi";
  if (text.includes("sangeet")) return "Sangeet";
  return "Wedding";
};

const emptySections = ["Haldi", "Mehndi", "Sangeet", "Wedding"];

const SparkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M19 16v5" />
    <path d="M21.5 18.5h-5" />
  </svg>
);

export default function WeddingCart() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const coupleName = getCoupleDisplayName(currentUser);
  const [eventDetails, setEventDetails] = useState({
    budget: "",
    guestCount: "",
    city: "",
    venue: "",
    tradition: "",
    notes: "",
    bidDays: "7 Days",
  });

  // Dynamic wedding profile from backend
  const [weddingProfile, setWeddingProfile] = useState({});

  const formatWeddingDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
    } catch { return null; }
  };

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await apiFetch("/cart");
        if (res.success) {
          setCartItems(res.cart?.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch cart:", err);
        const cartKey = `weddingCart_${currentUser?.uid}`;
        const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
        setCartItems(cart);
      }
    };

    if (currentUser) fetchCart();

    // Fetch wedding profile dynamically from backend
    userAPI.getProfile()
      .then((data) => {
        const wp = data?.user?.weddingProfile || data?.weddingProfile || {};
        setWeddingProfile({
          brideName: wp.partnerName1 || "",
          groomName: wp.partnerName2 || "",
          weddingDate: wp.weddingDate || "",
          city: wp.city || "",
          religion: wp.tradition || "",
          budget: wp.budget || "",
          guestCount: wp.guestCount ? String(wp.guestCount) : "",
        });
        setEventDetails((prev) => ({
          ...prev,
          budget: wp.budget || prev.budget,
          guestCount: wp.guestCount ? String(wp.guestCount) : prev.guestCount,
          city: wp.city || prev.city,
          venue: wp.venue || prev.venue,
          tradition: wp.tradition || prev.tradition,
        }));
      })
      .catch(() => {
        // fallback: use currentUser.weddingProfile if available
        if (currentUser?.weddingProfile) {
          const wp = currentUser.weddingProfile;
          setEventDetails((prev) => ({
            ...prev,
            budget: wp.budget || "",
            guestCount: wp.guestCount || "",
            city: wp.city || "",
            venue: wp.venue || "",
            tradition: wp.tradition || "",
          }));
        }
      });
  }, [currentUser]);

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

  const groupedItems = useMemo(() => {
    const groups = emptySections.reduce((acc, section) => {
      acc[section] = [];
      return acc;
    }, {});

    cartItems.forEach((item) => {
      const label = item?.details?.functionType || item?.label || "";
      const key = normalizeTheme(label);
      groups[key] = [...(groups[key] || []), item];
    });

    return groups;
  }, [cartItems]);

  const removeItem = async (itemId) => {
    try {
      await apiFetch(`/cart/${itemId}`, { method: "DELETE" });
      const res = await apiFetch("/cart");
      if (res.success) setCartItems(res.cart?.items || []);
    } catch (err) {
      console.error("Failed to remove item:", err);
      setCartItems((prev) => prev.filter((item) => item._id !== itemId));
    }
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      setError("Your cart is empty. Add AI visions first.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const images = cartItems.map((item) => ({
        url: item.url,
        label: item.label || "",
        prompt: item.prompt || "",
      }));

      const quoteData = {
        images,
        eventDetails: {
          weddingDate: currentUser?.weddingProfile?.weddingDate || null,
          budget: eventDetails.budget || "",
          guestCount: parseInt(eventDetails.guestCount, 10) || 0,
          city: eventDetails.city || "",
          venue: eventDetails.venue || "",
          tradition: eventDetails.tradition || "",
          notes: eventDetails.notes || "",
          bidDays: eventDetails.bidDays,
        },
      };

      const data = await quoteAPI.submit(quoteData);
      if (data.success) {
        try {
          await apiFetch("/cart", { method: "DELETE" });
        } catch (clearErr) {
          console.error("Failed to clear cart:", clearErr);
        }
        const newQuoteId = data.quote?._id;
        setShowSuccessPopup(true);
        setTimeout(() => {
          navigate(newQuoteId ? `/couple/bid-dashboard/${newQuoteId}` : "/couple/bid-placed", {
            state: {
              quoteId: newQuoteId || null,
              justSubmitted: true,
            },
          });
        }, 3500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to submit. Please try again.";
      console.error("Submit quote error:", err);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full relative px-3 py-4 text-white overflow-visible flex flex-col items-center justify-center animate-fadeIn">
      {/* Background Image Setup */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-20"
        style={{
          backgroundImage: 'url("/images/signup.png")',
          filter: "brightness(0.75) contrast(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0a0604] -z-10" />

      <div className="mx-auto w-full max-w-[1380px] relative z-10 flex flex-col h-[calc(100vh-32px)] max-h-[960px]">
        
        {/* Navigation Bar */}
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
              Add More
            </button>
          </div>

          {/* Premium Hamburger Menu Trigger */}
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
            <div className="text-center mb-3 flex-shrink-0">
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl md:text-[30px] font-semibold text-[#ffffff] tracking-wide leading-none">
                My Wedding Cart
              </h1>
              <div className="mx-auto mt-3 flex max-w-[720px] flex-wrap items-center justify-center gap-2 rounded-[6px] border border-[#7b6140] bg-[#211914] px-4 py-3 text-[11px] text-white/75">
                <span>{coupleName}</span>
                <span>|</span>
                <span>{weddingProfile.weddingDate || "02 December 2025"}</span>
                <span>|</span>
                <span>{weddingProfile.city || "Delhi"}</span>
                <span>|</span>
                <span>{weddingProfile.tradition || "Hindu"}</span>
                <span>|</span>
                <span>Budget: {eventDetails.budget || "50 L"}</span>
                <span>|</span>
                <span>Guest: {eventDetails.guestCount || "500"}</span>
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-[8px] border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex-shrink-0">
                {error}
              </div>
            )}

            {/* Grid Layout: Scrollable Cart Items on Left, Submit Sidebar on Right */}
            <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_310px] flex-1 min-h-0 overflow-hidden">
              
              {/* Scrollable Left Side: Event Categories */}
              <div className="space-y-5 overflow-y-auto pr-2.5 custom-scrollbar min-h-0">
                {emptySections.map((section) => {
                  const items = groupedItems[section] || [];
                  return (
                    <div key={section} className="rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-md flex flex-col gap-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
                        <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-[24px] font-bold text-white tracking-wide">
                          {section}
                        </h2>
                        {items.length > 0 && (
                          <span className="rounded-full bg-[#e6c6b2] text-[#3D1B2D] px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider shadow-sm">
                            {items.length} Items
                          </span>
                        )}
                      </div>

                      {items.length === 0 ? (
                        /* Glass Empty Slot State */
                        <div className="min-h-[140px] rounded-[14px] border border-dashed border-white/15 bg-white/[0.02] flex items-center justify-center text-white/20 text-xs font-bold tracking-widest uppercase select-none">
                          No Visions Added
                        </div>
                      ) : (
                        /* Items Collage Grid list */
                        <div className="grid gap-4 sm:grid-cols-2">
                          {items.map((item, index) => (
                            <div key={item._id || `${section}-${index}`} className="relative overflow-hidden rounded-[14px] border border-white/10 bg-black/40 shadow-inner p-2.5 group animate-scaleIn flex flex-col gap-2">
                              <div className="flex items-center justify-between text-[10px] text-white/50 uppercase font-bold tracking-wider px-1">
                                <span className="truncate max-w-[80%]">{item.label || item.details?.functionType || "Vision"}</span>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item._id)}
                                  className="text-white/60 hover:text-red-400 hover:scale-110 active:scale-90 transition duration-200 cursor-pointer font-black text-xs h-5 w-5 rounded-full hover:bg-red-500/10 flex items-center justify-center flex-shrink-0"
                                  title="Remove from Cart"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="relative overflow-hidden rounded-[10px] border border-white/5 bg-[#d8d8d8]/5">
                                <img
                                  src={item.url}
                                  alt={item.label || `${section} vision`}
                                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                                />
                                {/* Hover overlay with quick bid action */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center p-3">
                                  <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] py-2 px-4 text-[11px] font-bold text-[#3D1B2D] transition-all duration-200 hover:brightness-105 hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer disabled:opacity-50"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
                                    </svg>
                                    {submitting ? "Placing..." : "Place Bid"}
                                  </button>
                                </div>
                              </div>
                              {item.details?.style && (
                                <div className="flex items-center gap-1.5 px-1">
                                  <span className="rounded-md bg-white/5 border border-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e6c6b2]/70">
                                    {item.details.style}
                                  </span>
                                  {item.details?.atmosphere && (
                                    <span className="rounded-md bg-white/5 border border-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">
                                      {item.details.atmosphere}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* High-End Quote Request Sidebar */}
              <aside className="rounded-[20px] border border-white/12 bg-[#16100d]/40 backdrop-blur-2xl p-5 flex flex-col gap-4 shadow-2xl shadow-black/30 h-full overflow-y-auto">
                <div className="grid gap-4">
                  
                  {/* Budget Input Section */}
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest text-[#e6c6b2]/80 mb-1.5 block">Budget Range</label>
                    <input
                      value={eventDetails.budget}
                      onChange={(e) => setEventDetails((prev) => ({ ...prev, budget: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-[#120b09]/80 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-white/20 transition duration-300 outline-none font-medium shadow-inner"
                      placeholder="4-5 Lakh"
                    />
                  </div>

                  {/* End Bid dropdown */}
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest text-[#e6c6b2]/80 mb-1.5 block">End Bid In</label>
                    <div className="relative">
                      <select
                        value={eventDetails.bidDays}
                        onChange={(e) => setEventDetails((prev) => ({ ...prev, bidDays: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-[#120b09]/80 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-white/20 transition duration-300 outline-none font-medium appearance-none cursor-pointer shadow-inner"
                      >
                        <option value="3 Days" className="bg-[#1e1713] text-white">3 Days</option>
                        <option value="5 Days" className="bg-[#1e1713] text-white">5 Days</option>
                        <option value="7 Days" className="bg-[#1e1713] text-white">7 Days</option>
                        <option value="10 Days" className="bg-[#1e1713] text-white">10 Days</option>
                      </select>
                      <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#e6c6b2]/80 pointer-events-none">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Description / Notes text area */}
                  <div>
                    <label className="text-[9px] uppercase font-black tracking-widest text-[#e6c6b2]/80 mb-1.5 block">Event Description</label>
                    <textarea
                      value={eventDetails.notes}
                      onChange={(e) => setEventDetails((prev) => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[140px] w-full rounded-xl border border-white/10 bg-[#120b09]/80 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-white/20 transition duration-300 outline-none font-medium resize-none shadow-inner leading-relaxed"
                      placeholder="I want my wedding similar to the generated vision."
                    />
                  </div>

                  {/* Submission CTA Place Bid */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || cartItems.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#e6c6b2] via-[#d4a878] to-[#e6c6b2] py-4 text-sm font-bold text-[#3D1B2D] transition-all duration-300 hover:scale-[1.02] hover:brightness-105 shadow-[0_12px_30px_rgba(230,198,178,0.3)] border border-[#e6c6b2]/20 cursor-pointer disabled:opacity-40 disabled:pointer-events-none font-sans mt-2 relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
                      <path d="M19 16v5" />
                      <path d="M21.5 18.5h-5" />
                    </svg>
                    {submitting ? "Placing Bid..." : "Place Bid"}
                  </button>

                  {cartItems.length === 0 && (
                    <p className="text-center text-[10px] text-white/30 font-medium mt-1">
                      Add visions from your moodboard to place a bid
                    </p>
                  )}

                </div>
              </aside>

            </div>
          </div>
        </section>
      </div>
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <style>{`
            @keyframes shrinkWidth {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
          <div className="w-full max-w-[420px] rounded-[32px] border-[3px] border-[#e6c6b2]/20 bg-[#16100d]/95 text-white shadow-2xl p-8 flex flex-col items-center text-center animate-scaleIn">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-white tracking-wide mb-2">
              Bid Placed Successfully!
            </h2>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              Your wedding request is live. Planners are being matched with your visions now. Redirecting you to the dashboard...
            </p>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#e6c6b2] to-[#d4a878]"
                style={{ animation: 'shrinkWidth 3.5s linear forwards' }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

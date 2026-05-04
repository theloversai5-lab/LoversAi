import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, quoteAPI } from "../../api/api";
import { getCoupleDisplayName } from "../../utils/coupleProfile";

const normalizeTheme = (value = "") => {
  const text = String(value).toLowerCase();
  if (text.includes("haldi")) return "Haldi";
  if (text.includes("mehendi") || text.includes("mehandi")) return "Mahendi";
  if (text.includes("sangeet")) return "Sangeet";
  return "Wedding";
};

const emptySections = ["Haldi", "Mahendi", "Sangeet", "Wedding"];

export default function WeddingCart() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const weddingProfile = currentUser?.weddingProfile || {};
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
  }, [currentUser]);

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
        setSuccess(true);
        setTimeout(() => navigate("/couple/bid-placed"), 1500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to submit. Please try again.";
      console.error("Submit quote error:", err);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#171311] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center rounded-[10px] border border-[#5d4421] bg-[#1b1512] p-8 text-center">
          <div>
            <h2 className="font-['Cormorant_Garamond'] text-[38px] font-semibold text-[#f7e7c7]">
              Bid Submitted
            </h2>
            <p className="mt-3 text-sm text-white/55">
              Planners will review your vision board and send quotes soon.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#171311] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-4 flex items-center justify-between text-sm text-white/75">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border border-white/10 px-3 py-1.5 transition hover:bg-white/5"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/love-story")}
            className="rounded border border-white/10 px-3 py-1.5 transition hover:bg-white/5"
          >
            Add More
          </button>
        </div>

        <section className="rounded-[10px] border border-[#5d4421] bg-[#1b1512] p-3 shadow-[0_0_0_1px_rgba(199,155,45,0.06)]">
          <div className="border border-[#4e3920] bg-[#181310] px-4 py-4">
            <div className="mb-4 text-center">
              <h1 className="font-['Cormorant_Garamond'] text-[34px] font-semibold text-[#f7e7c7]">
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
              <div className="mb-4 rounded-[6px] border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="space-y-3">
                {emptySections.map((section) => {
                  const items = groupedItems[section] || [];
                  return (
                    <div key={section} className="rounded-[8px] border border-[#7b6140] bg-[#6e6e6e] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="font-['Cormorant_Garamond'] text-[28px] font-semibold text-white">
                          {section}
                        </h2>
                        {items.length > 0 && (
                          <span className="rounded-full bg-white/25 px-2 py-1 text-[10px] font-semibold text-white">
                            {items.length}
                          </span>
                        )}
                      </div>

                      {items.length === 0 ? (
                        <div className="min-h-[150px] rounded-[6px] border border-white/20 bg-[#8f8f8f]/45" />
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {items.map((item, index) => (
                            <div key={item._id || `${section}-${index}`} className="rounded-[6px] bg-[#8f8f8f] p-2">
                              <div className="mb-2 flex items-center justify-between text-[10px] text-white">
                                <span>{item.details?.planningType || "Decoration"}</span>
                                <button type="button" onClick={() => removeItem(item._id)} className="text-white/85">
                                  ×
                                </button>
                              </div>
                              <div className="relative overflow-hidden rounded-[4px] border border-white/20 bg-[#d8d8d8]">
                                <img
                                  src={item.url}
                                  alt={item.label || `${section} vision`}
                                  className="aspect-[4/3] w-full object-cover"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <aside className="rounded-[8px] border border-[#7b6140] bg-[#211914] p-3">
                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] text-white/60">Budget Range</label>
                    <input
                      value={eventDetails.budget}
                      onChange={(e) => setEventDetails((prev) => ({ ...prev, budget: e.target.value }))}
                      className="w-full rounded-[6px] border border-white/10 bg-[#f4f0ea] px-3 py-2 text-sm text-[#1d1714] outline-none"
                      placeholder="4-5 Lakh"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-white/60">End Bid in</label>
                    <select
                      value={eventDetails.bidDays}
                      onChange={(e) => setEventDetails((prev) => ({ ...prev, bidDays: e.target.value }))}
                      className="w-full rounded-[6px] border border-white/10 bg-[#f4f0ea] px-3 py-2 text-sm text-[#1d1714] outline-none"
                    >
                      <option>3 Days</option>
                      <option>5 Days</option>
                      <option>7 Days</option>
                      <option>10 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-white/60">Description</label>
                    <textarea
                      value={eventDetails.notes}
                      onChange={(e) => setEventDetails((prev) => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[130px] w-full rounded-[6px] border border-white/10 bg-[#f4f0ea] px-3 py-2 text-sm text-[#1d1714] outline-none"
                      placeholder="I want my wedding similar to the generated vision."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mx-auto mt-2 rounded-[6px] bg-[#f4f0ea] px-8 py-2.5 text-sm font-semibold text-[#1d1714] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Placing Bid..." : "Place Bid"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

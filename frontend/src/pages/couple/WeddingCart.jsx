// pages/couple/WeddingCart.jsx — localStorage cart → submit as RFQ
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { quoteAPI, apiFetch } from '../../api/api';

const WeddingCart = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Event detail overrides
  const [eventDetails, setEventDetails] = useState({
    budget: '',
    guestCount: '',
    city: '',
    venue: '',
    tradition: '',
    notes: '',
  });

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await apiFetch('/cart');
        if (res.success) {
          setCartItems(res.cart?.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch cart:', err);
        // Fallback to localStorage for legacy support
        const cartKey = `weddingCart_${currentUser?.uid}`;
        const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setCartItems(cart);
      }
    };
    
    if (currentUser) fetchCart();

    // Pre-fill from wedding profile
    if (currentUser?.weddingProfile) {
      const wp = currentUser.weddingProfile;
      setEventDetails((prev) => ({
        ...prev,
        budget: wp.budget || '',
        guestCount: wp.guestCount || '',
        city: wp.city || '',
        venue: wp.venue || '',
        tradition: wp.tradition || '',
      }));
    }
  }, [currentUser]);

  const removeItem = async (itemId) => {
    try {
      await apiFetch(`/cart/${itemId}`, { method: 'DELETE' });
      const res = await apiFetch('/cart');
      if (res.success) setCartItems(res.cart?.items || []);
    } catch (err) {
      console.error('Failed to remove item:', err);
      // Optimistic update fallback
      const updated = cartItems.filter((item) => item._id !== itemId);
      setCartItems(updated);
    }
  };

  const clearCart = () => {
    setCartItems([]);
    const cartKey = `weddingCart_${currentUser?.uid}`;
    localStorage.removeItem(cartKey);
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      setError('Your cart is empty. Add AI visions first!');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Map cart items to the Quote model structure
      const images = cartItems.map(item => ({
        url: item.url,
        label: item.label || '',
        prompt: item.prompt || ''
      }));

      const quoteData = {
        images: images,
        eventDetails: {
          weddingDate: currentUser?.weddingProfile?.weddingDate || null,
          budget: eventDetails.budget || '',
          guestCount: parseInt(eventDetails.guestCount) || 0,
          city: eventDetails.city || '',
          venue: eventDetails.venue || '',
          tradition: eventDetails.tradition || '',
          notes: eventDetails.notes || ''
        }
      };

      console.log('📤 Submitting quote:', quoteData);

      const data = await quoteAPI.submit(quoteData);

      console.log('✅ Quote submitted successfully:', data);

      if (data.success) {
        // Clear backend cart
        try {
          await apiFetch('/cart', { method: 'DELETE' });
          console.log('🗑️ Cart cleared');
        } catch (clearErr) {
          console.error('Failed to clear cart:', clearErr);
          // Don't fail the whole operation if cart clear fails
        }
        
        setSuccess(true);
        setTimeout(() => navigate('/couple/bid-placed'), 1500);
      }
    } catch (err) {
      console.error('Submit quote error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to submit. Please try again.';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen loverai-page-bg flex items-center justify-center">
        <div className="text-center animate-fadeInUp">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-heading loverai-gradient-text mb-3">Quote Submitted!</h2>
          <p className="text-white/50 text-sm">Planners will review your vision and send quotes soon.</p>
          <p className="text-white/30 text-xs mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen loverai-page-bg">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-white/40 hover:text-white/70 text-sm mb-3 flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-heading loverai-gradient-text">
              Wedding Cart 🛒
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Review your AI visions and submit a request for planner quotes
            </p>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        {cartItems.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-5xl mb-4">🎨</p>
            <p className="text-white/50 mb-2">Your cart is empty</p>
            <p className="text-white/30 text-sm mb-6">
              Generate AI wedding visions and add them to your cart
            </p>
            <button
              onClick={() => navigate('/love-story')}
              className="loverai-btn-primary !rounded-xl !px-8"
            >
              Create Wedding Vision
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Images */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-white/70 text-sm font-medium mb-4">
                  Selected Visions ({cartItems.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={item.url}
                        alt={item.label || `Vision ${idx + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={() => removeItem(idx)}
                          className="w-24 bg-red-500/80 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => navigate('/love-story')}
                          className="w-24 bg-white/20 backdrop-blur-md text-white border border-white/40 text-xs px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleSubmit}
                          className="w-24 bg-loverai-gold text-loverai-dark font-bold text-xs px-3 py-1.5 rounded-lg hover:brightness-110 transition-all"
                        >
                          Place Bid
                        </button>
                      </div>
                      {item.label && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                          <p className="text-white/70 text-[10px] truncate">{item.label}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Event Details Sidebar */}
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-white/70 text-sm font-medium mb-4">
                  Event Details
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'budget', label: 'Budget (₹)', placeholder: 'e.g. 15,00,000' },
                    { key: 'guestCount', label: 'Guest Count', placeholder: 'e.g. 300', type: 'number' },
                    { key: 'city', label: 'City', placeholder: 'e.g. Mumbai' },
                    { key: 'venue', label: 'Venue', placeholder: 'e.g. Marriott' },
                    { key: 'tradition', label: 'Tradition', placeholder: 'e.g. Hindu' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="text-white/40 text-xs mb-1 block">{field.label}</label>
                      <input
                        type={field.type || 'text'}
                        value={eventDetails[field.key]}
                        onChange={(e) =>
                          setEventDetails((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Notes for Planner</label>
                    <textarea
                      value={eventDetails.notes}
                      onChange={(e) =>
                        setEventDetails((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Any special requests..."
                      rows={3}
                      className="w-full glass-input rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || cartItems.length === 0}
                className="w-full loverai-btn-primary !rounded-xl !py-3.5 text-[15px] disabled:opacity-50"
              >
                {submitting ? 'Placing Bid...' : `Place Bid (${cartItems.length} visions)`}
              </button>

              <p className="text-white/20 text-[11px] text-center">
                Planners will receive your visions and respond with quotes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeddingCart;

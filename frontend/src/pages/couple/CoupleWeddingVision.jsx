import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { coupleMoodboardAPI, moodboardAPI } from "../../api/api";
import CreditWalletBadge from "../../components/couple/CreditWalletBadge";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const FUNCTION_OPTIONS = [
  "Haldi",
  "Mehndi",
  "Sangeet",
  "Wedding Ceremony",
  "Reception",
  "Small Function (Birthday, Engagement)",
];

const VENUE_OPTIONS = [
  "Outdoor Lawn",
  "Banquet Hall",
  "Palace / Heritage",
  "Beachfront",
  "Poolside",
  "Rooftop",
];

const DEFAULT_PALETTES = {
  Haldi: ["#F59E0B", "#EAB308", "#FEF08A", "#84CC16", "#166534"],
  Mehndi: ["#059669", "#10B981", "#6EE7B7", "#F59E0B", "#D97706"],
  Sangeet: ["#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#1E1B4B"],
  "Wedding Ceremony": ["#DC2626", "#B91C1C", "#F59E0B", "#FEF08A", "#7F1D1D"],
  Reception: ["#1E293B", "#334155", "#E2E8F0", "#F59E0B", "#0F172A"],
  "Small Function (Birthday, Engagement)": ["#EC4899", "#F472B6", "#FDE047", "#60A5FA", "#3B82F6"],
};

export default function CoupleWeddingVision() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // Sidebar Filters State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [referenceFile, setReferenceFile] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [functionType, setFunctionType] = useState("Haldi");
  const [guestCount, setGuestCount] = useState(0);
  const [theme, setTheme] = useState("Modern");
  const [venueType, setVenueType] = useState("Outdoor Lawn");
  const [activePalette, setActivePalette] = useState(DEFAULT_PALETTES["Haldi"]);

  // Custom Color Picker input ref
  const colorInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Top Search/Prompt Bar
  const [userPrompt, setUserPrompt] = useState("");

  // AI Generated Results mapped across budget tiers: { low: [...], medium: [...], high: [...] }
  const [generatedTiers, setGeneratedTiers] = useState({
    low: { decor: [], styling: [], entertainment: [] },
    medium: { decor: [], styling: [], entertainment: [] },
    high: { decor: [], styling: [], entertainment: [] },
  });

  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState(null);

  // Lightbox / Modal State
  const [selectedImage, setSelectedImage] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Menu Dropdown
  const [menuOpen, setMenuOpen] = useState(false);

  // Auto-close sidebar on small screens
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Update palette when functionType changes
  useEffect(() => {
    setActivePalette(DEFAULT_PALETTES[functionType] || DEFAULT_PALETTES["Haldi"]);
  }, [functionType]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50MB");
      return;
    }
    setReferenceFile(file);
    const reader = new FileReader();
    reader.onload = () => setReferencePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAddCustomColor = (e) => {
    const newColor = e.target.value;
    if (newColor && !activePalette.includes(newColor)) {
      setActivePalette((prev) => [...prev.slice(0, 5), newColor]);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setGenerationStep("Analyzing wedding parameters & inspirations...");
    const loadingToast = toast.loading("Generating your 3-Tier AI Wedding Vision...");

    try {
      const basePrompt = userPrompt.trim() ||
        `Create a complete 3-tier luxury wedding concept for ${functionType} at ${venueType} with ${theme} styling, color palette ${activePalette.join(", ")}, guest count ${guestCount > 0 ? guestCount : "150"}.`;

      const formData = new FormData();
      if (referenceFile) {
        formData.append("venueImage", referenceFile);
      }
      formData.append("style", theme);
      formData.append("functionType", functionType);
      formData.append("atmosphere", `${theme} Luxury Wedding`);
      formData.append("timing", "Evening (Warm Glow)");
      formData.append("userPrompt", basePrompt);

      setGenerationStep("Synthesizing Low, Medium & High Budget Concepts...");
      const result = await coupleMoodboardAPI.generate(formData);

      if (result.success && (result.generatedImages?.length > 0 || result.generatedImageUrl)) {
        const rawImages = result.generatedImages?.length > 0 
          ? result.generatedImages 
          : [{ url: result.generatedImageUrl, label: "Generated Scene" }];

        // Map generated AI images into the 3 tiers (Low, Medium, High) dynamically
        const newTiers = {
          low: {
            decor: [],
            styling: [],
            entertainment: [],
          },
          medium: {
            decor: [],
            styling: [],
            entertainment: [],
          },
          high: {
            decor: [],
            styling: [],
            entertainment: [],
          },
        };

        rawImages.forEach((img, idx) => {
          const item = {
            url: img.url,
            title: img.label || `${functionType} Vision ${idx + 1}`,
            seed: img.seed,
          };

          // Distribute across tiers and categories
          if (idx === 0) {
            newTiers.medium.decor.push({ ...item, title: `${theme} Mandap & Decor` });
          } else if (idx === 1) {
            newTiers.low.decor.push({ ...item, title: `Intimate ${functionType} Canopy` });
          } else if (idx === 2) {
            newTiers.high.decor.push({ ...item, title: `Grand Palace ${functionType} Setup` });
          } else if (idx === 3) {
            newTiers.medium.styling.push({ ...item, title: `Designer Couple Attire` });
          } else if (idx === 4) {
            newTiers.low.styling.push({ ...item, title: `Coordinated Couple Look` });
          } else if (idx === 5) {
            newTiers.high.styling.push({ ...item, title: `Royal Haute Couture` });
          } else if (idx % 3 === 0) {
            newTiers.medium.entertainment.push({ ...item, title: `Live Entertainment & Dining` });
          } else if (idx % 3 === 1) {
            newTiers.low.entertainment.push({ ...item, title: `Traditional Activities` });
          } else {
            newTiers.high.entertainment.push({ ...item, title: `Gala Feast & Performance` });
          }
        });

        // Ensure at least each tier receives visual concepts
        if (rawImages.length === 1) {
          const single = rawImages[0];
          newTiers.medium.decor.push({ url: single.url, title: `${functionType} Main Vision` });
        }

        setGeneratedTiers(newTiers);
        setHasGenerated(true);
        toast.success("AI Wedding Visions Generated!", { id: loadingToast });
      } else {
        throw new Error(result.error || "Generation failed");
      }
    } catch (err) {
      console.error("Moodboard generation error:", err);
      toast.dismiss(loadingToast);
      if (err.response?.status === 402) {
        toast.error("Insufficient Credits! Please upgrade your plan.");
        setError(
          <div className="flex flex-col items-center gap-2 p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-center">
            <span className="font-bold text-red-200">Insufficient Credits</span>
            <span className="text-xs text-red-300/80">You have used all your AI credits. Please upgrade your plan to continue generating.</span>
            <button
              onClick={() => navigate("/pricing")}
              className="mt-2 px-5 py-2 bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] text-xs font-bold uppercase rounded-full hover:brightness-110"
            >
              Upgrade Plan
            </button>
          </div>
        );
      } else {
        toast.error(err.response?.data?.error || err.message || "Failed to generate moodboard");
      }
    } finally {
      setGenerating(false);
      setGenerationStep("");
    }
  };

  const handleEditImage = async () => {
    if (!selectedImage || !editPrompt.trim()) return;
    setIsEditing(true);
    const toastId = toast.loading("Refining image with AI...");

    try {
      const response = await fetch(selectedImage.url);
      const blob = await response.blob();
      const file = new File([blob], "edit-target.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", file);
      formData.append("editPrompt", editPrompt);
      formData.append("functionType", functionType);
      formData.append("style", theme);

      const result = await coupleMoodboardAPI.editImage(formData);

      if (result.success && result.image?.url) {
        setSelectedImage((prev) => ({
          ...prev,
          url: result.image.url,
          title: `Refined: ${editPrompt}`,
        }));
        toast.success("Image refined successfully!", { id: toastId });
        setEditPrompt("");
      } else {
        throw new Error(result.error || "Failed to refine image");
      }
    } catch (err) {
      console.error("Edit image error:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to refine image", { id: toastId });
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveToMoodboard = async (imgObj) => {
    try {
      const payload = {
        boardId: `mb_${Date.now()}`,
        theme: functionType.toLowerCase(),
        title: `${functionType} Vision`,
        style: theme,
        functionType: functionType,
        prompt: userPrompt || `${functionType} ${theme} Wedding Scene`,
        images: [{ url: imgObj.url, title: imgObj.title }],
        details: { venueType, guestCount, theme },
      };
      await moodboardAPI.saveMoodboard(payload);
      toast.success("Saved to Moodboard!");
    } catch (err) {
      console.error("Save moodboard error:", err);
      toast.error("Failed to save to moodboard");
    }
  };

  const handleAddToCart = (imgObj) => {
    try {
      const existing = JSON.parse(localStorage.getItem("loversai_cart") || "[]");
      const newItem = {
        id: `cart_${Date.now()}`,
        title: imgObj.title || `${functionType} Wedding Scene`,
        functionType: functionType,
        imageUrl: imgObj.url,
        budget: "Custom",
        category: "Decor & Vision",
        price: 15000,
      };
      localStorage.setItem("loversai_cart", JSON.stringify([...existing, newItem]));
      toast.success("Added to Wedding Cart!");
    } catch (e) {
      toast.error("Failed to add to cart");
    }
  };

  return (
    <div className="min-h-screen bg-[#120c09] text-[#F9F7F5] font-['Poppins',sans-serif] selection:bg-[#d4a878]/30 selection:text-white">
      {/* ─── TOP HEADER BAR ─── */}
      <header className="sticky top-0 z-40 bg-[#150d0a]/90 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between shadow-2xl">
        {/* Left Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/couples")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#201612] hover:bg-white/10 border border-white/15 text-white/90 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <span>{"←"}</span> Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/couple/moodboard")}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#201612] hover:bg-white/10 border border-white/15 text-white/90 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            Moodboards
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#201612] hover:bg-white/10 border border-white/15 text-white/90 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span>{sidebarOpen ? "Hide Filters" : "Show Filters"}</span>
          </button>
        </div>

        {/* Center Title */}
        <div className="text-center px-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-white font-['Cormorant_Garamond',serif] tracking-wide">
            Create Your Wedding Vision
          </h1>
          <p className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold tracking-[0.24em] text-[#e6c6b2]/80 uppercase mt-0.5">
            See Your Unique Wedding Design Come to Life
          </p>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 relative">
          <CreditWalletBadge />

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-full bg-[#201612] hover:bg-white/10 border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* User Menu Dropdown */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 w-52 bg-[#18110e]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate("/couples"); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
                >
                  <span>{"🏡"}</span> Home
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate("/couple/profile"); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
                >
                  <span>{"👤"}</span> Profile
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate("/couple/moodboard"); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
                >
                  <span>{"🎨"}</span> Saved Moodboards
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate("/couple/cart"); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
                >
                  <span>{"🛒"}</span> Wedding Cart
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate("/pricing"); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 font-medium"
                >
                  <span>{"⚡"}</span> Upgrade Plan
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); logout(); navigate("/login"); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                >
                  <span>{"🚪"}</span> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ─── MAIN LAYOUT CONTAINER ─── */}
      <main className="max-w-[1750px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* ─── LEFT SIDEBAR: STYLE FILTERS ─── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -30, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: -30, width: 0 }}
              className="w-full lg:w-[320px] shrink-0 bg-[#18110e]/95 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 sm:p-6 space-y-6 shadow-2xl"
            >
              <h2 className="text-xs font-bold tracking-[0.22em] text-white uppercase flex items-center gap-2 border-b border-white/10 pb-3">
                Style Filters
              </h2>

              {/* Reference Uploads */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  Reference Uploads
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {referencePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/20 aspect-video group">
                    <img src={referencePreview} alt="Reference" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-xs font-semibold"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReferenceFile(null); setReferencePreview(null); }}
                        className="p-1 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-xs font-bold"
                      >
                        {"✕"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/20 hover:border-[#d4a878]/60 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-[#d4a878]/20 flex items-center justify-center text-white/70 group-hover:text-[#d4a878] transition-all shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">Upload Inspiration</p>
                        <p className="text-[10px] text-white/40">Reels, Pinterest, screenshots</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-[#291e18] group-hover:bg-[#382821] border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider"
                    >
                      Browse
                    </button>
                  </div>
                )}
              </div>

              {/* Functions */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  Functions
                </label>
                <div className="relative">
                  <select
                    value={functionType}
                    onChange={(e) => setFunctionType(e.target.value)}
                    className="w-full appearance-none bg-[#f2dad0] text-[#201913] font-bold text-xs rounded-xl p-3 px-4 pr-10 cursor-pointer shadow-md focus:outline-none"
                  >
                    {FUNCTION_OPTIONS.map((func) => (
                      <option key={func} value={func} className="bg-[#241a16] text-white font-medium">
                        {func}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#201913]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Guest (Pax) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  <span>Guest (Pax)</span>
                  <span className="text-white text-xs font-bold">{guestCount}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="25"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full accent-[#d4a878] bg-white/10 h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-white/40 font-semibold">
                  <span>0</span>
                  <span>1000</span>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#201612] p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setTheme("Modern")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      theme === "Modern"
                        ? "bg-[#f2dad0] text-[#201913] shadow-md"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Modern
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("Traditional")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      theme === "Traditional"
                        ? "bg-[#f2dad0] text-[#201913] shadow-md"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Traditional
                  </button>
                </div>
              </div>

              {/* Venue */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  Venue
                </label>
                <div className="relative">
                  <select
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value)}
                    className="w-full appearance-none bg-[#f2dad0] text-[#201913] font-bold text-xs rounded-xl p-3 px-4 pr-10 cursor-pointer shadow-md focus:outline-none"
                  >
                    {VENUE_OPTIONS.map((v) => (
                      <option key={v} value={v} className="bg-[#241a16] text-white font-medium">
                        {v}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#201913]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                  Color Palette
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {activePalette.map((color, idx) => (
                    <div
                      key={idx}
                      style={{ backgroundColor: color }}
                      className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md hover:scale-110 transition-all cursor-pointer"
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    ref={colorInputRef}
                    onChange={handleAddCustomColor}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    className="w-8 h-8 rounded-full border border-dashed border-white/40 hover:border-white text-white/60 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                    title="Add Custom Color"
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ─── MAIN STAGE / CONTENT AREA ─── */}
        <section className="flex-1 w-full space-y-6">
          {/* Error Alert */}
          {error && <div className="mb-4">{error}</div>}

          {/* Top Prompt / Generation Bar */}
          <div className="bg-[#18110e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 sm:p-2.5 px-4 flex items-center gap-3 shadow-2xl">
            <span className="text-[#d4a878] text-base shrink-0">{"✦"}</span>
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="Describe your Wedding Scene..."
              className="w-full bg-transparent text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none"
            />
            <span className="text-[#d4a878] text-base shrink-0 mr-2">{"✦"}</span>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className="bg-gradient-to-r from-[#f2dad0] to-[#e6c6b2] text-[#201913] px-5 sm:px-7 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#d4a878]/10 flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-[#201913]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>{"✦"}</span>
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {/* ─── 3 BUDGET TIERS GRID ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
            {/* Low Budget Column */}
            <BudgetColumn
              tierTitle="LOW BUDGET"
              budgetEstimate="₹ 6 - 8 Lakhs"
              decorImages={generatedTiers.low.decor}
              stylingImages={generatedTiers.low.styling}
              entertainmentImages={generatedTiers.low.entertainment}
              isGenerating={generating}
              generationStep={generationStep}
              functionType={functionType}
              onImageClick={(img) => setSelectedImage(img)}
              onQuickGenerate={handleGenerate}
            />

            {/* Medium Budget Column (Highlighted) */}
            <BudgetColumn
              tierTitle="MEDIUM BUDGET"
              isHighlighted={true}
              budgetEstimate="₹ 12 - 18 Lakhs"
              decorImages={generatedTiers.medium.decor}
              stylingImages={generatedTiers.medium.styling}
              entertainmentImages={generatedTiers.medium.entertainment}
              isGenerating={generating}
              generationStep={generationStep}
              functionType={functionType}
              onImageClick={(img) => setSelectedImage(img)}
              onQuickGenerate={handleGenerate}
            />

            {/* High Budget Column */}
            <BudgetColumn
              tierTitle="HIGH BUDGET"
              budgetEstimate="₹ 20 Lakhs+"
              decorImages={generatedTiers.high.decor}
              stylingImages={generatedTiers.high.styling}
              entertainmentImages={generatedTiers.high.entertainment}
              isGenerating={generating}
              generationStep={generationStep}
              functionType={functionType}
              onImageClick={(img) => setSelectedImage(img)}
              onQuickGenerate={handleGenerate}
            />
          </div>

          {/* ─── BOTTOM DISCLAIMER CAPSULE ─── */}
          <div className="bg-[#18110e]/80 border border-white/10 rounded-2xl p-4 px-5 flex items-center gap-3 text-xs text-white/60 backdrop-blur-xl">
            <span className="text-amber-400 text-base shrink-0">{"💡"}</span>
            <p className="leading-relaxed">
              These designs are AI-generated inspirations based on your inputs and reference images. Final execution may vary based on venue, availability and customization.
            </p>
          </div>
        </section>
      </main>

      {/* ─── IMAGE INSPECTION / ACTION LIGHTBOX MODAL ─── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#18110e] border border-white/15 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-light text-white font-['Cormorant_Garamond',serif]">
                    {selectedImage.title || `${functionType} Design Scene`}
                  </h3>
                  <p className="text-[11px] text-white/50 tracking-wider uppercase font-semibold">
                    {functionType} • {theme} Theme
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm cursor-pointer"
                >
                  {"✕"}
                </button>
              </div>

              {/* Large Image Preview */}
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black max-h-[50vh] flex items-center justify-center">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="max-h-[50vh] w-auto object-contain"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(selectedImage)}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] text-xs font-bold uppercase rounded-full hover:brightness-110 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{"🛒"}</span> Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToMoodboard(selectedImage)}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold uppercase rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{"💾"}</span> Save Moodboard
                  </button>
                </div>

                <a
                  href={selectedImage.url}
                  download="loversai-wedding-vision.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{"⬇️"}</span> Download
                </a>
              </div>

              {/* AI Image Refinement Box */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                <label className="text-[11px] font-bold text-[#d4a878] uppercase tracking-wider flex items-center gap-1.5">
                  <span>{"✦"}</span> Refine / Edit this scene with AI
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g. Change floral colors to royal red, add fairy lights..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={isEditing || !editPrompt.trim()}
                    onClick={handleEditImage}
                    className="px-5 py-2 bg-gradient-to-r from-[#f2dad0] to-[#e6c6b2] text-[#201913] text-xs font-bold uppercase rounded-xl hover:brightness-110 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                  >
                    {isEditing ? "Refining..." : "Refine"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── HELPER COMPONENT: BUDGET COLUMN ───
function BudgetColumn({
  tierTitle,
  isHighlighted = false,
  budgetEstimate,
  decorImages = [],
  stylingImages = [],
  entertainmentImages = [],
  isGenerating = false,
  generationStep = "",
  functionType = "Haldi",
  onImageClick,
  onQuickGenerate,
}) {
  return (
    <div
      className={`rounded-3xl border flex flex-col p-4 sm:p-5 space-y-5 transition-all ${
        isHighlighted
          ? "bg-[#1b130f]/95 border-[#d4a878]/40 shadow-2xl shadow-[#d4a878]/10"
          : "bg-[#18110e]/90 border-white/10 shadow-xl"
      }`}
    >
      {/* Tier Header */}
      {isHighlighted ? (
        <div className="bg-gradient-to-r from-[#443325] to-[#59422e] border border-[#d4a878]/40 rounded-2xl p-3 px-4 flex items-center justify-between shadow-lg -mx-1 -mt-1">
          <h3 className="font-bold text-xs sm:text-sm tracking-wider text-[#f5eada] uppercase">
            {tierTitle}
          </h3>
          <span className="text-[11px] sm:text-xs text-[#d4a878] font-bold">
            Estimated {budgetEstimate}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="font-bold text-xs sm:text-sm tracking-wider text-white uppercase">
            {tierTitle}
          </h3>
          <span className="text-[11px] sm:text-xs text-[#d4a878] font-medium">
            Estimated {budgetEstimate}
          </span>
        </div>
      )}

      {/* 1. Decor & Venue */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold tracking-[0.18em] text-white/50 uppercase block">
          Decor & Venue
        </span>
        <div className="grid grid-cols-2 gap-2">
          {decorImages.length > 0 ? (
            decorImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => onImageClick(img)}
                className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group cursor-pointer shadow-md bg-black/40"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-semibold text-white line-clamp-2">{img.title}</span>
                </div>
              </div>
            ))
          ) : (
            // 4 Placeholder slots waiting for AI Generation
            [1, 2, 3, 4].map((slot) => (
              <PlaceholderSlot
                key={slot}
                aspect="aspect-[4/3]"
                label={slot === 1 ? "Mandap Setup" : slot === 2 ? "Aisle & Walkway" : slot === 3 ? "Lounge Seating" : "Photobooth"}
                isGenerating={isGenerating}
                onQuickGenerate={onQuickGenerate}
              />
            ))
          )}
        </div>
      </div>

      {/* 2. Bride, Groom & Family Styling */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold tracking-[0.18em] text-white/50 uppercase block">
          Bride, Groom & Family Styling
        </span>
        <div className="grid grid-cols-2 gap-2">
          {stylingImages.length > 0 ? (
            stylingImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => onImageClick(img)}
                className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 group cursor-pointer shadow-md bg-black/40"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-semibold text-white line-clamp-2">{img.title}</span>
                </div>
              </div>
            ))
          ) : (
            // 2 Placeholder slots for Styling
            [1, 2].map((slot) => (
              <PlaceholderSlot
                key={slot}
                aspect="aspect-[3/4]"
                label={slot === 1 ? "Couple Attire" : "Family Styling"}
                isGenerating={isGenerating}
                onQuickGenerate={onQuickGenerate}
              />
            ))
          )}
        </div>
      </div>

      {/* 3. Games, Food & Entertainment */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold tracking-[0.18em] text-white/50 uppercase block">
          Games, Food & Entertainment
        </span>
        <div className="grid grid-cols-3 gap-2">
          {entertainmentImages.length > 0 ? (
            entertainmentImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => onImageClick(img)}
                className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group cursor-pointer shadow-md bg-black/40"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-1 text-center">
                  <span className="text-[9px] font-semibold text-white line-clamp-2">{img.title}</span>
                </div>
              </div>
            ))
          ) : (
            // 3 Placeholder slots for Entertainment & Food
            [1, 2, 3].map((slot) => (
              <PlaceholderSlot
                key={slot}
                aspect="aspect-square"
                label={slot === 1 ? "Games & Activities" : slot === 2 ? "Food Counters" : "Live Music"}
                isGenerating={isGenerating}
                onQuickGenerate={onQuickGenerate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HELPER: SLEEK EMPTY / GENERATING PLACEHOLDER SLOT ───
function PlaceholderSlot({ aspect = "aspect-square", label = "", isGenerating = false, onQuickGenerate }) {
  return (
    <div
      onClick={!isGenerating ? onQuickGenerate : undefined}
      className={`${aspect} rounded-xl border border-dashed border-white/10 hover:border-[#d4a878]/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center p-2 text-center group cursor-pointer relative overflow-hidden`}
    >
      {isGenerating ? (
        <div className="flex flex-col items-center gap-1.5 animate-pulse">
          <div className="w-5 h-5 rounded-full border-2 border-[#d4a878] border-t-transparent animate-spin" />
          <span className="text-[9px] text-[#d4a878] font-medium tracking-wide">Generating...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[#d4a878]/60 group-hover:text-[#d4a878] text-xs transition-colors">{"✦"}</span>
          <span className="text-[9px] text-white/50 group-hover:text-white/80 font-medium tracking-wide transition-colors line-clamp-2">
            {label}
          </span>
          <span className="text-[8px] text-white/30 group-hover:text-[#d4a878]/80 transition-colors uppercase tracking-widest font-semibold">
            AI Vision
          </span>
        </div>
      )}
    </div>
  );
}

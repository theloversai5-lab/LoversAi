import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { coupleMoodboardAPI } from "../../api/api";
import { saveThemeMoodboard } from "./CoupleThemeMoodboard";
import { useAuth } from "../../context/AuthContext";

const FUNCTION_OPTIONS = [
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Wedding Ceremony",
  "Reception",
  "Engagement",
  "Nikah",
];

const ATMOSPHERE_OPTIONS = [
  "Warm & Festive",
  "Romantic & Intimate",
  "Grand & Opulent",
  "Minimal & Elegant",
  "Bohemian & Free-spirited",
  "Royal & Regal",
];

const TIMING_OPTIONS = [
  "Morning (Day light)",
  "Afternoon (Bright)",
  "Sunset (Golden Hour)",
  "Evening (Warm Glow)",
  "Night (Under Stars)",
];

const PLANNING_OPTIONS = ["Decor / Planning / Venue", "Fashion / Photography", "Sounds / Lights / Entertainment"];
const VENUE_OPTIONS = ["Banquet", "Open Lawn"];
const THEME_OPTIONS = ["Carnival", "Royal", "Pastel", "Garden", "Minimal Luxe"];

const TITLE_MAP = {
  Haldi: "Golden Dreams of Haldi",
  Mehendi: "Henna Garden Reverie",
  "Wedding Ceremony": "Eternal Sacred Vows",
  Reception: "A Night to Remember",
  Sangeet: "Rhythms of Celebration",
  Engagement: "Promise of Forever",
  Nikah: "Blessings of Nikkah",
};

const getThemeFromFunction = (value = "") => {
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

const getColorToneColor = (tone) => {
  switch (tone) {
    case "Warm Gold": return "#e6c6b2";
    case "Pastel Rose": return "#dcaea8";
    case "Royal Cream": return "#f5eada";
    case "Emerald Forest": return "#2d5a27";
    case "Midnight Blue": return "#1a365d";
    default: return null;
  }
};

const getLightingIcon = (lighting) => {
  switch (lighting) {
    case "Golden Hour":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M5.64 18.36l-1.42 1.42M19.78 4.22l-1.42 1.42" />
        </svg>
      );
    case "Candlelit Glow":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c-.5 2.5-2 3.5-2 5.5 0 2 1.5 3.5 2 3.5s2-1.5 2-3.5c0-2-1.5-3-2-5.5z" />
          <path d="M9 18h6v3H9z" />
        </svg>
      );
    case "Bright Daylight":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="6" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      );
    case "Moody & Dramatic":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    case "Fairy Light Sparkle":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9L12 3Z" />
        </svg>
      );
    default:
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9L12 3Z" />
        </svg>
      );
  }
};

const getThemeIcon = (themeStyle) => {
  switch (themeStyle) {
    case "Traditional Luxe":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2s-8 6-8 12h16c0-6-8-12-8-12Z" />
          <path d="M4 18v3h16v-3" />
        </svg>
      );
    case "Modern Minimalist":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
        </svg>
      );
    case "Bohemian Garden":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c1.5 3 0 6-3 6s-6-1.5-6-3 4.5-3 9-3Zm0 0c-1.5 3 0 6 3 6s6-1.5 6-3-4.5-3-9-3ZM12 2v20" />
        </svg>
      );
    case "Vintage Royal":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7Z" />
          <circle cx="12" cy="18" r="2" />
        </svg>
      );
    case "Bollywood Glam":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      );
    default:
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9L12 3Z" />
        </svg>
      );
  }
};

const getPlaceholderText = (id) => {
  switch (id) {
    case "primary": return "Describe couple pose, outfits, or primary scene setup...";
    case "decor": return "Describe floral colors, table detailing, or centerpieces...";
    case "ceremony": return "Describe altar, mandap structures, or ceremonial backdrop...";
    case "venue": return "Describe architectural scale, lighting setup, or scenery views...";
    default: return "Refine every detail of this wedding vision card...";
  }
};

const PhotoIcon = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const SparkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M19 16v5" />
    <path d="M21.5 18.5h-5" />
  </svg>
);

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default function CoupleWeddingVision() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [venueImage, setVenueImage] = useState(null);
  const [venuePreview, setVenuePreview] = useState(null);
  const [decorImage, setDecorImage] = useState(null);
  const [decorPreview, setDecorPreview] = useState(null);

  const [style, setStyle] = useState("Modern");
  const [functionType, setFunctionType] = useState("Haldi");
  const [atmosphere, setAtmosphere] = useState("Warm & Festive");
  const [timing, setTiming] = useState("Morning (Day light)");
  const [userPrompt, setUserPrompt] = useState("");
  const [budget, setBudget] = useState(11);
  const [guestCount, setGuestCount] = useState(0);
  const [planningType, setPlanningType] = useState("Decor / Planning / Venue");
  const [venueType, setVenueType] = useState("Banquet");
  const [theme, setTheme] = useState("Carnival");

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [generatedImages, setGeneratedImages] = useState([]);
  const [moodboardTitle, setMoodboardTitle] = useState("");
  const [generationMeta, setGenerationMeta] = useState(null);
  const [error, setError] = useState(null);
  const [savedTheme, setSavedTheme] = useState("");
  const [savedToMoodboard, setSavedToMoodboard] = useState(false);
  const [showMoodboardModal, setShowMoodboardModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [editingCard, setEditingCard] = useState(null);
  const [activeModalDropdown, setActiveModalDropdown] = useState(null);
  const [refinements, setRefinements] = useState({
    primary: { prompt: "", colorTone: "Original", lighting: "Original", theme: "Original" },
    decor: { prompt: "", colorTone: "Original", lighting: "Original", theme: "Original" },
    ceremony: { prompt: "", colorTone: "Original", lighting: "Original", theme: "Original" },
    venue: { prompt: "", colorTone: "Original", lighting: "Original", theme: "Original" }
  });

  const [modalPrompt, setModalPrompt] = useState("");
  const [modalColorTone, setModalColorTone] = useState("Original");
  const [modalLighting, setModalLighting] = useState("Original");
  const [modalTheme, setModalTheme] = useState("Original");

  useEffect(() => {
    if (editingCard) {
      const current = refinements[editingCard.id] || { prompt: "", colorTone: "Original", lighting: "Original", theme: "Original" };
      setModalPrompt(current.prompt);
      setModalColorTone(current.colorTone);
      setModalLighting(current.lighting);
      setModalTheme(current.theme);
    }
  }, [editingCard, refinements]);

  const venueInputRef = useRef(null);
  const decorInputRef = useRef(null);
  const sidebarScrollRef = useRef(null);

  useEffect(() => {
    if (activeDropdown === "timing" || activeDropdown === "venue") {
      const timer = setTimeout(() => {
        if (sidebarScrollRef.current) {
          sidebarScrollRef.current.scrollTo({
            top: sidebarScrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeDropdown]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const handleFileSelect = (file, type) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "venue") {
        setVenueImage(file);
        setVenuePreview(reader.result);
      } else {
        setDecorImage(file);
        setDecorPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const buildVisionPrompt = () => {
    const chips = [
      `${style} styling`,
      functionType,
      atmosphere,
      timing,
      `${venueType} venue`,
      `${theme} theme`,
      `${planningType.toLowerCase()} focus`,
      `budget around ${formatBudgetLabel(budget)}`,
      guestCount > 0 ? `${guestCount} guests` : null,
    ].filter(Boolean);

    let base = userPrompt.trim() || "Create a cinematic wedding scene with layered decor details.";

    const customRefinementTexts = [];
    Object.entries(refinements).forEach(([key, value]) => {
      const cardTitle = {
        primary: "Primary Scene",
        decor: "Decor Detail",
        ceremony: "Ceremony Detail",
        venue: "Venue Atmosphere"
      }[key];
      
      const parts = [];
      if (value.prompt.trim()) parts.push(value.prompt.trim());
      if (value.colorTone !== "Original") parts.push(`color tone: ${value.colorTone}`);
      if (value.lighting !== "Original") parts.push(`lighting: ${value.lighting}`);
      if (value.theme !== "Original") parts.push(`style: ${value.theme}`);
      
      if (parts.length > 0) {
        customRefinementTexts.push(`For ${cardTitle}: ${parts.join(", ")}`);
      }
    });

    if (customRefinementTexts.length > 0) {
      base = `${base} ${customRefinementTexts.join(". ")}.`;
    }

    return `${base}. ${chips.join(", ")}. Keep the result premium, photoreal, editorial, and celebration-ready.`;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSavedToMoodboard(false);
    setSavedTheme("");
    setGeneratedImages([]);
    setGenerationMeta(null);
    setMoodboardTitle("");
    setProgress("Preparing your wedding vision...");

    try {
      const formData = new FormData();
      if (venueImage) formData.append("venueImage", venueImage);
      if (decorImage) formData.append("decorImage", decorImage);
      formData.append("style", style);
      formData.append("functionType", functionType);
      formData.append("atmosphere", atmosphere);
      formData.append("timing", timing);
      formData.append("userPrompt", buildVisionPrompt());

      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress("Analyzing your wedding direction...");
      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress("Generating wedding scenes with Gemini AI...");

      const result = await coupleMoodboardAPI.generate(formData);

      if (result.success && result.generatedImages?.length > 0) {
        setGeneratedImages(result.generatedImages);
        setMoodboardTitle(result.moodboardTitle || TITLE_MAP[functionType] || "Wedding Vision");
        setGenerationMeta(result);
      } else if (result.success && result.generatedImageUrl) {
        setGeneratedImages([
          {
            url: result.generatedImageUrl,
            label: "Generated",
            seed: result.seed,
          },
        ]);
        setMoodboardTitle(TITLE_MAP[functionType] || "Wedding Vision");
        setGenerationMeta(result);
      } else {
        throw new Error(result.error || "Generation failed");
      }
    } catch (err) {
      const apiMessage = err.response?.data?.error;
      const apiDetails = err.response?.data?.details;
      const message = [apiMessage || err.message || "Generation failed. Please try again.", apiDetails]
        .filter(Boolean)
        .join(" ");
      console.error("Moodboard generation error:", err);
      setError(message);
    } finally {
      setProgress("");
      setGenerating(false);
    }
  };

  const handleAddToMoodboard = () => {
    if (generatedImages.length === 0) return;

    const boardTheme = saveThemeMoodboard({
      title: moodboardTitle || TITLE_MAP[functionType] || "Wedding Vision",
      images: generatedImages,
      style,
      functionType,
      atmosphere,
      timing,
      prompt: generationMeta?.finalPrompt || buildVisionPrompt(),
      details: {
        budget,
        guestCount,
        planningType,
        venueType,
        theme,
      },
    });

    setSavedTheme(boardTheme);
    setSavedToMoodboard(true);
    setShowMoodboardModal(true);
  };

  const openThemeBoard = () => {
    const boardTheme = savedTheme || getThemeFromFunction(functionType);
    navigate(`/couple/moodboard/${boardTheme}`);
  };

  const planAnotherFunction = () => {
    setShowMoodboardModal(false);
    setGeneratedImages([]);
    setGenerationMeta(null);
    setMoodboardTitle("");
    setSavedToMoodboard(false);
  };

  const coupleName =
    currentUser?.fullName ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Couple";

  const coupleInitial = coupleName.charAt(0).toUpperCase();

  const renderCustomSelect = (id, label, value, onChange, options, openDirection = "down") => {
    const isOpen = activeDropdown === id;
    
    return (
      <div className="rounded-[8px] border border-white/10 bg-white/5 pt-2.5 pb-3 px-3 flex flex-col justify-between h-[84px] flex-shrink-0 relative">
        <span className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[#ebd8c7] select-none">
          {label}
        </span>
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setActiveDropdown(isOpen ? null : id)}
            className="w-full flex items-center justify-between rounded-lg bg-[#f2dad0] text-[#251f1b] font-semibold px-2.5 py-1.5 text-[15px] outline-none transition text-left"
          >
            <span className="truncate">{value}</span>
            <span className="ml-1 flex-shrink-0">
              <svg
                className={`w-3 h-3 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          
          {isOpen && (
            <div
              className={`absolute right-0 left-0 z-50 w-full rounded-lg border border-white/10 bg-[#1d1714] p-1.5 shadow-xl flex flex-col gap-1 max-h-[160px] overflow-y-auto loverai-scrollbar ${
                openDirection === "up" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
              }`}
            >
              {options.map((option) => {
                const isSelected = value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setActiveDropdown(null);
                    }}
                    className="w-full flex items-center justify-between rounded-md px-2.5 py-1 text-left text-[15px] font-semibold hover:bg-white/5 transition text-white"
                  >
                    <span className={isSelected ? 'text-[#ebd8c7]' : 'text-white/85'}>{option}</span>
                    {isSelected && (
                      <span className="text-[#e6c6b2] flex-shrink-0 ml-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const FilterSection = ({ title, children }) => (
    <div className="rounded-[8px] border border-white/10 bg-[#2a241f] p-2.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
        {title}
      </p>
      {children}
    </div>
  );

  const SelectField = ({ value, onChange, options }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full loverai-select-peach"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );

  const renderModalSelect = (id, label, value, onChange, options) => {
    const isOpen = activeModalDropdown === id;
    
    return (
      <div className="flex flex-col gap-1.5 text-left w-full relative">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ebd8c7]/60 select-none">
          {label}
        </span>
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setActiveModalDropdown(isOpen ? null : id)}
            className="w-full flex items-center justify-between rounded-full border border-white/10 bg-[#251e1b]/60 hover:bg-black/40 hover:border-white/20 text-white font-medium px-4 py-2 text-xs outline-none transition duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              {id === "colorTone" && (
                <span
                  className="w-3 h-3 rounded-full border border-white/25 flex-shrink-0"
                  style={{
                    backgroundColor: getColorToneColor(value) || "transparent",
                    background: value === "Original" ? "linear-gradient(135deg, #555, #999)" : undefined
                  }}
                />
              )}
              {id === "lighting" && (
                <span className="text-[#ebd8c7] flex-shrink-0">
                  {getLightingIcon(value)}
                </span>
              )}
              {id === "themeStyle" && (
                <span className="text-[#ebd8c7] flex-shrink-0">
                  {getThemeIcon(value)}
                </span>
              )}
              <span className="truncate">{value}</span>
            </div>
            <span className="ml-1 flex-shrink-0 text-white/40">
              <svg
                className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          
          {isOpen && (
            <div className="absolute right-0 left-0 z-[120] w-full rounded-2xl border border-white/15 bg-[#17110e] p-1.5 shadow-2xl flex flex-col gap-0.5 max-h-[160px] overflow-y-auto loverai-scrollbar top-[calc(100%+4px)]">
              {options.map((option) => {
                const isSelected = value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setActiveModalDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-semibold hover:bg-white/5 transition text-white cursor-pointer ${
                      isSelected ? 'bg-white/10 text-[#ebd8c7]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {id === "colorTone" && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                          style={{
                            backgroundColor: getColorToneColor(option) || "transparent",
                            background: option === "Original" ? "linear-gradient(135deg, #555, #999)" : undefined
                          }}
                        />
                      )}
                      {id === "lighting" && (
                        <span className={`flex-shrink-0 ${isSelected ? 'text-[#ebd8c7]' : 'text-white/60'}`}>
                          {getLightingIcon(option)}
                        </span>
                      )}
                      {id === "themeStyle" && (
                        <span className={`flex-shrink-0 ${isSelected ? 'text-[#ebd8c7]' : 'text-white/60'}`}>
                          {getThemeIcon(option)}
                        </span>
                      )}
                      <span className={isSelected ? 'text-[#ebd8c7]' : 'text-white/85'}>{option}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[#ebd8c7] flex-shrink-0 ml-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PencilIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );

  const renderCard = (title, description, imageObj, planningFocus, heightClass, cardId) => {
    const hasImage = !!imageObj?.url;
    
    return (
      <div className={`relative rounded-[14px] border border-white/10 overflow-hidden group transition-all duration-300 ${heightClass} ${hasImage ? '' : 'loverai-glass-card flex flex-col items-center justify-center text-center p-4'}`}>
        {hasImage ? (
          <>
            <img src={imageObj.url} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4">
              <p className="font-['Cormorant_Garamond'] text-lg md:text-[20px] font-semibold text-[#f4e3c1] leading-tight">
                {title}
              </p>
              <p className="text-xs md:text-[13px] text-white/60 mt-0.5">
                {description}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center bg-white/5 mb-3 text-white/50">
              <PhotoIcon />
            </div>
            <p className="font-['Cormorant_Garamond'] text-base md:text-lg font-medium text-[#f4e3c1]">
              {title}
            </p>
            <p className="text-xs md:text-[12px] text-white/40 mt-1 max-w-[80%] mx-auto leading-normal">
              {description}
            </p>
          </div>
        )}
        
        {/* Edit Button in Top-Right */}
        <button
          type="button"
          onClick={() => {
            setEditingCard({
              id: cardId,
              title,
              description,
              imageObj,
              planningFocus
            });
          }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white/80 hover:bg-black/70 hover:text-white transition-all duration-200 cursor-pointer"
          aria-label={`Edit ${title}`}
        >
          <PencilIcon />
        </button>
      </div>
    );
  };

  const renderCanvas = () => {
    if (generating) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-white/75 h-full flex-1">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#e6c6b2]/30 border-t-[#e6c6b2]" />
          <p className="mt-4 font-['Cormorant_Garamond'] text-[24px] md:text-[28px] font-semibold text-[#ebd8c7]">
            Creating Your Wedding Vision
          </p>
          <p className="mt-1.5 text-xs text-white/60">
            {progress || "Preparing your wedding moodboard..."}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0 h-full justify-between">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 flex-1 min-h-0">
          {/* Column 1 (Wider) */}
          <div className="flex flex-col gap-4 min-h-0 justify-between">
            {renderCard(
              "Primary Wedding Scene",
              "Key generated vision scene",
              generatedImages[0],
              "Theme",
              "flex-[1.2] min-h-0",
              "primary"
            )}
            {renderCard(
              "Ceremony & Theme Detail",
              "Specific ritual & ceremonial setup",
              generatedImages[2],
              "Functions",
              "flex-[0.8] min-h-0",
              "ceremony"
            )}
          </div>
          
          {/* Column 2 */}
          <div className="flex flex-col gap-4 min-h-0 justify-between">
            {renderCard(
              "Decor & Detailing",
              "Table settings & floral design",
              generatedImages[1],
              "Decoration",
              "flex-[0.75] min-h-0",
              "decor"
            )}
            {renderCard(
              "Venue Atmosphere",
              "Atmospheric lighting & scale",
              generatedImages[3],
              "Venue",
              "flex-[1.25] min-h-0",
              "venue"
            )}
          </div>
        </div>

        {/* Move to Moodboard Button Centered */}
        <div className="mt-3.5 flex-shrink-0 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (generatedImages.length === 0) {
                setError("Please generate wedding scenes first before moving them to the moodboard.");
                return;
              }
              handleAddToMoodboard();
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition duration-250 loverai-btn-moodboard"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            {savedToMoodboard ? "Added to Moodboard" : "Move to Moodboard"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="loverai-wedding-shell h-screen max-h-screen overflow-hidden py-4 text-white px-3 md:px-6 flex items-center justify-center">
      <div
        className="loverai-wedding-bg"
        style={{ backgroundImage: 'url("/images/signup.png")' }}
      />
      <div className="loverai-wedding-overlay" />
      
      {/* Outer Container with Premium Glassmorphism */}
      <div className="relative z-10 mx-auto max-w-[1380px] w-full h-[calc(100vh-32px)] max-h-[960px] bg-white/5 backdrop-blur-2xl border border-white/15 rounded-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.45)] p-4 md:p-6 lg:p-7 flex flex-col">
        
        {/* Header Section Inside Outer Container */}
        <header className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1 relative flex-shrink-0">
          {/* Left Side: Navigation Pill Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90 transition duration-200"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => navigate("/couple/moodboard/wedding")}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90 transition duration-200"
            >
              Moodboards
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90 transition duration-200 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              {sidebarOpen ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {/* Center: Title & Subtitle */}
          <div className="text-center md:absolute md:left-1/2 md:-translate-x-1/2">
            <h1 className="font-['Cormorant_Garamond'] text-2xl md:text-[30px] font-semibold tracking-wide text-white">
              Create Your Wedding Vision
            </h1>
            <span className="text-[11px] tracking-[0.2em] font-semibold text-white/70 block mt-1 uppercase">
              SEE YOUR UNIQUE WEDDING DESIGN COME TO LIFE
            </span>
          </div>

          {/* Right Side: Round Hamburger Menu Button */}
          <div className="flex items-center justify-end relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-full border border-white/20 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition relative cursor-pointer"
              aria-label="Toggle Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] z-[100] w-[240px] rounded-2xl border border-white/12 bg-[#1b1310] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-3">
                {/* Profile Header section */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base select-none bg-gradient-to-tr from-[#c57e44] to-[#ebd8c7]">
                    {coupleInitial}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-bold text-white truncate leading-tight select-none">
                      {coupleName}
                    </span>
                    <span className="text-[11px] text-white/50 truncate leading-snug select-none">
                      {currentUser?.email || "piyu@gmail.com"}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full my-0.5" />

                {/* Navigation Links */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/couple/cart");
                  }}
                  className="w-full text-left text-[14px] font-semibold text-white/90 hover:text-white transition py-1 cursor-pointer select-none"
                >
                  My Cart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/couple/profile");
                  }}
                  className="w-full text-left text-[14px] font-semibold text-white/90 hover:text-white transition py-1 cursor-pointer select-none"
                >
                  Profile
                </button>

                <div className="h-px bg-white/10 w-full my-0.5" />

                {/* Logout Action */}
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    try {
                      await logout();
                      navigate("/login");
                    } catch (err) {
                      console.error("Logout failed:", err);
                    }
                  }}
                  className="w-full text-left text-[14px] font-semibold text-[#ff7b7b] hover:text-[#ff9b9b] transition py-1 cursor-pointer select-none"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Split Layout: Sliding sidebar (left) and 1fr (right panel) */}
        <div className="flex gap-6 items-stretch flex-1 min-h-0 relative overflow-hidden">
          
          {/* Left Sidebar: Style Filters */}
          <aside className={`bg-[#201915]/40 backdrop-blur-md border border-white/10 rounded-[20px] p-3 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 ${sidebarOpen ? 'w-[360px] opacity-100' : 'w-0 opacity-0 pointer-events-none p-0 border-0'}`}>
            <div className="pb-2.5 flex items-center justify-between flex-shrink-0 border-b border-white/10 mb-3">
              <p className="text-[15px] font-bold uppercase tracking-[0.22em] text-[#ebd8c7]">
                Style Filters
              </p>
            </div>

            {/* 1. Reference Uploads (Pinned at Top) */}
            <div className="rounded-[8px] border border-white/10 bg-white/5 pt-2.5 pb-3 px-3 flex flex-col justify-between h-[105px] flex-shrink-0 mb-3 relative">
              <span className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[#ebd8c7] select-none">
                Reference Uploads
              </span>
              <div className="hidden">
                <input
                  ref={venueInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0], "venue")}
                />
                <input
                  ref={decorInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0], "decor")}
                />
              </div>

              {/* Upload Dashed Container */}
              <div className="border border-dashed border-white/20 rounded-lg bg-[#ebd8c7]/5 flex items-center justify-between px-3 py-2 h-[56px] min-h-[56px]">
                {!(venuePreview || decorPreview) ? (
                  <div className="flex-1 flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-[#ebd8c7] flex-shrink-0">
                      <UploadIcon />
                    </span>
                    <p className="text-[11px] text-white/70 leading-snug select-none text-left">
                      Add Your Inspiration (Instagram Reel,<br/>Screenshot, Pinterest)
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex gap-2 justify-start items-center min-w-0 pr-2">
                    {venuePreview && (
                      <div className="relative h-9 w-9 rounded overflow-hidden border border-white/10 group">
                        <img src={venuePreview} alt="venue" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setVenueImage(null); setVenuePreview(null); }}
                          className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {decorPreview && (
                      <div className="relative h-9 w-9 rounded overflow-hidden border border-white/10 group">
                        <img src={decorPreview} alt="decor" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setDecorImage(null); setDecorPreview(null); }}
                          className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <span className="text-[12px] font-semibold text-[#ebd8c7] ml-1 select-none truncate">Inspiration added</span>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    if (!venuePreview) {
                      venueInputRef.current?.click();
                    } else {
                      decorInputRef.current?.click();
                    }
                  }}
                  className="border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-md text-[11px] uppercase font-bold tracking-wider text-[#ebd8c7] transition flex-shrink-0"
                >
                  Browse
                </button>
              </div>
            </div>

            <div
              ref={sidebarScrollRef}
              className={`flex flex-col gap-3 overflow-y-auto loverai-scrollbar pr-3 flex-1 min-h-0 transition-all duration-300 ${
                activeDropdown === "timing" || activeDropdown === "venue" ? "pb-40" : "pb-8"
              }`}
            >

              {/* 2. Budget (in Rupees) */}
              <div className="rounded-[8px] border border-white/10 bg-white/5 pt-2.5 pb-3 px-3 flex flex-col justify-between h-[84px] flex-shrink-0 relative">
                <div className="flex justify-between items-center">
                  <span className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[#ebd8c7]">
                    Budget
                  </span>
                  <span className="text-sm font-semibold text-white/95">
                    {formatBudgetLabel(budget)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">
                    1L
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="loverai-range-slider flex-1"
                  />
                  <span className="text-xs text-white/40">
                    1Cr
                  </span>
                </div>
              </div>

              {/* 3. Functions */}
              {renderCustomSelect("functions", "Functions", functionType, setFunctionType, FUNCTION_OPTIONS, "down")}

              {/* 4. Guest (PAX) */}
              <div className="rounded-[8px] border border-white/10 bg-white/5 pt-2.5 pb-3 px-3 flex flex-col justify-between h-[84px] flex-shrink-0 relative">
                <div className="flex justify-between items-center">
                  <span className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[#ebd8c7]">
                    Guest (PAX)
                  </span>
                  <span className="text-sm font-semibold text-white/95">
                    {guestCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">
                    0
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="loverai-range-slider flex-1"
                  />
                  <span className="text-xs text-white/40">
                    1000
                  </span>
                </div>
              </div>

              {/* 5. Theme */}
              <div className="rounded-[8px] border border-white/10 bg-white/5 pt-2.5 pb-3 px-3 flex flex-col justify-between h-[84px] flex-shrink-0 relative">
                <span className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[#ebd8c7]">
                  Theme
                </span>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {["Modern", "Traditional"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStyle(option)}
                      className={`rounded-[6px] py-1.5 text-[15px] font-semibold transition text-center w-full ${
                        style === option
                          ? "loverai-btn-accent text-[#3D1B2D]"
                          : "border border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Event Flow */}
              {renderCustomSelect("eventFlow", "Event Flow", planningType, setPlanningType, PLANNING_OPTIONS, "down")}

              {/* 7. Venue */}
              {renderCustomSelect("venue", "Venue", venueType, setVenueType, VENUE_OPTIONS, "down")}

              {/* 8. Timing */}
              {renderCustomSelect("timing", "Timing", timing, setTiming, TIMING_OPTIONS, "down")}

            </div>
          </aside>

          {/* Right Panel: Prompt & Bento Canvas */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-4 flex flex-col flex-1 h-full min-h-0 overflow-hidden">
            
            {/* Top Prompt Row */}
            <div className="flex flex-col gap-3 lg:flex-row flex-shrink-0">
              <div className="flex flex-1 items-center gap-3 rounded-[16px] border border-white/10 px-4 py-2 bg-black/10">
                <span className="text-[#ebd8c7]">
                  <SparkIcon />
                </span>
                <input
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Describe your Wedding Scene..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35 font-sans"
                />
                <button
                  type="button"
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-[#e6c6b2] transition duration-200 flex-shrink-0"
                  title="Improve Prompt"
                >
                  <SparkIcon />
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-[16px] loverai-btn-accent px-6 py-2 hover:bg-[#ebd0be] transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-[#3D1B2D] font-semibold"
              >
                <SparkIcon />
                Generate
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-200 mt-2 flex-shrink-0">
                {error}
              </div>
            )}

            {/* Bento Grid Canvas */}
            <section className="rounded-[14px] border border-white/5 bg-white/5 p-4 flex flex-col flex-1 mt-4 min-h-0 overflow-hidden">
              {renderCanvas()}
            </section>
          </div>

        </div>
      </div>

        {showMoodboardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-[360px] rounded-[10px] bg-[#f7f2eb] p-5 text-center text-[#1e1815] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                onClick={() => setShowMoodboardModal(false)}
                className="absolute right-3 top-3 text-sm text-[#1e1815]/70 transition hover:text-[#1e1815]"
                aria-label="Close"
              >
                ×
              </button>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#3BFF47] text-white shadow-[0_12px_30px_rgba(59,255,71,0.25)]">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="font-['Cormorant_Garamond'] text-[24px] font-semibold">
                Added to Moodboard
              </h2>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={planAnotherFunction}
                  className="rounded-[6px] bg-[#1d1714] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Plan Another Function
                </button>
                <button
                  type="button"
                  onClick={openThemeBoard}
                  className="rounded-[6px] bg-[#1d1714] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Go To Moodboard
                </button>
              </div>
            </div>
          </div>
        )}

        {editingCard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            {/* Modal Box: Precise replica of shared mockup UI */}
            <div className="relative max-w-[960px] w-full bg-[#160f0d] border border-white/20 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.85)] p-6 md:p-8 flex flex-col gap-6 text-white animate-scaleIn">
              
              {/* Radial background glows */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
                <div className="absolute top-[-10%] left-[20%] w-[60%] h-[30%] bg-gradient-to-b from-[#ebd8c7]/8 to-transparent blur-[80px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[50%] h-[30%] bg-gradient-to-t from-[#c57e44]/8 to-transparent blur-[80px]" />
              </div>

              {/* Content Header */}
              <div className="relative z-10 flex flex-col gap-4">
                {/* Top Actions Row */}
                <div className="flex items-center justify-between w-full">
                  {/* Back button - circular thin-border outline shape */}
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="w-10 h-10 rounded-full border border-white/20 bg-black/40 hover:bg-white/10 flex items-center justify-center text-white transition-all duration-200 cursor-pointer"
                    aria-label="Back"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </button>

                  {/* Save button - pill shape matching mockup exactly */}
                  <button
                    type="button"
                    onClick={() => {
                      setRefinements(prev => ({
                        ...prev,
                        [editingCard.id]: {
                          prompt: modalPrompt,
                          colorTone: modalColorTone,
                          lighting: modalLighting,
                          theme: modalTheme
                        }
                      }));
                      setEditingCard(null);
                    }}
                    className="bg-[#f5e1d3] text-[#1e1815] font-bold px-6 py-2 rounded-full text-xs uppercase hover:bg-[#ebd0be] transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 10 12 15 7 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Save
                  </button>
                </div>

                {/* Title and Subtitle */}
                <div className="text-center flex flex-col items-center">
                  <h2 className="font-['Cormorant_Garamond'] text-3xl md:text-[36px] font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#ebd8c7] via-white to-[#ebd8c7] drop-shadow-sm">
                    Love lies in the details ~
                  </h2>
                  <span className="text-[10px] tracking-[0.25em] font-bold text-[#ebd8c7]/60 block mt-1.5 uppercase select-none">
                    LET'S EDIT THEM
                  </span>
                </div>

                {/* Refinement Prompt Bar - Pill shape with pencil and circular white button */}
                <div className="mx-auto max-w-[550px] w-full flex items-center gap-3 rounded-full border border-white/25 px-5 py-2 bg-black/40 focus-within:border-white/50 transition-all duration-300">
                  <span className="text-white/60 flex-shrink-0">
                    <PencilIcon />
                  </span>
                  <input
                    value={modalPrompt}
                    onChange={(e) => setModalPrompt(e.target.value)}
                    placeholder="Refine every detail..."
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/35 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setRefinements(prev => ({
                        ...prev,
                        [editingCard.id]: {
                          prompt: modalPrompt,
                          colorTone: modalColorTone,
                          lighting: modalLighting,
                          theme: modalTheme
                        }
                      }));
                      setEditingCard(null);
                    }}
                    className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition flex-shrink-0 cursor-pointer shadow hover:bg-[#f5e1d3]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Split Body Layout (Mockup aspect ratio layout) */}
              <div className="relative z-10 flex flex-col md:flex-row gap-6 items-stretch flex-1 min-h-0 mt-5">
                {/* Left side parameters - Card form with rounded-[24px] and exact labels */}
                <div className="w-full md:w-[260px] rounded-[24px] border border-white/10 bg-black/25 p-5 flex flex-col gap-5 justify-center flex-shrink-0">
                  {renderModalSelect(
                    "colorTone",
                    "COLOR TONE",
                    modalColorTone,
                    setModalColorTone,
                    ["Original", "Warm Gold", "Pastel Rose", "Royal Cream", "Emerald Forest", "Midnight Blue"]
                  )}
                  {renderModalSelect(
                    "lighting",
                    "LIGHTING",
                    modalLighting,
                    setModalLighting,
                    ["Original", "Golden Hour", "Candlelit Glow", "Bright Daylight", "Moody & Dramatic", "Fairy Light Sparkle"]
                  )}
                  {renderModalSelect(
                    "themeStyle",
                    "THEME",
                    modalTheme,
                    setModalTheme,
                    ["Original", "Traditional Luxe", "Modern Minimalist", "Bohemian Garden", "Vintage Royal", "Bollywood Glam"]
                  )}
                </div>

                {/* Right side Image / Preview block */}
                <div className="flex-1 relative rounded-[24px] border border-dashed border-white/15 bg-black/25 flex flex-col items-center justify-center p-6 text-center overflow-hidden min-h-[320px]">
                  {(() => {
                    const isVenueCard = editingCard.id === "primary" || editingCard.id === "venue";
                    const refPreview = isVenueCard ? venuePreview : decorPreview;
                    const hasGeneratedImage = !!editingCard.imageObj?.url;
                    const hasReferenceImage = !!refPreview;

                    if (hasGeneratedImage) {
                      return (
                        <>
                          {/* Main Generated Image */}
                          <img
                            src={editingCard.imageObj.url}
                            alt={editingCard.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                          
                          {/* Floating Reference Thumbnail Overlay */}
                          {hasReferenceImage && (
                            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1 animate-scaleIn">
                              <span className="text-[8px] uppercase tracking-wider bg-black/80 px-2 py-0.5 border border-white/20 text-white font-bold select-none">
                                Reference
                              </span>
                              <div className="relative w-20 h-20 border-2 border-white bg-black shadow-2xl group/thumb overflow-hidden rounded-[8px]">
                                <img
                                  src={refPreview}
                                  alt="Reference Thumbnail"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isVenueCard) {
                                      setVenueImage(null);
                                      setVenuePreview(null);
                                    } else {
                                      setDecorImage(null);
                                      setDecorPreview(null);
                                    }
                                  }}
                                  className="absolute inset-0 bg-black/75 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition duration-150 text-white text-[10px] font-bold cursor-pointer"
                                  title="Remove Reference"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Labeled Badge */}
                          <div className="absolute bottom-16 left-4 z-10">
                            <span className="text-[9px] uppercase tracking-widest bg-black/70 border border-white/10 px-2.5 py-1 font-bold text-[#ebd8c7] select-none">
                              AI Generated
                            </span>
                          </div>
                        </>
                      );
                    } else if (hasReferenceImage) {
                      return (
                        <>
                          {/* Main Reference Image (When no generated image exists) */}
                          <img
                            src={refPreview}
                            alt="Reference Inspiration"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                          
                          {/* Labeled Badge */}
                          <div className="absolute bottom-16 left-4 z-10">
                            <span className="text-[9px] uppercase tracking-widest bg-white text-black border border-white px-2.5 py-1 font-bold select-none">
                              Inspiration Reference
                            </span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        /* Empty State matching mockup image */
                        <div className="flex flex-col items-center justify-center text-center p-4 select-none mb-10">
                          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/5 mb-4 text-white/50 shadow-inner">
                            <PhotoIcon />
                          </div>
                          <p className="font-['Cormorant_Garamond'] text-xl font-medium text-white tracking-wide">
                            Configure Refinements
                          </p>
                          <p className="text-[11px] text-white/40 mt-2 max-w-[280px] mx-auto leading-relaxed">
                            No generated image exists yet. Adjust filters or prompts here to pre-configure visual parameters for the next generation!
                          </p>
                        </div>
                      );
                    }
                  })()}

                  {/* Floating Action Capsule (Bottom) */}
                  {(() => {
                    const isVenueCard = editingCard.id === "primary" || editingCard.id === "venue";
                    const refPreview = isVenueCard ? venuePreview : decorPreview;
                    const hasReferenceImage = !!refPreview;

                    return (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#0a0705] border border-white/10 p-1.5 rounded-full shadow-2xl">
                        {/* ADD button - white solid pill */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isVenueCard) {
                              venueInputRef.current?.click();
                            } else {
                              decorInputRef.current?.click();
                            }
                          }}
                          className="bg-white hover:bg-[#f5e1d3] text-black font-extrabold px-4 py-1.5 rounded-full text-[10px] uppercase transition duration-150 flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          ADD
                        </button>
                        
                        <div className="h-4 w-[1px] bg-white/10" />

                        {/* REMOVE button - text link */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isVenueCard) {
                              setVenueImage(null);
                              setVenuePreview(null);
                            } else {
                              setDecorImage(null);
                              setDecorPreview(null);
                            }
                          }}
                          disabled={!hasReferenceImage}
                          className="text-white/45 hover:text-white disabled:text-white/20 text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center gap-1 transition duration-150 cursor-pointer disabled:pointer-events-none"
                        >
                          — REMOVE
                        </button>

                        <div className="h-4 w-[1px] bg-white/10" />

                        {/* RESET button - text link */}
                        <button
                          type="button"
                          onClick={() => {
                            setModalPrompt("");
                            setModalColorTone("Original");
                            setModalLighting("Original");
                            setModalTheme("Original");
                          }}
                          className="text-white/85 hover:text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center gap-1 transition duration-150 cursor-pointer"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                          </svg>
                          RESET
                        </button>

                        <div className="h-4 w-[1px] bg-white/10" />

                        {/* COMPARE button - text link (disabled) */}
                        <button
                          type="button"
                          className="text-white/25 text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center gap-1 cursor-not-allowed"
                          disabled
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                          </svg>
                          COMPARE
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    );
  }

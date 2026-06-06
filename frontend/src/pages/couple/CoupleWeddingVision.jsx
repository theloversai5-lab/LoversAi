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

const PLANNING_OPTIONS = ["Decoration", "Functions", "Haldi", "Venue", "Theme", "Timing"];
const VENUE_OPTIONS = ["Farm House", "Banquet", "Resort", "Beachside", "Temple Lawn"];
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

export default function CoupleWeddingVision() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

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
  const [planningType, setPlanningType] = useState("Decoration");
  const [venueType, setVenueType] = useState("Farm House");
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

  const venueInputRef = useRef(null);
  const decorInputRef = useRef(null);

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

    const base = userPrompt.trim() || "Create a cinematic wedding scene with layered decor details.";
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

  const FilterSection = ({ title, children }) => (
    <div className="rounded-[8px] border border-white/10 bg-[#2a241f] p-2.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
        {title}
      </p>
      {children}
    </div>
  );

  const SelectField = ({ value, onChange, options }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[6px] border border-white/10 bg-[#201913] px-2 py-1.5 text-[11px] text-white outline-none transition focus:border-[#c79b2d]"
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-[#201913]">
          {option}
        </option>
      ))}
    </select>
  );

  const UploadBox = ({ label, preview, inputRef, onSelect }) => (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="overflow-hidden rounded-[8px] border border-dashed border-white/15 bg-[#201913] text-left transition hover:border-[#c79b2d]"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onSelect(e.target.files[0])}
      />
      {preview ? (
        <div className="relative h-20">
          <img src={preview} alt={label} className="h-full w-full object-cover" />
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white">
            {label}
          </span>
        </div>
      ) : (
        <div className="px-3 py-4 text-[11px] text-white/60">{label}</div>
      )}
    </button>
  );

  const renderCanvas = () => {
    if (generating) {
      return (
        <div className="flex h-full min-h-[520px] flex-col items-center justify-center text-center text-white/75">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#c79b2d]/30 border-t-[#c79b2d]" />
          <p className="mt-5 font-['Cormorant_Garamond'] text-[30px] font-semibold text-[#f4e3c1]">
            Creating Your Wedding Vision
          </p>
          <p className="mt-2 text-sm text-white/60">
            {progress || "Preparing your wedding moodboard..."}
          </p>
        </div>
      );
    }

    if (generatedImages.length === 0) {
      return (
        <div className="flex h-full min-h-[520px] flex-col items-center justify-center text-center text-white/50">
          <div className="rounded-[14px] border border-white/10 bg-white/5 p-3 text-white/60">
            <PhotoIcon />
          </div>
          <p className="mt-8 font-['Cormorant_Garamond'] text-[28px] font-semibold text-[#f3ead7]">
            Your Generated Wedding Scenes will appear here
          </p>
          <p className="mt-2 text-lg text-white/35">
            Start by describing your vision first
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-[520px] flex-col">
        <div className="grid flex-1 grid-cols-1 gap-1.5 md:grid-cols-[1.2fr_1fr]">
          <div className="relative overflow-hidden rounded-[2px] bg-[#b3aeaa] md:row-span-2">
            <img src={generatedImages[0]?.url} alt={generatedImages[0]?.label || "Generated wedding scene"} className="h-full w-full object-cover" />
          </div>
          <div className="relative overflow-hidden rounded-[2px] bg-[#b3aeaa]">
            {generatedImages[1] && (
              <img src={generatedImages[1].url} alt={generatedImages[1]?.label || "Generated wedding scene"} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="relative overflow-hidden rounded-[2px] bg-[#b3aeaa]">
            {generatedImages[2] && (
              <img src={generatedImages[2].url} alt={generatedImages[2]?.label || "Generated wedding scene"} className="h-full w-full object-cover" />
            )}
          </div>
        </div>

        {generatedImages[3] && (
          <div className="mt-1.5 grid h-[160px] grid-cols-1">
            <div className="relative overflow-hidden rounded-[2px] bg-[#b3aeaa]">
              <img src={generatedImages[3].url} alt={generatedImages[3]?.label || "Generated wedding scene"} className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleAddToMoodboard}
            className={`inline-flex items-center gap-2 rounded-[4px] border px-4 py-2 text-sm font-semibold transition ${
              savedToMoodboard
                ? "border-[#89b86b] bg-[#89b86b]/15 text-[#d8efc8]"
                : "border-white/15 bg-[#f1ede7] text-[#1f1a17] hover:bg-white"
            }`}
          >
            <SparkIcon />
            {savedToMoodboard ? "Added to Moodboard" : "Add to Moodboard"}
          </button>

          <button
            type="button"
            onClick={openThemeBoard}
            className="rounded-[4px] border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/15"
          >
            View More
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="loverai-wedding-shell min-h-screen px-3 py-4 text-white md:px-6">
      <div
        className="loverai-wedding-bg"
        style={{ backgroundImage: 'url("/images/signup.png"), url("/images/bridal.png")' }}
      />
      <div className="loverai-wedding-overlay" />
      <div className="relative z-10 mx-auto max-w-[1380px]">
        <div className="mb-3 flex items-center justify-between px-1 text-sm text-white/70">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="transition hover:text-white"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/couple/moodboard/wedding")}
            className="transition hover:text-white"
          >
            Moodboards
          </button>
        </div>

        <div className="glass-card-strong rounded-[30px] px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="glass-card rounded-full px-5 py-3 flex items-center gap-8 md:gap-12 text-white/90">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-lg font-medium transition hover:text-loverai-gold"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/pricing")}
                  className="text-lg font-medium transition hover:text-loverai-gold"
                >
                  Pricing
                </button>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/couple/cart")}
                  className="glass-card rounded-full px-4 py-3 text-white/80 transition hover:text-white"
                  aria-label="Cart"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 20a1 1 0 1 0 0 2 1 1 0 1 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM3 3h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8.5 16H21v-2H8.5l1.1-2h7.45a2 2 0 0 0 1.9-1.4l2.5-9v-.1H5.21L4.27 2H1v2h2z" />
                  </svg>
                </button>
                <div className="glass-card rounded-full px-3 py-2.5 flex items-center gap-3">
                  <span className="max-w-[180px] truncate text-sm text-white/85">
                    {coupleName}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f0d196] to-[#d58b49] text-sm font-semibold text-[#2a1b13]">
                    {coupleInitial}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="glass-card flex flex-1 items-center gap-3 rounded-2xl px-4 py-3">
                <SparkIcon />
                <input
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Describe your Wedding Scene..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35 md:text-base"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="loverai-btn-primary inline-flex items-center justify-center gap-2 !rounded-2xl !px-6 !py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SparkIcon />
                Generate
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="glass-card rounded-[24px] p-3 md:p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Style Filters</p>
                </div>

                <div className="space-y-2">
                  <FilterSection title="Budget (in Rupees)">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full accent-[#c79b2d]"
                    />
                    <div className="mt-1 flex items-center justify-between text-[10px] text-white/60">
                      <span>1 L</span>
                      <span>{formatBudgetLabel(budget)}</span>
                      <span>1 Cr</span>
                    </div>
                  </FilterSection>

                  <FilterSection title="Theme">
                    <div className="grid grid-cols-2 gap-1">
                      {["Modern", "Traditional"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setStyle(option)}
                          className={`rounded-[6px] border px-2 py-1.5 text-[11px] font-semibold transition ${
                            style === option
                              ? "border-[#f3eee8] bg-[#f3eee8] text-[#1d1714]"
                              : "border-white/10 bg-[#201913] text-white/70 hover:border-white/20"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  <FilterSection title="Guest (PAX)">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full accent-[#c79b2d]"
                    />
                    <div className="mt-1 flex items-center justify-between text-[10px] text-white/60">
                      <span>0</span>
                      <span>{guestCount}</span>
                      <span>1000</span>
                    </div>
                  </FilterSection>

                  <FilterSection title="Planning">
                    <SelectField value={planningType} onChange={setPlanningType} options={PLANNING_OPTIONS} />
                  </FilterSection>

                  <FilterSection title="Functions">
                    <SelectField value={functionType} onChange={setFunctionType} options={FUNCTION_OPTIONS} />
                  </FilterSection>

                  <FilterSection title="Venue">
                    <SelectField value={venueType} onChange={setVenueType} options={VENUE_OPTIONS} />
                  </FilterSection>

                  <FilterSection title="Theme">
                    <SelectField value={theme} onChange={setTheme} options={THEME_OPTIONS} />
                  </FilterSection>

                  <FilterSection title="Atmosphere">
                    <SelectField value={atmosphere} onChange={setAtmosphere} options={ATMOSPHERE_OPTIONS} />
                  </FilterSection>

                  <FilterSection title="Timing">
                    <SelectField value={timing} onChange={setTiming} options={TIMING_OPTIONS} />
                  </FilterSection>

                  <FilterSection title="Reference Uploads">
                    <div className="grid gap-2">
                      <UploadBox label="Venue photo" preview={venuePreview} inputRef={venueInputRef} onSelect={(file) => handleFileSelect(file, "venue")} />
                      <UploadBox label="Decor inspiration" preview={decorPreview} inputRef={decorInputRef} onSelect={(file) => handleFileSelect(file, "decor")} />
                    </div>
                  </FilterSection>
                </div>
              </aside>

              <section className="glass-card rounded-[24px] p-3">
                <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(18,11,9,0.62)] p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)] pointer-events-none" />
                  {renderCanvas()}
                </div>
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
      </div>
    </main>
  );
}

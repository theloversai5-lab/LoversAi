import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, coupleMoodboardAPI } from "../../api/api";

const FUNCTION_OPTIONS = [
  "Pre-wedding (Haldi/Mehendi)",
  "Wedding Ceremony",
  "Reception",
  "Sangeet",
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

const TITLE_MAP = {
  "Pre-wedding (Haldi/Mehendi)": "Golden Dreams of Haldi",
  "Wedding Ceremony": "Eternal Sacred Vows",
  Reception: "A Night to Remember",
  Sangeet: "Rhythms of Celebration",
  Engagement: "Promise of Forever",
  Nikah: "Blessings of Nikkah",
};

export default function CoupleWeddingVision() {
  const navigate = useNavigate();

  const [venueImage, setVenueImage] = useState(null);
  const [venuePreview, setVenuePreview] = useState(null);
  const [decorImage, setDecorImage] = useState(null);
  const [decorPreview, setDecorPreview] = useState(null);
  const [showUploads, setShowUploads] = useState(false);

  const [style, setStyle] = useState("Modern");
  const [functionType, setFunctionType] = useState("Wedding Ceremony");
  const [atmosphere, setAtmosphere] = useState("Bohemian & Free-spirited");
  const [timing, setTiming] = useState("Sunset (Golden Hour)");
  const [userPrompt, setUserPrompt] = useState("");

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [generatedImages, setGeneratedImages] = useState([]);
  const [moodboardTitle, setMoodboardTitle] = useState("");
  const [generationMeta, setGenerationMeta] = useState(null);
  const [error, setError] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const venueInputRef = useRef(null);
  const decorInputRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap";
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
    setGeneratedImages([]);
    setGenerationMeta(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
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
      formData.append("userPrompt", userPrompt);

      await new Promise((resolve) => setTimeout(resolve, 400));
      setProgress("Crafting your personalized wedding prompt...");
      await new Promise((resolve) => setTimeout(resolve, 400));
      setProgress("Generating editorial wedding scenes...");

      const patientTimer = setTimeout(
        () => setProgress("Almost there. Composing your moodboard..."),
        90000,
      );
      const result = await coupleMoodboardAPI.generate(formData);
      clearTimeout(patientTimer);

      if (result.success && result.generatedImages?.length > 0) {
        setGeneratedImages(result.generatedImages);
        setMoodboardTitle(
          result.moodboardTitle || TITLE_MAP[functionType] || "Wedding Vision",
        );
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
      console.error("Moodboard generation error:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Generation failed. Please try again.",
      );
    } finally {
      setProgress("");
      setGenerating(false);
    }
  };

  const handleAddToCart = async () => {
    if (generatedImages.length === 0) return;
    setAddedToCart(true);

    try {
      await apiFetch("/cart/add", {
        method: "POST",
        data: {
          type: "vision",
          url: generatedImages[0].url,
          moodboard: generatedImages.map((img) => img.url),
          label: `${moodboardTitle} - ${style} ${functionType} Moodboard`,
          prompt: generationMeta?.finalPrompt || userPrompt,
          details: {
            style,
            functionType,
            atmosphere,
            timing,
            mode: generationMeta?.mode,
            imageCount: generatedImages.length,
          },
        },
      });
    } catch (err) {
      console.error("Failed to add to cart:", err);
      setError("Failed to add moodboard to cart. Please try again.");
    } finally {
      window.setTimeout(() => setAddedToCart(false), 2200);
    }
  };

  const handleDownload = async () => {
    for (const img of generatedImages) {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `wedding_vision_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        window.open(img.url, "_blank");
      }
    }
  };

  const resetToSetup = () => {
    setGeneratedImages([]);
    setGenerationMeta(null);
    setMoodboardTitle("");
    setError(null);
  };

  const PageHeader = () => (
    <div className="relative z-10 mx-auto flex w-full max-w-[430px] items-center justify-between rounded-b-[28px] border border-white/10 bg-[#120d0a]/95 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.45)]">
      <button
        type="button"
        onClick={generatedImages.length > 0 ? resetToSetup : () => navigate(-1)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/75 transition hover:bg-white/5 hover:text-white"
        aria-label="Go back"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="text-center">
        <p className="font-heading text-base font-bold uppercase tracking-[0.12em] text-white">
          THE LOVERS AI
        </p>
        <div className="mx-auto mt-2 h-3 w-8 rounded-full border-t border-loverai-gold/40 opacity-60" />
      </div>

      <button
        type="button"
        onClick={() => navigate("/couple/cart")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/75 transition hover:bg-white/5 hover:text-white"
        aria-label="View cart"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6h15l-1.5 8.5H8L6 6Z" />
          <path d="M6 6 5 3H2" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
      </button>
    </div>
  );

  const Dropdown = ({ label, options, value, onChange }) => (
    <div className="mb-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <select
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-white/80 outline-none transition focus:border-loverai-gold/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#211914]">
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  const UploadPreview = ({ label, preview, inputRef, onSelect }) => (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.03] text-left transition hover:border-loverai-gold/45 hover:bg-white/[0.05]"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onSelect(e.target.files[0])}
      />
      {preview ? (
        <div className="relative h-28">
          <img src={preview} alt={label} className="h-full w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">
            {label}
          </span>
        </div>
      ) : (
        <div className="flex min-h-20 items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold text-white/60">{label}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">
            Upload
          </span>
        </div>
      )}
    </button>
  );

  const SetupScreen = () => (
    <div className="relative z-10 mx-auto w-full max-w-[430px] px-4 pb-8">
      <PageHeader />

      <section className="px-3 pb-8 pt-7 text-center">
        <h1 className="font-heading text-[32px] font-bold leading-[1.05] text-[#f0c9d5]">
          Create Your Wedding Vision
        </h1>
        <p className="mx-auto mt-4 max-w-[310px] text-sm font-semibold leading-6 text-white/55">
          Select your wedding style and let AI craft a stunning editorial
          moodboard of your dream celebration
        </p>
      </section>

      <section className="rounded-2xl border border-white/12 bg-[#211914]/88 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <h2 className="font-heading text-lg font-bold text-white">
          Configure Your Vision
        </h2>
        <div className="my-4 h-px bg-white/8" />

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-200">
            {error}
          </div>
        )}

        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            Primary Style
          </p>
          <div className="grid grid-cols-2 rounded-xl bg-white/[0.04] p-1">
            {["Modern", "Traditional"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStyle(option)}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  style === option
                    ? "bg-[#e4c3ad] text-[#2b1a24]"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <Dropdown label="Function Type" options={FUNCTION_OPTIONS} value={functionType} onChange={setFunctionType} />
        <Dropdown label="Atmosphere" options={ATMOSPHERE_OPTIONS} value={atmosphere} onChange={setAtmosphere} />
        <Dropdown label="Timing" options={TIMING_OPTIONS} value={timing} onChange={setTiming} />

        <div className="mb-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            Additional Instructions (Optional)
          </p>
          <textarea
            className="min-h-[74px] w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-white/80 outline-none transition placeholder:text-white/25 focus:border-loverai-gold/50"
            placeholder="E.g., pastel florals, palace courtyard, candlelit mandap..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowUploads(!showUploads)}
          className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/38 transition hover:text-white/70"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showUploads ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
          Upload Reference Images (Optional)
        </button>

        {showUploads && (
          <div className="mb-4 grid gap-3">
            <UploadPreview label="Venue photo" preview={venuePreview} inputRef={venueInputRef} onSelect={(file) => handleFileSelect(file, "venue")} />
            <UploadPreview label="Decor inspiration" preview={decorPreview} inputRef={decorInputRef} onSelect={(file) => handleFileSelect(file, "decor")} />
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e4c3ad] px-5 py-4 text-sm font-bold text-[#2b1a24] shadow-[0_16px_36px_rgba(228,195,173,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">+</span>
          Generate Moodboard
        </button>
        <p className="mt-3 text-center text-[10px] text-white/28">
          Uses 15 credits per generation
        </p>
      </section>
    </div>
  );

  const LoadingScreen = () => (
    <div className="relative z-10 mx-auto w-full max-w-[430px] px-4 pb-8">
      <PageHeader />
      <section className="mt-8 rounded-2xl border border-white/12 bg-[#211914]/88 p-8 text-center shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-loverai-gold/20 border-t-loverai-gold animate-spin" />
        <h1 className="font-heading text-2xl font-bold text-[#f0c9d5]">
          Creating Your Vision
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          {progress || "Preparing your wedding moodboard..."}
        </p>
        <div className="mt-6 grid gap-2 text-left text-xs text-white/48">
          {[
            "Reading your style selections",
            "Writing the editorial prompt",
            "Generating wedding scenes",
            "Composing your moodboard",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const ResultScreen = () => (
    <div className="relative z-10 mx-auto w-full max-w-[920px] px-4 pb-8">
      <PageHeader />

      <section className="pt-7 text-center">
        <h1 className="font-heading text-[32px] font-bold leading-[1.05] text-[#f0c9d5]">
          {moodboardTitle || "Your Wedding Vision"}
        </h1>
        <p className="mx-auto mt-3 max-w-[460px] text-sm font-semibold leading-6 text-white/50">
          Review the generated editorial moodboard, add it to your cart, or
          adjust your setup and regenerate.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-white/12 bg-[#211914]/88 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-5">
        <div
          className="grid overflow-hidden rounded-xl bg-black/30"
          style={{
            gridTemplateColumns:
              generatedImages.length >= 4
                ? "1.2fr 1fr"
                : generatedImages.length > 1
                  ? "1fr 1fr"
                  : "1fr",
            gap: 3,
            minHeight: 360,
          }}
        >
          {generatedImages.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              className="relative min-h-[180px] overflow-hidden"
              style={{
                gridRow:
                  generatedImages.length >= 4 && index === 0
                    ? "span 2"
                    : undefined,
              }}
            >
              <img
                src={img.url}
                alt={img.label || "Generated wedding scene"}
                className="h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  {img.label || `Scene ${index + 1}`}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-loverai-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-loverai-gold">
            {generatedImages.length} Scenes
          </span>
          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            {style} / {functionType}
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
              addedToCart
                ? "border-green-400/50 bg-green-500/10 text-green-200"
                : "border-white/15 bg-white/[0.04] text-white hover:border-loverai-gold/45"
            }`}
          >
            {addedToCart ? "Added" : "Add to Moodboard"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:border-white/35"
          >
            Download All
          </button>
          <button
            type="button"
            onClick={resetToSetup}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/65 transition hover:text-white"
          >
            Edit Setup
          </button>
        </div>
      </section>
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f0907] font-sans text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url('/images/signup.png')" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(225,195,135,0.10),transparent_32%),linear-gradient(180deg,rgba(15,9,7,0.72),rgba(15,9,7,0.96))]" />

      {generating ? (
        <LoadingScreen />
      ) : generatedImages.length > 0 ? (
        <ResultScreen />
      ) : (
        <SetupScreen />
      )}
    </main>
  );
}

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { coupleMoodboardAPI } from "../../api/api";

const FUNCTION_OPTIONS = [
  "Pre-wedding (Haldi/Mehndi)",
  "Wedding Ceremony",
  "Reception",
  "Sangeet",
  "Small Function (Birthday, Engagement)",
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

export default function CoupleMoodboard() {
  const navigate = useNavigate();

  // Uploads
  const [venueImage, setVenueImage] = useState(null);
  const [venuePreview, setVenuePreview] = useState(null);
  const [decorImage, setDecorImage] = useState(null);
  const [decorPreview, setDecorPreview] = useState(null);

  // Side-panel selections
  const [style, setStyle] = useState("Traditional");
  const [functionType, setFunctionType] = useState("Wedding Ceremony");
  const [atmosphere, setAtmosphere] = useState("Warm & Festive");
  const [timing, setTiming] = useState("Evening (Warm Glow)");
  const [userPrompt, setUserPrompt] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generationMeta, setGenerationMeta] = useState(null);
  const [error, setError] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const venueInputRef = useRef(null);
  const decorInputRef = useRef(null);

  // ─── File handlers ───
  const handleFileSelect = (file, type) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large (max 50MB)");
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

  // ─── Generate moodboard ───
  const handleGenerate = async () => {
    if (!venueImage || !decorImage) {
      setError("Please upload both a venue image and a decoration reference image");
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedImageUrl(null);
    setGenerationMeta(null);
    setProgress("Uploading images...");

    try {
      const formData = new FormData();
      formData.append("venueImage", venueImage);
      formData.append("decorImage", decorImage);
      formData.append("style", style);
      formData.append("functionType", functionType);
      formData.append("atmosphere", atmosphere);
      formData.append("timing", timing);
      formData.append("userPrompt", userPrompt);

      setProgress("🧠 Analyzing venue & decor with AI vision...");

      // Short delay for UX
      await new Promise((r) => setTimeout(r, 500));
      setProgress("🎨 Generating decorated venue with Flux AI...");

      // After a delay, show validation step
      setTimeout(() => setProgress("🔍 Validating venue preservation..."), 90000);

      const result = await coupleMoodboardAPI.generate(formData);

      if (result.success && result.generatedImageUrl) {
        setGeneratedImageUrl(result.generatedImageUrl);
        setGenerationMeta(result);
        setProgress("");
      } else {
        throw new Error(result.error || "Generation failed");
      }
    } catch (err) {
      console.error("Moodboard generation error:", err);
      const msg =
        err.response?.data?.error || err.message || "Generation failed. Please try again.";
      setError(msg);
      setProgress("");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Add to cart ───
  const handleAddToCart = async () => {
    if (!generatedImageUrl) return;
    setAddedToCart(true);
    try {
      const { apiFetch } = await import("../../api/api");
      await apiFetch("/cart/add", {
        method: "POST",
        data: {
          type: "vision",
          url: generatedImageUrl,
          moodboard: [generatedImageUrl],
          label: `${style} ${functionType} Moodboard`,
          prompt: generationMeta?.finalPrompt || userPrompt,
          details: { style, functionType, atmosphere, timing, mode: generationMeta?.mode },
        },
      });
      setTimeout(() => {
        if (window.confirm("✨ Moodboard added to cart!\n\nView your cart now?")) {
          navigate("/couple/cart");
        }
      }, 300);
    } catch (e) {
      console.error("Failed to add to cart:", e);
      alert("❌ Failed to add to cart. Please try again.");
    } finally {
      setTimeout(() => setAddedToCart(false), 2500);
    }
  };

  // ─── Download image ───
  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moodboard_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(generatedImageUrl, "_blank");
    }
  };

  // ─── Image Upload Zone component ───
  const UploadZone = ({ label, preview, inputRef, onSelect, icon }) => (
    <div
      onClick={() => inputRef.current?.click()}
      className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-white/15 hover:border-loverai-gold/50 transition-all duration-300 overflow-hidden bg-white/[0.02] hover:bg-white/[0.04]"
      style={{ minHeight: "160px" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onSelect(e.target.files[0])}
      />
      {preview ? (
        <>
          <img src={preview} alt={label} className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-bold">Change Image</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">{label}</p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 p-4">
          <span className="text-2xl mb-2 opacity-50">{icon}</span>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest text-center">{label}</p>
          <p className="text-white/30 text-[10px] mt-1">Click to upload</p>
        </div>
      )}
    </div>
  );

  // ─── Dropdown component ───
  const Dropdown = ({ label, options, value, onChange }) => (
    <div className="mb-4">
      <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1.5">{label}</p>
      <select
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-loverai-gold/50 transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-gray-900">{o}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      className="min-h-screen loverai-page-bg font-sans"
      style={{ position: "relative", overflow: "hidden", backgroundColor: "#120d0a" }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-loverai-gold/[0.03] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/[0.05] px-6 py-4 flex items-center justify-between bg-[#120d0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer text-white/80"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="font-heading font-bold text-lg text-white tracking-widest uppercase">
            AI Moodboard
          </p>
        </div>
        <button
          onClick={() => navigate("/couple/cart")}
          className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer text-white/80"
          title="View Cart"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 20a1 1 0 1 0 0 2 1 1 0 1 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM3 3h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8.5 16H21v-2H8.5l1.1-2h7.45a2 2 0 0 0 1.9-1.4l2.5-9v-.1H5.21L4.27 2H1v2h2z" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold loverai-gradient-text mb-3">
            AI Moodboard Generator
          </h1>
          <p className="text-white/60 font-medium tracking-wide max-w-xl mx-auto">
            Upload your venue + a decoration reference → Our AI transforms your venue with that exact decor style
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
          {/* ─── LEFT SIDEBAR ─── */}
          <div className="w-full lg:w-80 flex-shrink-0 glass-card rounded-2xl p-5 flex flex-col overflow-y-auto custom-scrollbar">
            <h3 className="font-heading text-lg font-bold text-white mb-5 border-b border-white/10 pb-3">
              Upload & Configure
            </h3>

            {/* Image uploads */}
            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-2">
              Venue Image *
            </p>
            <UploadZone
              label="Your Venue Photo"
              preview={venuePreview}
              inputRef={venueInputRef}
              onSelect={(f) => handleFileSelect(f, "venue")}
              icon="🏛️"
            />

            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-2 mt-4">
              Decoration Reference *
            </p>
            <UploadZone
              label="Decor Inspiration"
              preview={decorPreview}
              inputRef={decorInputRef}
              onSelect={(f) => handleFileSelect(f, "decor")}
              icon="💐"
            />

            {/* Style toggle */}
            <div className="mt-5 mb-4">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-2">
                Primary Style
              </p>
              <div className="flex bg-white/5 rounded-xl p-1">
                {["Modern", "Traditional"].map((t) => (
                  <button
                    key={t}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      style === t
                        ? "bg-loverai-gold text-gray-900 shadow-md"
                        : "text-white/60 hover:text-white"
                    }`}
                    onClick={() => setStyle(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdowns */}
            <Dropdown label="Function Type" options={FUNCTION_OPTIONS} value={functionType} onChange={setFunctionType} />
            <Dropdown label="Atmosphere" options={ATMOSPHERE_OPTIONS} value={atmosphere} onChange={setAtmosphere} />
            <Dropdown label="Timing" options={TIMING_OPTIONS} value={timing} onChange={setTiming} />

            {/* Custom prompt */}
            <div className="mb-4">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1.5">
                Additional Instructions (Optional)
              </p>
              <textarea
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-loverai-gold/50 transition-colors resize-none"
                rows={3}
                placeholder="E.g., Keep the venue exactly the same, add heavy marigold decoration..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !venueImage || !decorImage}
              className="loverai-btn-primary !rounded-2xl !py-3 w-full flex items-center justify-center gap-2 font-bold disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
            >
              {generating ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Generate Moodboard
                </>
              )}
            </button>

            <p className="text-white/30 text-[10px] text-center mt-2">
              Uses 15 credits per generation
            </p>
          </div>

          {/* ─── RIGHT: RESULT CANVAS ─── */}
          <div className="flex-1 glass-card rounded-2xl p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden border border-white/[0.05] min-h-[500px]">
            {/* Error message */}
            {error && (
              <div className="absolute top-4 left-4 right-4 z-30 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-white">✕</button>
              </div>
            )}

            {/* Empty state */}
            {!generating && !generatedImageUrl && (
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl opacity-60">🎨</span>
                </div>
                <h3 className="font-heading text-xl text-white mb-2">Your Canvas Awaits</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Upload your venue photo and a decoration reference image on the left. Our AI will analyze both images and generate a beautifully decorated version of your venue.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  {["Venue + Decor = Magic", "AI-Powered", "Venue Preserved"].map((tag) => (
                    <span key={tag} className="bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {generating && (
              <div className="text-center">
                <div className="w-20 h-20 border-4 border-loverai-gold/20 border-t-loverai-gold rounded-full animate-spin mx-auto mb-6" />
                <p className="font-heading font-medium text-loverai-gold tracking-widest uppercase text-sm animate-pulse mb-2">
                  {progress || "Processing..."}
                </p>
                <p className="text-white/40 text-xs max-w-md">
                  This may take 1-3 minutes. The AI is analyzing your venue structure, extracting the decoration style, and generating a new image.
                </p>
                {/* Progress stages */}
                <div className="mt-6 flex flex-col items-start max-w-xs mx-auto text-left gap-2">
                  {[
                    { label: "Upload images", done: true },
                    { label: "Analyzing with Groq Vision AI", done: progress.includes("Flux") || progress.includes("Validat") },
                    { label: "Generating with Flux AI", done: progress.includes("Validat") },
                    { label: "Validating venue preservation", done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {step.done ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="w-3 h-3 border border-white/30 border-t-loverai-gold rounded-full animate-spin" />
                      )}
                      <span className={step.done ? "text-white/60" : "text-white/40"}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated result */}
            {generatedImageUrl && !generating && (
              <div className="w-full h-full flex flex-col">
                {/* Mode + Validation + Aspect Ratio badges */}
                {generationMeta?.mode && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="bg-loverai-gold/20 text-loverai-gold text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                      {generationMeta.mode}
                    </span>
                    {generationMeta.visionFallback && (
                      <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-3 py-1 rounded-full">
                        Fallback Prompt
                      </span>
                    )}
                    {generationMeta.aspectRatio && (
                      <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full">
                        {generationMeta.aspectRatio}
                      </span>
                    )}
                    {generationMeta.retried && (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full">
                        🔄 Auto-Retried
                      </span>
                    )}
                    {generationMeta.validation && !generationMeta.validation.skipped && (
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                        generationMeta.validation.pass
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {generationMeta.validation.pass ? '✓' : '⚠'} Quality: {Math.round((generationMeta.validation.score || 0) * 100)}%
                      </span>
                    )}
                    {generationMeta.creditInfo && (
                      <span className="text-white/40 text-[10px]">
                        Credits: {generationMeta.creditInfo.newBalance} remaining
                      </span>
                    )}
                  </div>
                )}

                {/* Before/After comparison */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Original venue */}
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={venuePreview}
                      alt="Original Venue"
                      className="w-full h-64 md:h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white/90 text-[10px] font-bold uppercase tracking-widest">
                        Original Venue
                      </span>
                    </div>
                  </div>

                  {/* Generated result */}
                  <div className="relative rounded-xl overflow-hidden border border-loverai-gold/30 shadow-[0_0_30px_rgba(232,196,106,0.1)]">
                    <img
                      src={generatedImageUrl}
                      alt="AI Generated Moodboard"
                      className="w-full h-64 md:h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-loverai-gold/80 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-gray-900 text-[10px] font-bold uppercase tracking-widest">
                        AI Generated
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={handleAddToCart}
                    className={`glass-card !border-white/20 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:bg-white/10 ${
                      addedToCart
                        ? "!border-green-500 !text-green-400 bg-green-500/10"
                        : "text-white hover:border-loverai-gold"
                    }`}
                  >
                    {addedToCart ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Added!
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 20a1 1 0 1 0 0 2 1 1 0 1 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM3 3h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8.5 16H21v-2H8.5l1.1-2h7.45a2 2 0 0 0 1.9-1.4l2.5-9v-.1H5.21L4.27 2H1v2h2z" />
                        </svg>
                        Add to Cart
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="glass-card !border-white/20 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 text-white transition-all hover:bg-white/10 hover:border-white"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Download
                  </button>

                  <button
                    onClick={() => {
                      setGeneratedImageUrl(null);
                      setGenerationMeta(null);
                      setError(null);
                    }}
                    className="glass-card !border-white/20 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

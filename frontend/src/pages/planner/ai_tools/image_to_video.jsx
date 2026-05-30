/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { aiAPI, paymentAPI } from "../../../api/api";

const FALLBACK_STYLES = [
  {
    id: "slow-pan",
    name: "Slow Pan",
    description: "Smooth panning movement across the frame.",
    creditCost: 25,
  },
  {
    id: "zoom-in",
    name: "Zoom In",
    description: "Focuses on details with a gradual push-in.",
    creditCost: 25,
  },
  {
    id: "zoom-out",
    name: "Zoom Out",
    description: "Reveals the full scene with a gentle pull-back.",
    creditCost: 25,
  },
  {
    id: "360-rotate",
    name: "360 Rotate",
    description: "Creates a sweeping orbit effect around the scene.",
    creditCost: 25,
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Professional movement with a polished reveal feel.",
    creditCost: 25,
  },
];

const STYLE_DECOR = {
  "slow-pan": {
    label: "PAN",
    tint: "from-sky-500/20 to-blue-500/5",
    border: "border-sky-400/25",
    icon: PanIcon,
  },
  "zoom-in": {
    label: "IN",
    tint: "from-emerald-500/20 to-teal-500/5",
    border: "border-emerald-400/25",
    icon: ZoomInIcon,
  },
  "zoom-out": {
    label: "OUT",
    tint: "from-violet-500/20 to-indigo-500/5",
    border: "border-violet-400/25",
    icon: ZoomOutIcon,
  },
  "360-rotate": {
    label: "360",
    tint: "from-amber-500/20 to-orange-500/5",
    border: "border-amber-400/25",
    icon: OrbitIcon,
  },
  cinematic: {
    label: "PRO",
    tint: "from-rose-500/20 to-fuchsia-500/5",
    border: "border-rose-400/25",
    icon: SparkIcon,
  },
};

function BackIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V5" />
      <path d="M8 9l4-4 4 4" />
      <path d="M4 19h16" />
    </svg>
  );
}

function PanIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h18" />
      <path d="M7 8l-4 4 4 4" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M8 11h6" />
    </svg>
  );
}

function OrbitIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M19.4 15a8 3.8 0 1 1-14.8-6" />
      <path d="M4.6 9A8 3.8 0 1 1 19.4 15" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="14" height="14" rx="3" />
      <path d="M17 10l4-2v8l-4-2z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.9 4.9l1.4 1.4" />
      <path d="M17.7 17.7l1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.9 19.1l1.4-1.4" />
      <path d="M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}

function StepHeader({ step, title, subtitle }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 text-[11px] font-bold text-loverai-dark">
            {step}
          </span>
          <h3 className="truncate text-[1.05rem] font-bold tracking-[-0.02em] text-white">
            {title}
          </h3>
        </div>
        <p className="mt-0.5 pl-9 text-[11px] leading-4 text-white/45">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

const ImageToVideo = ({ onClose }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("slow-pan");
  const [videoStyles, setVideoStyles] = useState(FALLBACK_STYLES);
  const [dynamicMovement, setDynamicMovement] = useState(40);
  const [focusEffect, setFocusEffect] = useState(20);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [apiStatus, setApiStatus] = useState("checking");
  const [userCredits, setUserCredits] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);

  useEffect(() => {
    if (currentUser) {
      checkApiHealth();
      loadVideoStyles();
      fetchUserCredits();
    }
  }, [currentUser]);

  useEffect(() => {
    setGeneratedVideo(null);
  }, [selectedImage, selectedStyle, dynamicMovement, focusEffect]);

  const activeStyle = useMemo(() => {
    return (
      videoStyles.find((style) => style.id === selectedStyle) ||
      FALLBACK_STYLES.find((style) => style.id === selectedStyle) ||
      FALLBACK_STYLES[0]
    );
  }, [selectedStyle, videoStyles]);

  const creditsNeeded = activeStyle?.creditCost || 25;
  const hasEnoughCredits = userCredits >= creditsNeeded;
  const canGenerate =
    !!selectedImage &&
    !!activeStyle &&
    !isGenerating &&
    apiStatus !== "error" &&
    hasEnoughCredits;

  const previewTransform = useMemo(() => {
    const horizontalShift = (dynamicMovement - 50) * 0.35;
    const scale = 1 + focusEffect / 220;
    return `translateX(${horizontalShift}px) scale(${scale})`;
  }, [dynamicMovement, focusEffect]);

  const workspaceClass = isDarkTheme
    ? "bg-[#0e0e10] text-white"
    : "bg-[#f3f0eb] text-[#161616]";

  const panelClass = "glass-card-strong border-white/10 text-white";
  const softCardClass = "border-white/10 bg-white/[0.05] text-white";
  const mutedTextClass = isDarkTheme ? "text-white/55" : "text-black/55";
  const subtleTextClass = isDarkTheme ? "text-white/38" : "text-black/40";
  const cardMutedTextClass = "text-white/55";
  const cardSubtleTextClass = "text-white/38";

  const checkApiHealth = async () => {
    try {
      const data = await aiAPI.checkHealth();

      if (data.status === "healthy" || data.status === "disabled") {
        setApiStatus(data.status);

        if (data.status === "disabled") {
          toast.error("AI service is not fully configured yet.", {
            duration: 6000,
          });
        }
      } else {
        setApiStatus("error");
      }
    } catch (error) {
      setApiStatus("error");
      toast.error("Backend server not reachable");
    }
  };

  const loadVideoStyles = async () => {
    try {
      const data = await aiAPI.getVideoStyles();

      if (data.success && Array.isArray(data.styles) && data.styles.length > 0) {
        setVideoStyles(data.styles);
        if (!data.styles.some((style) => style.id === selectedStyle)) {
          setSelectedStyle(data.styles[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load video styles:", error);
    }
  };

  const fetchUserCredits = async () => {
    try {
      setLoadingCredits(true);
      const data = await paymentAPI.getCredits();
      if (data.success) {
        setUserCredits(data.credits || 0);
      }
    } catch (error) {
      console.error("Failed to load credits:", error);
      toast.error("Failed to load credits");
    } finally {
      setLoadingCredits(false);
    }
  };

  const readImageFile = (file, successMessage) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB limit");
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result || null);
      toast.success(successMessage);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event) => {
    readImageFile(event.target.files?.[0], "Image uploaded successfully");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    readImageFile(event.dataTransfer.files?.[0], "Image dropped successfully");
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleGenerate = async () => {
    if (!currentUser) {
      toast.error("Please login to use this tool");
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      navigate("/login");
      return;
    }

    if (!selectedImage) {
      toast.error("Please upload an image first");
      return;
    }

    if (!activeStyle) {
      toast.error("Please choose a motion style");
      return;
    }

    if (!hasEnoughCredits) {
      toast.error("Not enough credits for video generation");
      return;
    }

    setIsGenerating(true);
    setGeneratedVideo(null);

    const loadingToast = toast.loading(
      "Generating video... this can take a few minutes.",
    );

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("style", activeStyle.id);
      formData.append("dynamicMovement", String(dynamicMovement));
      formData.append("focusEffect", String(focusEffect));

      const data = await aiAPI.generateVideo(formData);

      if (!data.success || !data.videoUrl) {
        throw new Error(data.error || "Video generation failed");
      }

      setGeneratedVideo({
        url: data.videoUrl,
        styleName: data.styleName || activeStyle.name,
        description: data.styleDescription || activeStyle.description,
        duration: data.duration || 5,
        timestamp: data.timestamp,
      });

      if (data.creditInfo?.newBalance !== undefined) {
        setUserCredits(data.creditInfo.newBalance);
      } else {
        fetchUserCredits();
      }

      toast.dismiss(loadingToast);
      toast.success("Video generated successfully");
    } catch (error) {
      toast.dismiss(loadingToast);

      const message =
        error.response?.data?.error ||
        error.message ||
        "Video generation failed";

      if (error.response?.status === 402 || message.includes("credits")) {
        toast.error(message, { duration: 6000 });
      } else if (message.toLowerCase().includes("cloudinary")) {
        toast.error("Video storage is not configured on the backend.", {
          duration: 6000,
        });
      } else {
        toast.error(message, { duration: 6000 });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAll = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setGeneratedVideo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Cleared current selection");
  };

  const downloadVideo = () => {
    if (!generatedVideo?.url) return;

    const link = document.createElement("a");
    link.href = generatedVideo.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = "loversai-generated-video.mp4";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fileMeta = selectedImage
    ? `${selectedImage.name} · ${(selectedImage.size / (1024 * 1024)).toFixed(1)} MB`
    : "JPG, PNG, WebP up to 50MB";

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1c1c1e",
            color: "#fff",
            fontSize: "13px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />

      <section
        className={`relative min-h-[100dvh] w-full overflow-y-auto px-3 py-2 md:px-4 md:py-3 lg:max-h-[100dvh] lg:overflow-y-auto ${workspaceClass}`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[18%] top-[-8%] h-56 w-56 rounded-full bg-blue-500/8 blur-[90px]" />
          <div className="absolute bottom-[-6%] right-[14%] h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto flex min-h-full w-full max-w-[1400px] flex-col gap-2 lg:gap-3">
          <header className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-white/10 ${
                      isDarkTheme
                        ? "border-white/15 text-white"
                        : "border-black/10 text-[#161616]"
                    }`}
                    title="Go back"
                    aria-label="Go back"
                  >
                    <BackIcon />
                  </button>
                )}
                <h1
                  className={`truncate text-[1.4rem] font-bold tracking-[-0.03em] md:text-[1.7rem] ${
                    isDarkTheme ? "text-white" : "text-[#161616]"
                  }`}
                >
                  Image to Video Generator
                </h1>
              </div>
              <p className={`mt-1 pl-11 text-[11px] md:text-xs ${mutedTextClass}`}>
                Transform static images into dynamic videos with AI
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className={`hidden rounded-full border px-3 py-1 text-[11px] font-medium md:block ${
                  isDarkTheme
                    ? "border-white/15 bg-white/5 text-white/70"
                    : "border-black/10 bg-white/70 text-black/70"
                }`}
              >
                {loadingCredits ? "Credits: ..." : `Credits: ${userCredits}`}
              </div>

              <button
                type="button"
                onClick={() => setIsDarkTheme((value) => !value)}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition ${
                  isDarkTheme
                    ? "border-white/15 bg-white/5 text-white/78"
                    : "border-black/10 bg-white/70 text-black/70"
                }`}
                aria-label="Toggle workspace theme"
              >
                {isDarkTheme ? <MoonIcon /> : <SunIcon />}
                <span className="hidden sm:inline">
                  {isDarkTheme ? "Dark" : "Light"}
                </span>
              </button>
            </div>
          </header>

          <main
            className={`flex flex-1 flex-col rounded-[28px] p-3 md:p-4 ${panelClass}`}
          >
            <div className="mb-2 shrink-0 text-center">
              <h2
                className={`text-lg font-black tracking-[-0.03em] md:text-[1.75rem] ${
                  isDarkTheme ? "text-white" : "text-[#161616]"
                }`}
              >
                AI Video Generation Workflow
              </h2>
              <p className={`mt-0.5 text-[11px] md:text-xs ${subtleTextClass}`}>
                Upload -> Select Motion -> Generate your dynamic video
              </p>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="flex flex-col">
                <StepHeader
                  step="1"
                  title="Upload Image"
                  subtitle="Choose the frame you want to animate."
                />

                <div
                  className={`flex flex-1 flex-col rounded-[22px] border p-3 ${softCardClass}`}
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`group flex min-h-[360px] flex-1 flex-col items-center justify-center rounded-[18px] border border-dashed px-4 py-5 text-center transition-all duration-300 lg:min-h-[460px] ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                        : "border-black/10 bg-black/[0.02] hover:border-black/20 hover:bg-black/[0.04]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {imagePreview ? (
                      <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-[14px] lg:min-h-[460px]">
                        <img
                          src={imagePreview}
                          alt="Uploaded preview"
                          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
                          <div className="min-w-0 text-left">
                            <p className="truncate text-sm font-semibold text-white">
                              {selectedImage?.name}
                            </p>
                            <p className="text-[11px] text-white/60">
                              Click to replace
                            </p>
                          </div>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white">
                            <UploadIcon />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
                          <UploadIcon />
                        </div>
                        <p
                          className={`mt-4 text-lg font-bold ${
                            isDarkTheme ? "text-white" : "text-[#161616]"
                          }`}
                        >
                          Drop image here
                        </p>
                        <p className={`mt-1 text-sm ${cardMutedTextClass}`}>
                          or click to browse
                        </p>
                        <p className={`mt-3 text-[11px] font-semibold ${cardSubtleTextClass}`}>
                          JPG, PNG, WebP
                        </p>
                      </>
                    )}
                  </button>

                  <div className="mt-2 flex shrink-0 items-center justify-between gap-3">
                    <div className={`min-w-0 text-[11px] ${cardMutedTextClass}`}>
                      <p className="truncate">{fileMeta}</p>
                    </div>

                    {imagePreview && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <StepHeader
                  step="2"
                  title="Select Motion"
                  subtitle="Pick a motion style and fine-tune the feel."
                />

                <div
                  className={`flex flex-1 flex-col rounded-[22px] border p-3 ${softCardClass}`}
                >
                  <div className="grid shrink-0 grid-cols-2 gap-2 xl:grid-cols-3">
                    {videoStyles.map((style) => {
                      const decor = STYLE_DECOR[style.id] || STYLE_DECOR["slow-pan"];
                      const Icon = decor.icon;
                      const isActive = selectedStyle === style.id;

                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSelectedStyle(style.id)}
                          aria-pressed={isActive}
                          className={`rounded-[16px] border p-2.5 text-left transition-all duration-200 ${
                            isActive
                              ? "border-loverai-gold bg-loverai-gold/10 shadow-[0_8px_24px_rgba(230,198,178,0.12)]"
                              : `${decor.border} bg-gradient-to-br ${decor.tint} hover:border-white/25`
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                isActive
                                  ? "bg-loverai-gold/20 text-loverai-gold"
                                  : isDarkTheme
                                    ? "bg-white/8 text-white/70"
                                    : "bg-black/[0.04] text-black/65"
                              }`}
                            >
                              <Icon />
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`truncate text-[12px] font-semibold ${
                                  isDarkTheme ? "text-white" : "text-[#161616]"
                                }`}
                              >
                                {style.name}
                              </p>
                              <p className={`mt-0.5 text-[10px] leading-4 ${cardSubtleTextClass}`}>
                                {style.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 grid flex-1 gap-2">
                    <div className={`rounded-[18px] border p-3 ${softCardClass}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                            <PanIcon />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              Dynamic Movement
                            </p>
                            <p className={`text-[10px] ${cardSubtleTextClass}`}>
                              Panning pace and travel strength
                            </p>
                          </div>
                        </div>
                        <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white">
                          {dynamicMovement}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={dynamicMovement}
                        onChange={(event) =>
                          setDynamicMovement(parseInt(event.target.value, 10))
                        }
                        className="h-1.5 w-full cursor-pointer accent-loverai-gold"
                        aria-label="Dynamic movement intensity"
                      />
                      <div className={`mt-1 flex justify-between text-[10px] font-medium ${cardSubtleTextClass}`}>
                        <span>Subtle</span>
                        <span>Intense</span>
                      </div>
                    </div>

                    <div className={`rounded-[18px] border p-3 ${softCardClass}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-300">
                            <ZoomInIcon />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              Focus Effect
                            </p>
                            <p className={`text-[10px] ${cardSubtleTextClass}`}>
                              Zoom depth and subject emphasis
                            </p>
                          </div>
                        </div>
                        <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white">
                          {focusEffect}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={focusEffect}
                        onChange={(event) =>
                          setFocusEffect(parseInt(event.target.value, 10))
                        }
                        className="h-1.5 w-full cursor-pointer accent-loverai-gold"
                        aria-label="Focus effect intensity"
                      />
                      <div className={`mt-1 flex justify-between text-[10px] font-medium ${cardSubtleTextClass}`}>
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className={`rounded-[16px] border px-3 py-2 ${softCardClass}`}>
                        <p className={`text-[10px] uppercase tracking-[0.18em] ${cardSubtleTextClass}`}>
                          Style
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-white">
                          {activeStyle?.name}
                        </p>
                      </div>
                      <div className={`rounded-[16px] border px-3 py-2 ${softCardClass}`}>
                        <p className={`text-[10px] uppercase tracking-[0.18em] ${cardSubtleTextClass}`}>
                          Credit Cost
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {creditsNeeded} credits
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <StepHeader
                  step="3"
                  title="Generate Video"
                  subtitle="Preview and export your generated result."
                />

                <div
                  className={`flex flex-1 flex-col rounded-[22px] border p-3 ${softCardClass}`}
                >
                  <div
                    className={`relative min-h-[360px] flex-1 overflow-hidden rounded-[18px] border lg:min-h-[460px] ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-black/10 bg-black/[0.02]"
                    }`}
                  >
                    {generatedVideo ? (
                      <video
                        key={generatedVideo.url}
                        controls
                        playsInline
                        className="absolute inset-0 h-full w-full bg-black object-cover"
                        src={generatedVideo.url}
                      />
                    ) : imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Source preview for video generation"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500"
                          style={{ transform: previewTransform }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <div className="rounded-[14px] border border-white/10 bg-black/25 p-3 backdrop-blur-md">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
                                {isGenerating ? <SpinnerIcon /> : <VideoIcon />}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {isGenerating
                                    ? "Generating video..."
                                    : activeStyle?.name || "Preview ready"}
                                </p>
                                <p className="text-[11px] text-white/65">
                                  {isGenerating
                                    ? "This may take a few minutes depending on backend load."
                                    : activeStyle?.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
                          <VideoIcon />
                        </div>
                        <p className="mt-4 text-base font-bold text-white">
                          Video appears here
                        </p>
                        <p className={`mt-1 text-sm ${cardMutedTextClass}`}>
                          Upload and select motion first
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 grid shrink-0 gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`rounded-[16px] border px-3 py-2 ${softCardClass}`}>
                        <p className={`text-[10px] uppercase tracking-[0.18em] ${cardSubtleTextClass}`}>
                          Status
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {generatedVideo
                            ? "Completed"
                            : isGenerating
                              ? "In progress"
                              : apiStatus === "error"
                                ? "Offline"
                                : "Ready"}
                        </p>
                      </div>
                      <div className={`rounded-[16px] border px-3 py-2 ${softCardClass}`}>
                        <p className={`text-[10px] uppercase tracking-[0.18em] ${cardSubtleTextClass}`}>
                          Credits
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {loadingCredits ? "Loading..." : `${userCredits} available`}
                        </p>
                      </div>
                    </div>

                    {generatedVideo ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={downloadVideo}
                          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/8 text-sm font-semibold text-white transition hover:bg-white/12"
                        >
                          <DownloadIcon />
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={isGenerating || !selectedImage}
                          className="flex h-11 flex-1 items-center justify-center rounded-[16px] bg-gradient-to-r from-loverai-gold to-amber-700 text-sm font-bold text-loverai-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Regenerate
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-loverai-gold to-amber-700 text-sm font-bold text-loverai-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isGenerating && <SpinnerIcon />}
                        {isGenerating
                          ? "Generating..."
                          : `Generate Video (${creditsNeeded})`}
                      </button>
                    )}

                    {!hasEnoughCredits && !loadingCredits && (
                      <button
                        type="button"
                        onClick={() => navigate("/pricing")}
                        className="text-[11px] font-semibold text-loverai-gold underline underline-offset-4"
                      >
                        Buy more credits
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>
    </>
  );
};

export default ImageToVideo;

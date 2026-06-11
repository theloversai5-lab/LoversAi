// AngleChangeComponent.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { aiAPI, paymentAPI } from "../../../api/api";

const AngleChangeComponent = ({ onClose }) => {
  // Authentication
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Component states
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedAngles, setSelectedAngles] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [apiStatus, setApiStatus] = useState("checking");
  const [userCredits, setUserCredits] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [creditInfo, setCreditInfo] = useState({
    currentCredits: 0,
    creditsNeeded: 15, // Default 15 credits per angle change
    hasEnough: false,
  });

  // Added model type state
  const [modelType] = useState("flux-kontext-pro");
  const RESULT_IMAGE_URL = "/images/ai_tools_img/image-2.png";

  const fileInputRef = useRef(null);

  // Angle options (names and descriptions updated to match user screenshot exactly)
  const angles = [
    {
      id: "front",
      name: "Front View",
      desc: "Main entrance perspective",
      icon: "🏛️",
      creditCost: 15,
    },
    {
      id: "aerial",
      name: "Aerial View",
      desc: "Bird's eye view from above",
      icon: "🛰️",
      creditCost: 15,
    },
    {
      id: "side",
      name: "Side View",
      desc: "Side profile view",
      icon: "↔️",
      creditCost: 15,
    },
    {
      id: "corner",
      name: "Corner View",
      desc: "Diagonal corner perspective",
      icon: "↗️",
      creditCost: 15,
    },
  ];

  // Check API health and load credits on component mount
  useEffect(() => {
    if (currentUser) {
      checkApiHealth();
      fetchUserCredits();
    } else {
      toast.error("Please login to use this tool");
      setTimeout(() => {
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
        navigate("/login");
      }, 2000);
    }
  }, [currentUser, navigate]);

  // Update credit check when selected angles or model type changes
  useEffect(() => {
    if (currentUser && selectedImage) {
      updateCreditCheck();
    }
  }, [selectedAngles, selectedImage, modelType]);

  const checkApiHealth = async () => {
    try {
      const data = await aiAPI.checkHealth();

      if (data.status === "healthy" || data.status === "disabled") {
        setApiStatus("healthy");

        if (data.status === "disabled") {
          toast.error(
            "AI service not configured. Please check backend setup.",
            {
              duration: 8000,
            },
          );
        }
      } else {
        setApiStatus("error");
        toast.error("Cannot connect to AI service");
      }
    } catch (error) {
      setApiStatus("error");
      toast.error("Backend server not reachable");
    }
  };

  const fetchUserCredits = async () => {
    if (!currentUser) return;

    try {
      setLoadingCredits(true);

      const data = await paymentAPI.getCredits();

      if (data.success) {
        setUserCredits(data.credits || 0);
        setCreditInfo((prev) => ({
          ...prev,
          currentCredits: data.credits || 0,
        }));
      } else {
        toast.error("Failed to load credits");
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      toast.error("Failed to load credits");
    } finally {
      setLoadingCredits(false);
    }
  };

  const updateCreditCheck = () => {
    const creditsNeeded = calculateCreditCost(selectedAngles.length, modelType);
    const hasEnough = userCredits >= creditsNeeded;

    setCreditInfo({
      currentCredits: userCredits,
      creditsNeeded: creditsNeeded,
      hasEnough: hasEnough,
    });
  };

  const calculateCreditCost = (count = 1, model = "flux-kontext-pro") => {
    let totalCost = count * 15; // 15 credits per angle change

    // Premium models cost more (if applicable)
    if (
      model.includes("pro") ||
      model.includes("max") ||
      model === "flux-kontext-pro"
    ) {
      totalCost += 5 * count; // Add 5 credits per angle for premium
    }

    return totalCost;
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size exceeds 50MB limit");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      setGeneratedResult(null);
      toast.success("Image selected successfully");
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size exceeds 50MB limit");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      setGeneratedResult(null);
      toast.success("Image uploaded successfully");
    } else {
      toast.error("Please drop an image file");
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Handle angle selection
  const handleAngleToggle = (angleId) => {
    if (selectedAngles.includes(angleId)) {
      setSelectedAngles(selectedAngles.filter((id) => id !== angleId));
    } else {
      setSelectedAngles([...selectedAngles, angleId]);
    }
  };

  // Handle angle change generation
  const handleGenerate = async () => {
    // Check authentication
    if (!currentUser) {
      toast.error("Please login to use this tool");
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      navigate("/login");
      return;
    }

    // Validate API connection
    if (apiStatus === "error") {
      toast.error("Cannot connect to backend server");
      return;
    }

    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    if (selectedAngles.length === 0) {
      toast.error("Please select at least one angle view");
      return;
    }

    setIsGenerating(true);

    try {
      const selectedAngleName =
        angles.find((a) => a.id === selectedAngles[0])?.name || "Generated Result";

      setGeneratedResult({
        success: true,
        url: RESULT_IMAGE_URL,
        transformation: {
          angleView: {
            name: selectedAngleName,
          },
          modelType: "preset",
        },
      });

      toast.success("Image transformed successfully!");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download image
  const downloadImage = async (url, filename) => {
    try {
      let blobUrl = url;
      if (url?.startsWith("/images/")) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch local image");
        }
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
      } else {
        // Use backend proxy to avoid CORS issues with external URLs
        const data = await aiAPI.downloadImage({ imageUrl: url });

        if (!data.success) throw new Error("Failed to download image");

        const blob = new Blob([data.imageData], { type: "image/jpeg" });
        blobUrl = URL.createObjectURL(blob);
      }

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "angle-transformed-image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image: " + error.message);
    }
  };

  const handleBuyCredits = () => {
    sessionStorage.setItem("redirectAfterPurchase", window.location.pathname);
    navigate("/pricing");
  };

  const clearAll = () => {
    setSelectedImage(null);
    setSelectedAngles([]);
    setImagePreview(null);
    setGeneratedResult(null);
    toast.success("Cleared all selections");
  };

  const closeAndReset = () => {
    setSelectedImage(null);
    setSelectedAngles([]);
    setImagePreview(null);
    setGeneratedResult(null);
    if (onClose) onClose();
  };

  const currentCreditCost = calculateCreditCost(
    selectedAngles.length,
    modelType,
  );

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1c1c1e",
            color: "#fff",
            fontSize: "14px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#eab308",
              secondary: "#000",
            },
          },
          error: {
            duration: 6000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#000",
            },
          },
        }}
      />

      <div className="h-[100dvh] bg-[#0e0e10] text-white font-['Poppins'] relative overflow-hidden py-3 px-3 md:px-5 lg:px-6 flex flex-col">
        {/* Modern ambient glassmorphic glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"></div>

        {/* Top Header Section */}
        <header className="max-w-[1400px] mx-auto mb-3 md:mb-4 w-full shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* Back Button + Title */}
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                {onClose && (
                  <button
                    onClick={closeAndReset}
                    className="hover:opacity-75 transition-opacity text-xl md:text-2xl font-light text-white cursor-pointer"
                    title="Go Back"
                  >
                    ←
                  </button>
                )}
                <h1 className="text-[28px] md:text-[34px] font-bold text-white tracking-tight">
                  Angle Changing AI
                </h1>
              </div>
              <p className="text-gray-400 font-medium text-[11px] md:text-xs pl-7 md:pl-8">
                Transform venue perspectives with intelligent AI
              </p>
            </div>

            {/* Outlined Badges + Sleek Credits Pill */}
            <div className="flex flex-wrap items-center gap-2 pl-7 md:pl-0">
              <span className="border border-white/20 px-3 py-1 rounded-full text-[10px] font-medium text-white/80 select-none">
                Perspective Control
              </span>
              <span className="border border-white/20 px-3 py-1 rounded-full text-[10px] font-medium text-white/80 select-none">
                Smart Angles
              </span>
              <span className="border border-white/20 px-3 py-1 rounded-full text-[10px] font-medium text-white/80 select-none">
                Professional Quality
              </span>

              {/* Dynamic Credits Display */}
              <button
                onClick={fetchUserCredits}
                disabled={loadingCredits || isGenerating}
                className="bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all text-white ml-2 cursor-pointer disabled:opacity-50"
                title="Click to refresh credits"
              >
                <span>🎫</span>
                <span>
                  {loadingCredits ? "..." : userCredits.toLocaleString()}{" "}
                  Credits
                </span>
                <span
                  className={
                    loadingCredits ? "animate-spin text-[8px]" : "text-[8px]"
                  }
                >
                  🔄
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace White Card Panel */}
        <main className="max-w-[1400px] mx-auto w-full flex-1 min-h-0 glass-card-strong text-white rounded-[28px] p-4 md:p-5 lg:p-6 mb-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 h-full min-h-0">
            {/* Column 1: Upload Image (Step 1) */}
            <div className="flex flex-col h-full min-h-0">
              <div className="flex flex-col items-center text-center mb-3 select-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 text-loverai-dark flex items-center justify-center font-bold text-[11px] mb-1.5 select-none">
                  1
                </div>
                <h2 className="text-lg lg:text-xl font-bold text-white">Upload Image</h2>
                <p className="text-[11px] text-white/50">Add your venue photo</p>
              </div>

              <div className="flex-1 min-h-0 glass-card rounded-[22px] p-3 md:p-4 flex flex-col">
                <div
                  className={`flex-1 min-h-0 border border-dashed rounded-[18px] flex flex-col items-center justify-center p-4 md:p-5 text-center cursor-pointer transition-all duration-300 ${
                    imagePreview
                      ? "border-loverai-gold bg-loverai-gold/5"
                      : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                  } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !isGenerating && fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isGenerating}
                  />

                  {imagePreview ? (
                    <div className="relative w-full h-full min-h-0 rounded-[16px] overflow-hidden group">
                      <img
                        src={imagePreview}
                        alt="Selected venue"
                        className="absolute inset-0 w-full h-full object-cover rounded-[16px]"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-[16px]">
                        <div className="text-center text-white">
                          <span className="text-2xl block mb-1">📷</span>
                          <p className="text-xs font-semibold">Change Image</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      {/* Plus Icon */}
                      <div className="text-4xl font-light text-white/40 mb-3 select-none">
                        +
                      </div>
                      <p className="text-[13px] font-bold text-white mb-1">
                        Drop your image here
                      </p>
                      <p className="text-[12px] text-white/50 mb-3">
                        or click to browse files
                      </p>
                      <p className="text-[10px] text-white/30">
                        Supports JPG, PNG, WebP • Max 10MB
                      </p>
                    </div>
                  )}
                </div>

                {imagePreview && (
                  <button
                    onClick={clearAll}
                    disabled={isGenerating}
                    className="mt-2.5 text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center justify-center gap-1 py-1 px-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all self-center cursor-pointer"
                  >
                    Clear Image
                  </button>
                )}
              </div>
            </div>

            {/* Column 2: Select Angle (Step 2) */}
            <div className="flex flex-col h-full min-h-0">
              <div className="flex flex-col items-center text-center mb-3 select-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 text-loverai-dark flex items-center justify-center font-bold text-[11px] mb-1.5 select-none">
                  2
                </div>
                <h2 className="text-lg lg:text-xl font-bold text-white">Select Angle</h2>
                <p className="text-[11px] text-white/50">Choose perspective view</p>
              </div>

              <div className="flex-1 min-h-0 glass-card rounded-[22px] p-3 md:p-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  {angles.map((angle) => {
                    const isSelected = selectedAngles.includes(angle.id);
                    return (
                      <button
                        key={angle.id}
                        onClick={() => handleAngleToggle(angle.id)}
                        disabled={isGenerating}
                        className={`w-full p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-loverai-gold bg-white/10 text-white shadow-sm"
                            : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                        } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div
                              className={`font-bold text-[13px] ${isSelected ? "text-loverai-gold" : "text-white"}`}
                            >
                              {angle.name}
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5">
                              {angle.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-loverai-gold shadow-sm animate-pulse"></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Generate Button positioned at the bottom of Column 2 */}
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <button
                    onClick={handleGenerate}
                    disabled={
                      !selectedImage ||
                      selectedAngles.length === 0 ||
                      isGenerating ||
                      apiStatus === "error"
                    }
                    className={`w-full py-2.5 px-6 rounded-xl font-bold text-[12px] transition-all duration-300 cursor-pointer max-w-[200px] mx-auto block text-center ${
                      !selectedImage ||
                      selectedAngles.length === 0 ||
                      isGenerating ||
                      apiStatus === "error"
                        ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                        : "bg-gradient-to-r from-loverai-gold to-amber-700 text-loverai-dark hover:brightness-110 shadow-lg hover:shadow-loverai-gold/20 transform active:scale-95"
                    }`}
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      "Generate"
                    )}
                  </button>

                  {/* credit limits & error states */}
                  {selectedImage && selectedAngles.length > 0 && (
                    <div className="mt-2 text-center">
                      <p className="text-[9px] text-gray-400 font-semibold">
                        Cost: {currentCreditCost} Credits
                      </p>
                      {!creditInfo.hasEnough && (
                        <div className="mt-1.5 p-1.5 bg-red-50 border border-red-200 rounded-lg max-w-[220px] mx-auto">
                          <p className="text-[8px] text-red-600 font-bold leading-tight">
                            Insufficient credits! (Need{" "}
                            {currentCreditCost - userCredits} more)
                          </p>
                          <button
                            onClick={handleBuyCredits}
                            className="mt-1 text-[8px] bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded transition-colors"
                          >
                            Buy Credits
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Download Result (Step 3) */}
            <div className="flex flex-col h-full min-h-0">
              <div className="flex flex-col items-center text-center mb-3 select-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 text-loverai-dark flex items-center justify-center font-bold text-[11px] mb-1.5 select-none">
                  3
                </div>
                <h2 className="text-lg lg:text-xl font-bold text-white">
                  Download Result
                </h2>
                <p className="text-[11px] text-white/50">Your transformed view</p>
              </div>

              <div className="flex-1 min-h-0 glass-card rounded-[22px] p-3 md:p-4 flex flex-col">
                {isGenerating ? (
                  /* Loading State */
                  <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-5 text-center">
                    <div className="relative mb-4">
                      <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-loverai-gold animate-spin"></div>
                      <span className="absolute inset-0 flex items-center justify-center text-sm">
                        ✨
                      </span>
                    </div>
                    <h3 className="text-[13px] font-bold text-white mb-1">
                      Transforming Perspectives...
                    </h3>
                    <p className="text-[11px] text-white/50 max-w-[190px] mb-3 leading-snug">
                      Our advanced AI is rendering the selected views. This
                      takes 30-60 seconds.
                    </p>
                    <div className="w-full max-w-[140px] bg-white/10 h-1 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-loverai-gold to-amber-500 h-full w-4/5 animate-pulse rounded-full"></div>
                    </div>
                  </div>
                ) : generatedResult ? (
                  /* Generated Results Display */
                  <div className="flex-1 flex flex-col min-h-0">
                    {generatedResult.multiple ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {generatedResult.results.map((result, index) => (
                          <div
                            key={index}
                            className="bg-white/5 border border-white/10 rounded-xl p-2.5"
                          >
                            <div className="relative rounded-lg overflow-hidden mb-2 aspect-[4/3] bg-white/5">
                              <img
                                src={result.url}
                                alt={`${result.angleName} view`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                {result.angleName}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-[9px] text-white/40 font-semibold">
                                {result.creditCost} credits
                              </div>
                              <button
                                onClick={() =>
                                downloadImage(
                                    result.url,
                                    `angle-${result.angle}-${Date.now()}.jpg`,
                                  )
                                }
                                className="bg-gradient-to-r from-loverai-gold to-amber-700 text-loverai-dark px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                📥 Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between h-full min-h-0">
                        <div className="relative rounded-xl overflow-hidden h-[240px] lg:h-[260px] bg-white/5 mb-3 shadow-inner">
                          <img
                            src={generatedResult.url}
                            alt="Generated angle view"
                            className="w-full h-full object-contain bg-black/20"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => downloadImage(generatedResult.url)}
                            className="w-full bg-gradient-to-r from-loverai-gold to-amber-700 text-loverai-dark hover:brightness-110 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            📥 Download Result
                          </button>

                          <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                            <span className="text-[9px] text-white/50 font-semibold">
                              Credits Used:{" "}
                              {modelType === "flux-kontext-pro" ? "20" : "15"}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                className="w-[22px] h-[22px] rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-400 flex items-center justify-center text-[9px] transition-all cursor-pointer"
                                onClick={() =>
                                  toast.success("Feedback sent! Thank you.")
                                }
                                title="Love it!"
                              >
                                👍
                              </button>
                              <button
                                className="w-[22px] h-[22px] rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center text-[9px] transition-all cursor-pointer"
                                onClick={() =>
                                  toast.success("Feedback sent! Thank you.")
                                }
                                title="Needs improvements"
                              >
                                👎
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty State (matches screenshot exactly) */
                  <div className="flex-1 border border-dashed border-white/10 bg-white/5 rounded-[20px] flex flex-col items-center justify-center p-4 md:p-5 text-center">
                    <div className="text-3xl font-light text-white/40 mb-3 select-none">
                      ↓
                    </div>
                    <p className="text-[13px] font-bold text-white mb-1">
                      Download your result
                    </p>
                    <p className="text-[12px] text-white/50 mb-3">
                      Click to save transformed image
                    </p>
                    <p className="text-[10px] text-white/30">
                      High quality JPG format
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Previous Transformations History */}
        {generationHistory.length > 0 && (
          <div className="max-w-[1400px] mx-auto w-full shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[26px] p-3 md:p-4 mb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-3">
              <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span className="text-base">📚</span>
                Previous Transformations
              </h3>
              <div className="flex gap-2">
                <button
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-all cursor-pointer"
                  onClick={checkApiHealth}
                >
                  <span>🔄</span>
                  Refresh
                </button>
                <button
                  className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer"
                  onClick={() => setGenerationHistory([])}
                >
                  <span>🗑️</span>
                  Clear History
                </button>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
              {generationHistory.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="relative group flex-none w-[140px] sm:w-[160px] h-[92px] rounded-[18px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/5 bg-black/40"
                >
                  <img
                    src={item.url}
                    alt={`${item.angleName} view`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-350 flex items-center justify-center gap-2.5">
                    <button
                      className="w-7 h-7 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer text-xs"
                      onClick={() => {
                        setGeneratedResult({
                          success: true,
                          url: item.url,
                          transformation: {
                            angleView: { name: item.angleName },
                            modelType: item.modelType || "flux-kontext-pro",
                          },
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      title="View transformation details"
                    >
                      👁️
                    </button>
                    <button
                      className="w-7 h-7 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer text-xs"
                      onClick={() =>
                        downloadImage(item.url, `angle-${item.angle}.jpg`)
                      }
                      title="Download image"
                    >
                      📥
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[9px] px-2 py-1 flex justify-between items-center">
                    <span className="truncate max-w-[80px] font-medium">
                      {item.angleName}
                    </span>
                    <span className="text-yellow-400 font-bold">
                      {item.creditsUsed || 15} Cr
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AngleChangeComponent;

// retexturing.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { aiAPI, paymentAPI } from "../../../api/api";

const RetexturingTool = ({ onClose }) => {
  // Authentication
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Retexturing states
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [modelType, setModelType] = useState("flux-kontext-pro");
  const [imageCount, setImageCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [apiStatus, setApiStatus] = useState("checking");
  const [, setAvailableThemes] = useState({});
  const [userCredits, setUserCredits] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [, setCreditCheckResult] = useState(null);
  const [creditInfo, setCreditInfo] = useState({
    currentCredits: 0,
    creditsNeeded: 10,
    hasEnough: false,
  });

  const fileInputRef = useRef(null);

  const themes = {
    haldi: "Haldi Ceremony",
    mehendi: "Mehendi Ceremony",
    sangeet: "Sangeet Night",
    wedding: "Wedding Ceremony",
    reception: "Reception Party",
    engagement: "Engagement Ceremony",
    cocktail: "Cocktail Party",
  };

  const UI_THEMES = [
    { key: "", label: "Custom Only", icon: null, dots: [] },
    { key: "haldi", label: "Haldi", icon: "sun", dots: ["bg-yellow-400", "bg-amber-500", "bg-orange-400"] },
    { key: "mehendi", label: "Mehendi", icon: "hash", dots: ["bg-green-600", "bg-emerald-800", "bg-orange-400"] },
    { key: "sangeet", label: "Sangeet", icon: "music", dots: ["bg-red-500", "bg-yellow-400", "bg-red-800"] },
    { key: "wedding", label: "Wedding", icon: "heart", dots: ["bg-red-600", "bg-yellow-500", "bg-gray-100"] },
    { key: "reception", label: "Reception", icon: "lock", dots: ["bg-blue-900", "bg-slate-400", "bg-sky-400"] },
    { key: "engagement", label: "Engagement", icon: "star", dots: ["bg-pink-400", "bg-gray-100", "bg-rose-300"] },
    { key: "cocktail", label: "Cocktail", icon: "cocktail", dots: ["bg-purple-600", "bg-indigo-700", "bg-cyan-400"] },
  ];

  // Check API health and load credits on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser) {
      checkApiHealth();
      loadThemes();
      fetchUserCredits();
    } else {
      toast.error("Please login to use this tool");
      setTimeout(() => {
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
        navigate("/login");
      }, 2000);
    }
  }, [currentUser, navigate]);

  // Update credit check when imageCount or modelType changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser && selectedImage) {
      checkCreditsForGeneration();
    }
  }, [imageCount, modelType, selectedImage, selectedTheme]);

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

  const loadThemes = async () => {
    try {
      const data = await aiAPI.getThemes();
      if (data.success) {
        setAvailableThemes(data.themes);
      }
    } catch (error) {
      console.log("Failed to load themes, using default");
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

  const checkCreditsForGeneration = async () => {
    if (!currentUser || !selectedImage) return;

    try {
      const creditsNeeded = calculateCreditCost(imageCount, modelType);

      const data = await aiAPI.checkCredits({
        operation: "generate",
        imageCount: imageCount,
        modelType: modelType,
      });

      setCreditCheckResult(data);

      if (data.success) {
        setCreditInfo({
          currentCredits: data.currentCredits || userCredits,
          creditsNeeded: data.requiredCredits || creditsNeeded,
          hasEnough: data.hasEnoughCredits || false,
        });
      } else {
        console.error("Credit check failed");
      }
    } catch (error) {
      console.error("Error checking credits:", error);
    }
  };

  const calculateCreditCost = (count = 1, model = "flux-kontext-pro") => {
    const baseCost = 10;
    let totalCost = baseCost * count;

    // Premium models cost more
    if (model.includes("pro") || model.includes("max")) {
      totalCost += 5 * count;
    }

    return totalCost;
  };

  // Upload functions
  const handleFileSelect = (event) => {
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
      toast.success("Image selected successfully");

      // Check credits for new image
      setTimeout(() => checkCreditsForGeneration(), 100);
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
      toast.success("Image uploaded successfully");

      // Check credits for new image
      setTimeout(() => checkCreditsForGeneration(), 100);
    } else {
      toast.error("Please drop an image file");
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Generation functions
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

    if (!selectedTheme && !customPrompt.trim()) {
      toast.error("Please select a theme or enter a custom prompt");
      return;
    }

    // Check if user has enough credits
    // const creditsNeeded = calculateCreditCost(imageCount, modelType);
    // if (userCredits < creditsNeeded) {
    //   toast.error(`Insufficient credits! You need ${creditsNeeded} credits but have only ${userCredits}.`);

    //   // Show option to go to pricing page
    //   if (window.confirm(`You need ${creditsNeeded - userCredits} more credits. Go to pricing page to purchase more?`)) {
    //     sessionStorage.setItem('redirectAfterPurchase', window.location.pathname);
    //     navigate('/pricing');
    //   }
    //   return;
    // }

    setIsGenerating(true);

    try {
      const loadingToast = toast.loading(
        "Transforming your venue... This may take 30-60 seconds.",
      );

      // Prepare form data
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("theme", selectedTheme === "cocktail" ? "" : selectedTheme);
      formData.append("customPrompt", selectedTheme === "cocktail"
        ? `Transform this venue into a luxurious cocktail party with elegant cocktail tables, sophisticated ambient lighting, chic bar service area, with a purple, indigo and cyan color theme. ${customPrompt}`.trim()
        : customPrompt
      );
      formData.append("modelType", modelType);
      formData.append("imageCount", imageCount.toString());

      console.log("Sending request to generate");
      // console.log('Credits needed:', creditsNeeded);

      // Call the backend API
      const result = await aiAPI.generate(formData);
      console.log("API Response:", result);

      if (!result.success) {
        // Handle credit-related errors specifically
        if (result.code === "INSUFFICIENT_CREDITS") {
          throw new Error(
            result.error || "Insufficient credits. Please purchase more.",
          );
        }
        throw new Error(result.error || "Generation failed");
      }

      if (result.success && result.url) {
        const newGeneration = {
          id: Date.now(),
          url: result.url,
          theme: selectedTheme,
          customPrompt: customPrompt,
          modelType: modelType,
          timestamp: new Date().toISOString(),
          promptUsed: result.promptUsed,
          seed: result.seed,
          // creditsUsed: creditsNeeded,
          // creditInfo: result.creditInfo || {
          //   deducted: creditsNeeded,
          //   newBalance: userCredits - creditsNeeded
          // }
        };

        setGeneratedImage(newGeneration);
        setGenerationHistory((prev) => [newGeneration, ...prev.slice(0, 9)]);

        // // Update local credit balance
        // if (result.creditInfo) {
        //   const newBalance = result.creditInfo.newBalance;
        //   setUserCredits(newBalance);
        //   setCreditInfo(prev => ({
        //     ...prev,
        //     currentCredits: newBalance,
        //     hasEnough: true // Since we don't require credits
        //   }));

        //   toast.success(`Credits deducted: ${result.creditInfo.deducted || 0}. New balance: ${newBalance}`);
        // } else {
        //   // Fallback calculation
        //   const newBalance = userCredits - (result.creditInfo?.deducted || 0);
        //   setUserCredits(newBalance);
        //   setCreditInfo(prev => ({
        //     ...prev,
        //     currentCredits: newBalance,
        //     hasEnough: true
        //   }));
        // }

        toast.dismiss(loadingToast);
        toast.success("Venue transformed successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Generation error:", error);

      // Handle specific error messages
      if (
        error.message.includes("credits") ||
        error.message.includes("Insufficient")
      ) {
        toast.error(error.message, {
          duration: 6000,
          action: {
            label: "Buy Credits",
            onClick: () => {
              sessionStorage.setItem(
                "redirectAfterPurchase",
                window.location.pathname,
              );
              navigate("/pricing");
            },
          },
        });
      } else if (error.message.includes("timeout")) {
        toast.error("Generation timed out. Please try again.");
      } else if (error.message.includes("busy")) {
        toast.error("AI service is busy. Please wait a moment and try again.");
      } else {
        toast.error(error.message || "Generation failed. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedback = async (generationId, feedbackType) => {
    try {
      await aiAPI.sendFeedback({
        feedback: feedbackType,
        resultUrl: generatedImage?.url,
        theme: selectedTheme,
        customPrompt: customPrompt,
        modelType: modelType,
        creditCost: calculateCreditCost(imageCount, modelType),
        userId: currentUser.uid,
      });

      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.log(`Feedback ${feedbackType} for generation ${generationId}`);
    }
  };

  const handleClearHistory = () => {
    setGenerationHistory([]);
    toast.success("History cleared");
  };

  const handleDeleteGeneration = (id) => {
    setGenerationHistory((prev) => prev.filter((item) => item.id !== id));
    if (generatedImage?.id === id) {
      setGeneratedImage(null);
    }
    toast.success("Generation deleted");
  };

  const downloadImage = async (url, filename) => {
    try {
      // Use backend proxy to avoid CORS issues with external URLs
      const data = await aiAPI.downloadImage({ imageUrl: url });

      if (!data.success) throw new Error("Failed to download image");

      const blob = new Blob([data.imageData], { type: "image/jpeg" });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || `venue-transformation-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
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

  const closeAndReset = () => {
    setSelectedImage(null);
    setSelectedTheme("");
    setCustomPrompt("");
    setGeneratedImage(null);
    setGenerationHistory([]);
    onClose();
  };

  // Calculate credit cost for current settings
  const currentCreditCost = calculateCreditCost(imageCount, modelType);

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

      <div className="min-h-screen bg-[#0e0e10] text-white font-['Poppins'] relative overflow-hidden py-12 px-4 md:px-8 lg:px-16">
        {/* Modern ambient glassmorphic glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"></div>

        {/* Top Header Section */}
        <header className="max-w-[1400px] mx-auto mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Back Button + Title */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button
                  onClick={closeAndReset}
                  className="hover:opacity-75 transition-opacity text-2xl font-light text-white"
                  title="Go Back"
                >
                  ←
                </button>
                <h1 className="text-3xl md:text-[36px] font-bold text-white tracking-tight">
                  Retexturing AI
                </h1>
              </div>
              <p className="text-gray-400 font-medium text-xs md:text-sm pl-8">
                Transform venues with intelligent AI
              </p>
            </div>

            {/* Outlined Badges + Sleek Credits Pill */}
            <div className="flex flex-wrap items-center gap-2 pl-8 md:pl-0">
              <span className="border border-white/20 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/80 select-none">
                Smart Prompts
              </span>
              <span className="border border-white/20 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/80 select-none">
                Structure Preservation
              </span>
              <span className="border border-white/20 px-4 py-1.5 rounded-full text-[11px] font-medium text-white/80 select-none">
                Multiple Variations
              </span>
              
              {/* Dynamic Credits Display */}
              <button
                onClick={fetchUserCredits}
                disabled={loadingCredits || isGenerating}
                className="bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all text-white ml-2 cursor-pointer disabled:opacity-50"
                title="Click to refresh credits"
              >
                <span>🎫</span>
                <span>{loadingCredits ? "..." : userCredits.toLocaleString()} Credits</span>
                <span className={loadingCredits ? "animate-spin text-[8px]" : "text-[8px]"}>🔄</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Grid Workspace */}
        <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Upload, Model, Quantity, Custom Prompt) - spans 5 of 12 */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Upload Card */}
            <div className="bg-white text-black rounded-[32px] p-8 shadow-xl flex flex-col h-full min-h-[350px]">
              <h2 className="text-[22px] font-bold text-[#111] mb-1">
                Upload Your Venue Image
              </h2>
              <p className="text-[13px] text-gray-500 mb-6 font-normal">
                Upload a clear image of your venue to get started
              </p>

              <div
                className={`flex-1 border-2 border-dashed rounded-[24px] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
                  selectedImage
                    ? "border-yellow-500 bg-yellow-50/10"
                    : "border-gray-200 hover:border-black hover:bg-gray-50"
                } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => !isGenerating && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isGenerating}
                />

                {selectedImage ? (
                  <div className="relative w-full h-full min-h-[180px] rounded-[16px] overflow-hidden group">
                    <img
                      src={URL.createObjectURL(selectedImage)}
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
                  <div className="py-6">
                    {/* Cloud upload icon inside a dark circle */}
                    <div className="w-16 h-16 bg-[#18181b] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 13v8" />
                        <path d="M12 13l-3 3" />
                        <path d="M12 13l3 3" />
                        <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
                      </svg>
                    </div>
                    <p className="text-[15px] font-bold text-black mb-1">
                      Drop image or click to browse
                    </p>
                    <p className="text-[11px] text-gray-400">
                      JPG, PNG, WebP up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Model & Quantity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* 2. AI Model Selection Card */}
              <div className="bg-white text-black rounded-[32px] p-6 shadow-xl flex flex-col justify-between h-[160px]">
                <div className="text-center">
                  <h3 className="text-[13px] font-bold text-black mb-0.5">AI Model</h3>
                  <p className="text-[10px] text-gray-400 font-medium mb-3">Choose your model</p>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => !isGenerating && setModelType("flux-kontext-dev")}
                    disabled={isGenerating}
                    className={`w-full py-2 px-3 rounded-[12px] text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      modelType === "flux-kontext-dev"
                        ? "border-yellow-400 bg-yellow-50/10 text-black shadow-sm"
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    Basic {modelType === "flux-kontext-dev" && <span className="text-[7px]">🟡</span>}
                  </button>
                  <button
                    onClick={() => !isGenerating && setModelType("flux-kontext-pro")}
                    disabled={isGenerating}
                    className={`w-full py-2 px-3 rounded-[12px] text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      modelType === "flux-kontext-pro"
                        ? "border-yellow-400 bg-yellow-50/10 text-black shadow-sm"
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    Ultra {modelType === "flux-kontext-pro" && <span className="text-[7px]">🟡</span>}
                  </button>
                </div>
              </div>

              {/* 3. Number of Images Card */}
              <div className="bg-white text-black rounded-[32px] p-6 shadow-xl flex flex-col justify-between h-[160px]">
                <div className="text-center">
                  <h3 className="text-[13px] font-bold text-black mb-0.5">Number of Images</h3>
                  <p className="text-[10px] text-gray-400 font-medium mb-3">Choose quantity</p>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => !isGenerating && setImageCount(1)}
                    disabled={isGenerating}
                    className={`w-full py-2 px-3 rounded-[12px] text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      imageCount === 1
                        ? "border-yellow-400 bg-yellow-50/10 text-black shadow-sm"
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    1 Single {imageCount === 1 && <span className="text-[7px]">🟡</span>}
                  </button>
                  <button
                    onClick={() => !isGenerating && setImageCount(4)}
                    disabled={isGenerating}
                    className={`w-full py-2 px-3 rounded-[12px] text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                      imageCount === 4
                        ? "border-yellow-400 bg-yellow-50/10 text-black shadow-sm"
                        : "border-gray-100 text-gray-400 hover:border-gray-200"
                    }`}
                  >
                    4 Multiple {imageCount === 4 && <span className="text-[7px]">🟡</span>}
                  </button>
                </div>
              </div>

            </div>

            {/* 4. Custom Prompt (Optional) Card */}
            <div className="bg-white text-black rounded-[32px] p-8 shadow-xl">
              <h3 className="text-[16px] font-bold text-black mb-3">
                Custom Prompt (Optional)
              </h3>
              <textarea
                className="w-full p-4 bg-white border border-gray-200 rounded-[20px] focus:border-black focus:outline-none text-[13px] leading-relaxed text-black placeholder-gray-400 resize-none h-[110px]"
                placeholder="Add specific details like 'fairy lights', 'minimalist decor', 'traditional mandap'..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isGenerating}
              />
            </div>

          </div>

          {/* Right Column (Preview Card, Theme Selection Card) - spans 7 of 12 */}
          <div className="lg:col-span-7 space-y-6">

            {/* 5. Generated Images Preview Card */}
            {isGenerating ? (
              /* Beautiful active loading state */
              <div className="bg-white text-black rounded-[32px] p-12 shadow-xl flex flex-col items-center justify-center text-center min-h-[380px] animate-pulse">
                <div className="relative mb-6">
                  {/* Glowing spinner */}
                  <div className="w-16 h-16 rounded-full border-4 border-yellow-100 border-t-yellow-400 animate-spin"></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xl">✨</span>
                </div>
                <h3 className="text-[20px] font-bold text-black mb-2">Transforming Your Venue...</h3>
                <p className="text-[13px] text-gray-400 max-w-sm mb-6 font-normal">
                  Our advanced AI model is analyzing structure and rendering your theme decoration concept. This takes 30-60 seconds.
                </p>
                <div className="w-full max-w-xs bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                  <div className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full w-4/5 animate-pulse rounded-full"></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  Deducting {currentCreditCost} credits on success • Balance will be {userCredits - currentCreditCost}
                </p>
              </div>
            ) : generatedImage ? (
              /* Active generated image card */
              <div className="bg-white text-black rounded-[32px] p-6 shadow-xl flex flex-col justify-between min-h-[380px]">
                <div className="relative rounded-[24px] overflow-hidden flex-1 bg-gray-50 flex items-center justify-center min-h-[280px]">
                  <img
                    src={generatedImage.url}
                    alt="AI Transformation Result"
                    className="w-full h-full max-h-[420px] object-cover rounded-[24px]"
                  />
                  {/* Floating badges */}
                  <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md text-white text-[11px] px-4 py-1.5 rounded-full font-bold select-none">
                    After: {themes[generatedImage.theme] || "Custom Theme"}
                  </div>

                  {/* Floating actions */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                      className="bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-bold transition-all"
                      onClick={() => downloadImage(generatedImage.url)}
                    >
                      <span>📥</span> Download
                    </button>
                  </div>
                </div>

                {/* Rating + Info Footer */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-100 pt-4">
                  <div className="text-[11px] text-gray-400 font-semibold">
                    {generatedImage.creditInfo ? (
                      <span>Deducted: {generatedImage.creditInfo.deducted} credits • Balance: {generatedImage.creditInfo.newBalance}</span>
                    ) : (
                      <span>Credits used: {currentCreditCost} credits</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center justify-end">
                    <span className="text-[11px] text-gray-400 font-semibold mr-1">Feedback:</span>
                    <button
                      className="w-8 h-8 rounded-full bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center text-xs transition-all"
                      onClick={() => handleFeedback(generatedImage.id, "positive")}
                      title="Great Result!"
                    >
                      👍
                    </button>
                    <button
                      className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center text-xs transition-all"
                      onClick={() => handleFeedback(generatedImage.id, "negative")}
                      title="Try Again"
                    >
                      👎
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dotted star icon empty state */
              <div className="bg-white text-black rounded-[32px] p-12 shadow-xl flex flex-col items-center justify-center text-center min-h-[380px]">
                <div className="w-16 h-16 flex items-center justify-center text-black mb-4">
                  {/* Stylized star from screenshot */}
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </div>
                <h2 className="text-[20px] font-bold text-black mb-1">
                  Generated Images Will Appear Here
                </h2>
                <p className="text-[13px] text-gray-500 max-w-[340px] font-normal leading-relaxed">
                  Upload an image and configure your settings to start transforming your venue
                </p>
              </div>
            )}

            {/* 6. Wedding Function Selection Card */}
            <div className="bg-white text-black rounded-[32px] p-8 shadow-xl">
              <h3 className="text-[20px] font-bold text-black mb-1">
                Wedding Function Selection
              </h3>
              <p className="text-[13px] text-gray-500 mb-8 font-normal">
                Choose a wedding function theme
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {UI_THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.key;
                  return (
                    <button
                      key={theme.key}
                      onClick={() => !isGenerating && setSelectedTheme(theme.key)}
                      disabled={isGenerating}
                      className={`rounded-[22px] p-4 flex flex-col items-center justify-between text-center transition-all duration-300 border h-[125px] hover:shadow-md hover:-translate-y-0.5 ${
                        isSelected
                          ? "border-yellow-400 bg-yellow-50/10 text-black shadow-sm ring-1 ring-yellow-400"
                          : "border-gray-100 bg-white text-black hover:border-gray-200"
                      }`}
                    >
                      {theme.key === "" ? (
                        <div className="flex-1 flex items-center justify-center font-bold text-xs text-black">
                          Custom Only
                        </div>
                      ) : (
                        <>
                          {/* Theme Specific SVGs */}
                          <div className="flex-1 flex items-center justify-center">
                            {theme.icon === "sun" && (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                              </svg>
                            )}
                            {theme.icon === "hash" && (
                              <span className="text-xl font-bold text-black/75">#</span>
                            )}
                            {theme.icon === "music" && (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                              </svg>
                            )}
                            {theme.icon === "heart" && (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                              </svg>
                            )}
                            {theme.icon === "lock" && (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                            {theme.icon === "star" && (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            )}
                            {theme.icon === "cocktail" && (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M22 22H2M12 22V12m0 0 8-8H4l8 8ZM18 2h-4v2h4V2Z" />
                              </svg>
                            )}
                          </div>
                          <span className="font-bold text-[13px] text-black mb-1.5 select-none">{theme.label}</span>
                          <div className="flex gap-1 items-center justify-center">
                            {theme.dots.map((dotClass, idx) => (
                              <span key={idx} className={`w-2 h-2 rounded-full ${dotClass}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </main>

        {/* 7. Bottom Generate Button Section */}
        <div className="max-w-[1400px] mx-auto mt-10 mb-6">
          <button
            onClick={handleGenerate}
            disabled={!selectedImage || isGenerating || apiStatus === "error" || userCredits < currentCreditCost}
            className={`w-full py-5 rounded-[22px] font-bold text-[17px] tracking-wide transition-all duration-300 shadow-md ${
              !selectedImage || isGenerating || apiStatus === "error" || userCredits < currentCreditCost
                ? "bg-[#c4c4c9] text-[#e0e0e5] cursor-not-allowed shadow-none"
                : "bg-[#8e8e93] text-black hover:bg-black hover:text-white transform hover:-translate-y-0.5"
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></span>
                Generating Transformation...
              </span>
            ) : apiStatus === "error" ? (
              "Backend Connection Unreachable"
            ) : userCredits < currentCreditCost && selectedImage ? (
              `Insufficient Credits (Need ${currentCreditCost} Credits, Balance: ${userCredits})`
            ) : (
              "Generate"
            )}
          </button>

          {/* Credits Alert Bar (Beautiful inline warning) */}
          {userCredits < currentCreditCost && selectedImage && (
            <div className="mt-4 p-4 bg-red-950/20 border border-red-900/30 rounded-[20px] backdrop-blur-md max-w-lg mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-xs text-red-300 font-semibold">
                  Insufficient credits! Need {currentCreditCost - userCredits} more.
                </span>
              </div>
              <button
                onClick={handleBuyCredits}
                className="bg-red-800/80 hover:bg-red-700 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                Buy Credits
              </button>
            </div>
          )}
        </div>

        {/* Previous Transformations Grid */}
        {generationHistory.length > 0 && (
          <section className="max-w-[1400px] mx-auto mt-16 border-t border-white/10 pt-10 mb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📚</span>
                  Previous Concepts
                </h3>
                <p className="text-xs text-gray-400">View and download your previous design concepts</p>
              </div>
              <button
                className="text-xs font-bold px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-300 transition-all flex items-center gap-1"
                onClick={handleClearHistory}
              >
                <span>🗑️</span> Clear History
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {generationHistory.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-[22px] overflow-hidden shadow-lg border border-white/5 bg-white/5 aspect-[4/3] transition-all duration-300 hover:scale-[1.02]"
                >
                  <img
                    src={item.url}
                    alt="Transformation"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <button
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg text-xs font-bold hover:bg-gray-100 transition-all"
                      onClick={() => {
                        setGeneratedImage(item);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      title="Quick View"
                    >
                      👁️
                    </button>
                    <button
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg text-xs font-bold hover:bg-gray-100 transition-all"
                      onClick={() => downloadImage(item.url, `concept-${item.id}.jpg`)}
                      title="Download"
                    >
                      📥
                    </button>
                    <button
                      className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg text-xs font-bold hover:bg-red-600 transition-all"
                      onClick={() => handleDeleteGeneration(item.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[10px] text-gray-300 flex justify-between items-center select-none">
                    <span className="font-bold truncate max-w-[80px]">
                      {themes[item.theme] || "Custom Theme"}
                    </span>
                    <span className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded font-bold">
                      {item.creditsUsed || 10} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Dynamic Premium Footer */}
        <footer className="max-w-[1400px] mx-auto mt-20 pt-8 border-t border-white/5 text-center text-xs text-gray-500 select-none">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="font-medium">
              &copy; {new Date().getFullYear()} The Lovers AI. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#gallery" className="hover:text-white transition-colors">Gallery</a>
              <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default RetexturingTool;

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
  const [imageCount] = useState(1);
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
  };

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
      formData.append("theme", selectedTheme);
      formData.append("customPrompt", customPrompt);
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
            background: "#363636",
            color: "#fff",
            fontSize: "14px",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#4ade80",
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
          loading: {
            duration: 60000,
            style: {
              minWidth: "300px",
            },
          },
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white font-['Poppins'] text-lg">
        {/* Header */}
        <header className="py-8 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 mb-6">
              {/* Logo Section */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                  <span className="text-3xl">💍</span>
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 drop-shadow-lg">
                    Retexturing AI
                  </h1>
                  <p className="text-gray-300 font-medium text-sm md:text-base">
                    Transform Any Image Into Your Dream Wedding Space
                  </p>
                </div>
              </div>

              {/* Credits Display */}
              <div className="flex items-center gap-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-300">
                      Your Credits
                    </h3>
                    <button
                      onClick={fetchUserCredits}
                      disabled={loadingCredits || isGenerating}
                      className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {loadingCredits ? "..." : "🔄"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎫</span>
                      <span className="text-2xl font-bold">
                        {loadingCredits ? "..." : userCredits.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {imageCount} image = {currentCreditCost} credits
                    </div>
                  </div>

                  {/* Credit status indicator */}
                  {selectedImage && (
                    <div
                      className={`text-sm font-medium px-2 py-1 rounded ${
                        creditInfo.hasEnough
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {creditInfo.hasEnough
                        ? "✓ Enough credits for generation"
                        : `✗ Need ${currentCreditCost - userCredits} more credits`}
                    </div>
                  )}

                  {userCredits === 0 && (
                    <button
                      onClick={handleBuyCredits}
                      className="w-full mt-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black py-2 rounded-lg font-semibold hover:from-yellow-600 hover:to-amber-700 transition-all"
                    >
                      🔥 Buy Credits
                    </button>
                  )}
                </div>

                <button
                  onClick={closeAndReset}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all hover:rotate-90"
                  title="Close"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            <p className="text-center text-gray-300 max-w-3xl mx-auto font-medium leading-relaxed">
              Use AI to visualize your venue in different wedding themes
              instantly. From rustic charm to royal elegance.
            </p>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="max-w-7xl mx-auto mb-8 px-4">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 flex items-center justify-center font-bold text-black">
                1
              </div>
              <span className="font-medium text-gray-300">Upload Image</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-600"></div>
            <div className="flex items-center gap-4 opacity-50">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-400">
                2
              </div>
              <span className="font-medium text-gray-400">Choose Theme</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-600"></div>
            <div className="flex items-center gap-4 opacity-50">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-400">
                3
              </div>
              <span className="font-medium text-gray-400">Generate</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Upload Your Venue Image
                  </h2>
                  <p className="text-gray-300">
                    Select a high-quality image for AI transformation
                  </p>
                </div>

                <div
                  className={`border-3 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                    selectedImage
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-gray-600 bg-white/5 hover:border-yellow-400 hover:bg-yellow-500/5"
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
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="Selected venue"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <span className="text-3xl block mb-2">📷</span>
                          <p className="font-medium">Click to change image</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <span className="text-5xl block mb-4 text-gray-400">
                        📷
                      </span>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Drop your venue image here
                      </h3>
                      <p className="text-gray-400 mb-4">
                        or click to browse files
                      </p>
                      <div className="text-sm text-gray-500">
                        Supports: JPG, PNG, WEBP • Max 50MB
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Wedding Function Theme */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">
                    Wedding Function Theme
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(themes).map(([key, label]) => (
                    <button
                      key={key}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedTheme === key
                          ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                          : "border-gray-700 bg-white/5 hover:border-yellow-400 hover:bg-yellow-500/10 text-white"
                      } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => setSelectedTheme(key)}
                      disabled={isGenerating}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">🎨</div>
                        <span className="font-medium text-sm">{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Section */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">
                    Custom Prompt (Optional)
                  </h3>
                </div>

                <textarea
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 transition-all resize-none text-white placeholder-gray-400"
                  placeholder="Add specific details about decorations, colors, or style..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isGenerating}
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Model Selection */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-2">
                    AI Model
                  </h3>
                  <p className="text-gray-300">
                    Choose your AI model for generation
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      modelType === "flux-kontext-pro"
                        ? "border-yellow-500 bg-yellow-500/20"
                        : "border-gray-700 bg-white/5 hover:border-yellow-400 hover:bg-yellow-500/10"
                    } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => setModelType("flux-kontext-pro")}
                    disabled={isGenerating}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">Ultra</div>
                        <div className="text-sm text-gray-300">
                          High quality, slower
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-xs font-bold rounded-full">
                        Premium
                      </span>
                    </div>
                  </button>

                  <button
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      modelType === "flux-kontext-dev"
                        ? "border-yellow-500 bg-yellow-500/20"
                        : "border-gray-700 bg-white/5 hover:border-yellow-400 hover:bg-yellow-500/10"
                    } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => setModelType("flux-kontext-dev")}
                    disabled={isGenerating}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">Basic</div>
                        <div className="text-sm text-gray-300">
                          Balanced quality & speed
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-bold rounded-full">
                        Basic
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Preview Section */}
              {/* Image Retexturing Preview */}
              <div className="w-full px-[6%] mt-32">
                {/* Section Title */}
                <h2
                  className="text-[64px] text-white mb-16 heading-font"
                  style={{ lineHeight: "1.05" }}
                >
                  Image Retexturing →
                </h2>

                {/* Main Container */}
                <div
                  className="w-full rounded-[56px] p-14 md:p-16"
                  style={{ backgroundColor: "#C9AB98" }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* BEFORE IMAGE */}
                    <div className="relative rounded-[32px] overflow-hidden h-[480px] bg-black/10">
                      <div className="absolute top-6 left-6 z-10 bg-black text-white px-6 py-2 rounded-full text-[14px]">
                        Before
                      </div>

                      {selectedImage ? (
                        <img
                          src={URL.createObjectURL(selectedImage)}
                          alt="Original venue"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/70 text-2xl heading-font">
                          Upload Image
                        </div>
                      )}
                    </div>

                    {/* AFTER IMAGE */}
                    <div className="relative rounded-[32px] overflow-hidden h-[480px] bg-black/10">
                      <div className="absolute top-6 left-6 z-10 bg-black text-white px-6 py-2 rounded-full text-[14px]">
                        After
                      </div>

                      {generatedImage ? (
                        <img
                          src={generatedImage.url}
                          alt="AI Generated venue"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/70 text-2xl heading-font">
                          Generated Result
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mb-8">
            <button
              className={`w-full py-5 px-6 rounded-xl font-bold text-xl transition-all duration-300 ${
                !selectedImage || isGenerating || apiStatus === "error"
                  ? "bg-gray-700 cursor-not-allowed text-gray-400"
                  : "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
              }`}
              onClick={handleGenerate}
              disabled={!selectedImage || isGenerating || apiStatus === "error"}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                  <span>Generating... Please wait</span>
                </div>
              ) : apiStatus === "error" ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <span>Backend Connection Failed</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl">✨</span>
                  <span>Generate Transformation</span>
                </div>
              )}
            </button>

            {/* Insufficient Credits Message */}
            {userCredits < currentCreditCost && selectedImage && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400">⚠️</span>
                    <span className="text-red-300">
                      Insufficient credits! Need{" "}
                      {currentCreditCost - userCredits} more.
                    </span>
                  </div>
                  <button
                    onClick={handleBuyCredits}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Buy Credits
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Generated Results
              </h2>
              <p className="text-gray-300">Your AI-transformed venue images</p>
            </div>

            {/* Current Generation */}
            {isGenerating && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-600/10 rounded-xl p-8 text-center mb-6 border border-yellow-500/20">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500/30 border-t-yellow-500 mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Generating your venue transformation...
                </h3>
                <p className="text-gray-300 mb-6">
                  This may take 30-60 seconds. Please don't close this window.
                </p>
                <div className="w-full bg-yellow-500/20 rounded-full h-2 overflow-hidden mb-4">
                  <div className="bg-gradient-to-r from-yellow-500 to-amber-600 h-full w-3/4 animate-pulse"></div>
                </div>
                <div className="text-sm text-gray-400">
                  Using {currentCreditCost} credits. Will have{" "}
                  {userCredits - currentCreditCost} credits remaining.
                </div>
              </div>
            )}

            {/* Generated Image Display */}
            {generatedImage && !isGenerating && (
              <div className="mb-8">
                <div className="relative rounded-xl overflow-hidden mb-6 shadow-2xl">
                  <img
                    src={generatedImage.url}
                    alt="Generated venue"
                    className="w-full h-auto"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-3">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                      Used: {generatedImage.creditsUsed} credits
                    </div>
                    <button
                      className="bg-white hover:bg-gray-100 text-gray-900 px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 font-bold transition-all hover:shadow-xl"
                      onClick={() => downloadImage(generatedImage.url)}
                    >
                      <span className="text-lg">📥</span>
                      Download
                    </button>
                  </div>
                </div>

                {/* Credit Summary */}
                {generatedImage.creditInfo && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-green-400 text-2xl">✅</span>
                        <div>
                          <div className="font-bold text-green-300">
                            Credits deducted successfully
                          </div>
                          <div className="text-sm text-green-400">
                            {generatedImage.creditInfo.deducted} credits used •
                            New balance: {generatedImage.creditInfo.newBalance}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={fetchUserCredits}
                        className="text-sm bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-1 rounded transition-colors"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback Section */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <h4 className="text-lg font-bold text-white mb-4">
                    How do you like this result?
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 font-bold"
                      onClick={() =>
                        handleFeedback(generatedImage.id, "positive")
                      }
                    >
                      <span className="text-xl">👍</span>
                      Great Result!
                    </button>
                    <button
                      className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 font-bold"
                      onClick={() =>
                        handleFeedback(generatedImage.id, "negative")
                      }
                    >
                      <span className="text-xl">👎</span>
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Generation History */}
            {generationHistory.length > 0 && (
              <div className="mt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <span>📚</span>
                    Previous Generations
                  </h3>
                  <div className="flex gap-3">
                    <button
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm font-bold px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                      onClick={checkApiHealth}
                    >
                      <span className="text-base">🔄</span>
                      Refresh
                    </button>
                    <button
                      className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm font-bold px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                      onClick={handleClearHistory}
                    >
                      <span className="text-base">🗑️</span>
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {generationHistory.map((item) => (
                    <div
                      key={item.id}
                      className="relative group rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow"
                    >
                      <img
                        src={item.url}
                        alt="Previous generation"
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex gap-3">
                          <button
                            className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg transition-colors"
                            onClick={() => {
                              setGeneratedImage(item);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title="View details"
                          >
                            👁️
                          </button>
                          <button
                            className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg transition-colors"
                            onClick={() =>
                              downloadImage(item.url, `venue-${item.id}.jpg`)
                            }
                            title="Download"
                          >
                            📥
                          </button>
                          <button
                            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
                            onClick={() => handleDeleteGeneration(item.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                        <div className="flex justify-between">
                          <span className="truncate">
                            {themes[item.theme] || "Custom"}
                          </span>
                          <span className="text-yellow-300">
                            {item.creditsUsed} credits
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!generatedImage &&
              !isGenerating &&
              generationHistory.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-6 text-gray-400">🎨</div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    No generations yet
                  </h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Upload an image and select a theme to start transforming
                    your venue!
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      className="text-gray-400 hover:text-white flex items-center gap-2 font-bold px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() =>
                        toast.info(
                          "1. Upload venue photo\n2. Select theme\n3. Click Generate",
                        )
                      }
                    >
                      <span className="text-lg">💡</span>
                      Quick tips
                    </button>
                    <button
                      className="text-yellow-400 hover:text-yellow-300 flex items-center gap-2 font-bold px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg transition-colors"
                      onClick={checkApiHealth}
                    >
                      <span className="text-lg">🔗</span>
                      Check connection
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Credit System Info */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span>💰</span>
              Credit System Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-500/10 p-5 rounded-xl border border-yellow-500/20">
                <div className="text-yellow-300 font-bold text-lg mb-3">
                  Standard Generation
                </div>
                <div className="text-gray-300 mb-2">10 credits per image</div>
                <div className="text-sm text-gray-400">
                  Basic quality models
                </div>
              </div>
              <div className="bg-amber-500/10 p-5 rounded-xl border border-amber-500/20">
                <div className="text-amber-300 font-bold text-lg mb-3">
                  Premium Generation
                </div>
                <div className="text-gray-300 mb-2">15 credits per image</div>
                <div className="text-sm text-gray-400">
                  Pro/max quality models
                </div>
              </div>
              <div className="bg-purple-500/10 p-5 rounded-xl border border-purple-500/20">
                <div className="text-purple-300 font-bold text-lg mb-3">
                  Credit Packs
                </div>
                <div className="text-gray-300 mb-2">
                  Basic: 1300 credits • Premium: 6500 credits
                </div>
                <div className="text-sm text-gray-400">
                  Buy more from Pricing page
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 py-8 px-4 bg-gradient-to-b from-gray-900/50 to-black/50 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div>
                <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">
                  Connect With Us
                </h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors"
                  >
                    📘
                  </button>
                  <button
                    type="button"
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors"
                  >
                    📷
                  </button>
                  <button
                    type="button"
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors"
                  >
                    🐦
                  </button>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-block border-2 border-white/30 px-6 py-3 rounded-xl bg-black/40 backdrop-blur-sm mb-4">
                  <h2 className="text-2xl font-bold text-white">
                    💍 Retexturing AI
                  </h2>
                </div>
                <p className="text-gray-400 font-bold">
                  &copy; {new Date().getFullYear()} The Lovers AI. All rights
                  reserved.
                </p>
              </div>

              <div className="text-right">
                <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/20">
                  Quick Links
                </h3>
                <div className="flex flex-wrap justify-end gap-4">
                  <a
                    href="#features"
                    className="text-gray-300 hover:text-white font-medium px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Features
                  </a>
                  <a
                    href="#gallery"
                    className="text-gray-300 hover:text-white font-medium px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Gallery
                  </a>
                  <a
                    href="#upload"
                    className="text-gray-300 hover:text-white font-medium px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Try Now
                  </a>
                </div>
                <p className="text-gray-400 mt-4">
                  Transform your wedding dreams into visual reality{" "}
                  <span className="text-red-400">❤️</span>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default RetexturingTool;

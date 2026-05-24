// PlannerAI_tools.jsx
import React, { useState, useEffect } from "react";
import { openLemonCheckout } from "../utils/lemonCheckout";
import RetexturingTool from "./planner/ai_tools/retexturing";
import AngleChangeComponent from "./planner/ai_tools/image_angle";
import ImageToVideo from "./planner/ai_tools/image_to_video";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { paymentAPI } from "../api/api";

const PitchAIPage = ({ navigateTo, onToggleTool }) => {
  const [showAngleChanger, setShowAngleChanger] = useState(false);
  const [showRetexturing, setShowRetexturing] = useState(false);
  const [showImageToVideo, setShowImageToVideo] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Check authentication when tool is clicked
  const handleToolClick = (toolName, openFunction) => {
    if (!currentUser) {
      // Store which tool user wanted to access
      sessionStorage.setItem("redirectAfterLogin", "/planner-ai-tools");
      sessionStorage.setItem("activeTool", toolName);

      // Redirect to login
      navigate("/login", {
        state: {
          from: "/planner-ai-tools",
          tool: toolName,
        },
      });
    } else {
      // User is authenticated, open the tool
      openFunction();
    }
  };

  // Check for tool to open after login
  useEffect(() => {
    if (currentUser) {
      const toolToOpen = sessionStorage.getItem("activeTool");
      const redirectPath = sessionStorage.getItem("redirectAfterLogin");

      if (toolToOpen && redirectPath === "/planner-ai-tools") {
        // Clear storage
        sessionStorage.removeItem("activeTool");
        sessionStorage.removeItem("redirectAfterLogin");

        // Open the specific tool
        if (toolToOpen === "retexturing") {
          setShowRetexturing(true);
        } else if (toolToOpen === "angle-changer") {
          setShowAngleChanger(true);
        } else if (toolToOpen === "image-to-video") {
          setShowImageToVideo(true);
        }
        // You can add more tools here as needed
      }
    }
  }, [currentUser]);

  // Scroll to top when tools are opened/closed to prevent scroll issues
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [showRetexturing, showAngleChanger, showImageToVideo]);

  // Notify parent component about active tool status to hide footer
  useEffect(() => {
    if (onToggleTool) {
      onToggleTool(showRetexturing || showAngleChanger || showImageToVideo);
    }
  }, [showRetexturing, showAngleChanger, showImageToVideo, onToggleTool]);

  const handlePurchase = async (plan) => {
    console.log("🚀 handlePurchase called for plan:", plan);

    // Check if user is authenticated
    if (!currentUser) {
      console.log("❌ User not authenticated, redirecting to login");

      // Store the current page to redirect back after login
      sessionStorage.setItem("redirectAfterLogin", "/planner-ai-tools");

      // Show a message to the user
      if (
        window.confirm(
          "You need to login to purchase a plan. Redirect to login page?",
        )
      ) {
        navigate("/login", { state: { from: "/planner-ai-tools" } });
      }
      return;
    }

    // If user is authenticated, proceed with purchase
    try {
      console.log("✅ User authenticated, getting email...");

      // Get user email
      let userEmail = "";

      if (currentUser.email) {
        userEmail = currentUser.email;
      } else if (currentUser.user?.email) {
        userEmail = currentUser.user.email;
      } else if (currentUser.profile?.email) {
        userEmail = currentUser.profile.email;
      }

      console.log("📧 User email found:", userEmail);

      if (!userEmail || !isValidEmail(userEmail)) {
        console.error("❌ Invalid or missing email");
        alert(
          "Please complete your profile with a valid email address before purchasing",
        );
        navigate("/profile");
        return;
      }

      try {
        const data = await paymentAPI.createCheckout(plan);

        if (data.success && data.checkoutUrl) {
          console.log("✅ Checkout URL received:", data.checkoutUrl);
          window.location.href = data.checkoutUrl;
        } else {
          console.error("❌ Failed to create checkout:", data);
          alert("Failed to initiate checkout. Please try again.");
        }
      } catch (error) {
        console.error("❌ Error creating checkout:", error);
        console.log("🔄 Using direct Lemon checkout as fallback");
        openLemonCheckout(plan, userEmail);
      }
    } catch (error) {
      console.error("❌ Error in handlePurchase:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const isToolActive = showRetexturing || showAngleChanger || showImageToVideo;

  return (
    <>
      {/* Solid Black Header Bar for Active Tools to prevent scrolling overlap */}
      {isToolActive && (
        <div 
          className="fixed top-0 left-0 right-0 h-[95px] md:h-[148px] bg-black transition-all duration-300 pointer-events-none border-b border-white/5 shadow-2xl"
          style={{ zIndex: 40 }}
        ></div>
      )}

      {/* Hero Section */}
      {!showRetexturing && !showAngleChanger && !showImageToVideo && (
        <div className="relative w-screen h-screen flex items-center justify-center text-white overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ 
              backgroundImage: `url("./images/bridal.png")`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          ></div>
          <div className="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
        </div>
      )}

      {/* Image Retexturing Section */}
      {!showAngleChanger && !showImageToVideo && (
        <div
          id="ai-tools-section"
          className={`bg-black px-4 transition-all duration-300 ${
            showRetexturing ? "pt-32 pb-10 md:pt-[175px] md:pb-16" : "py-20"
          }`}
        >
          <div
            className={`w-full transition-all duration-300 ${
              showRetexturing ? "max-w-[1550px] mx-auto px-4 md:px-8" : "px-[6%] md:px-[10%]"
            }`}
          >
            {!showRetexturing && (
              <h2
                onClick={() =>
                  handleToolClick("retexturing", () =>
                    setShowRetexturing(!showRetexturing),
                  )
                }
                className="text-5xl font-light text-white mb-12 heading-font text-left cursor-pointer hover:text-rose-300 transition"
              >
                Image Retexturing →
              </h2>
            )}

            {/* BEFORE CLICK — show preview */}
            {!showRetexturing && (
              <div
                className="glass-card rounded-[40px] md:rounded-[56px] p-8 md:p-16 border border-white/10 hover:border-loverai-gold/40 hover:shadow-[0_0_50px_rgba(230,198,178,0.1)] transition-all duration-300 group cursor-pointer"
                onClick={() =>
                  handleToolClick("retexturing", () => setShowRetexturing(true))
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
                  <div className="relative rounded-[32px] overflow-hidden aspect-[4/3.4]">
                    <div className="absolute top-6 left-6 bg-black/60 border border-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-medium z-10">
                      Before
                    </div>
                    <img
                      src="./images/blue.jpg"
                      className="w-full h-full object-cover"
                      alt="Blue themed venue"
                    />
                  </div>
                  <div className="relative rounded-[32px] overflow-hidden aspect-[4/3.4]">
                    <div className="absolute top-6 left-6 bg-black/60 border border-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-medium z-10">
                      After
                    </div>
                    <img
                      src="./images/golden.png"
                      className="w-full h-full object-cover"
                      alt="Golden themed venue"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AFTER CLICK — show retexturing app directly */}
            {showRetexturing && (
              <RetexturingTool onClose={() => setShowRetexturing(false)} />
            )}
          </div>
        </div>
      )}

      {/* Image Angle Section */}
      {!showRetexturing && !showImageToVideo && (
        <div
          className={`bg-black px-4 transition-all duration-300 ${
            showAngleChanger ? "pt-32 pb-10 md:pt-[175px] md:pb-16" : "py-20"
          }`}
        >
          <div
            className={`w-full transition-all duration-300 ${
              showAngleChanger
                ? "max-w-[1550px] mx-auto px-4 md:px-8"
                : "px-[6%] md:px-[10%] mt-16"
            }`}
          >
            {!showAngleChanger && (
              <h2
                onClick={() =>
                  handleToolClick("angle-changer", () =>
                    setShowAngleChanger(!showAngleChanger),
                  )
                }
                className="text-[64px] text-white mb-16 heading-font text-left cursor-pointer hover:text-rose-300 transition"
              >
                Image Angle →
              </h2>
            )}

            {/* BEFORE CLICK — preview */}
            {!showAngleChanger && (
              <div
                className="w-full rounded-[40px] md:rounded-[56px] p-8 md:p-16 glass-card border border-white/10 hover:border-loverai-gold/40 hover:shadow-[0_0_50px_rgba(230,198,178,0.1)] transition-all duration-300 group cursor-pointer"
                onClick={() =>
                  handleToolClick("angle-changer", () =>
                    setShowAngleChanger(true),
                  )
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  <div className="md:col-span-8 rounded-[32px] overflow-hidden h-[440px] md:h-[520px]">
                    <img
                      src="./images/Picture1.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 1"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[380px] md:h-[520px]">
                    <img
                      src="./images/Picture2.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 2"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[320px] md:h-[360px]">
                    <img
                      src="./images/Picture3.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 3"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[320px] md:h-[360px]">
                    <img
                      src="./images/Picture4.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 4"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[380px] md:h-[360px]">
                    <img
                      src="./images/Picture5.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AFTER CLICK — open tool INLINE */}
            {showAngleChanger && (
              <AngleChangeComponent onClose={() => setShowAngleChanger(false)} />
            )}
          </div>
        </div>
      )}

      {/* Image to Video Section */}
      {!showRetexturing && !showAngleChanger && !showImageToVideo && (
        <>
          <div className="bg-black py-20 px-4">
            <div className="w-full px-[6%] md:px-[10%] mt-16 transition-all duration-300">
              <h2
                onClick={() =>
                  handleToolClick("image-to-video", () =>
                    setShowImageToVideo(true)
                  )
                }
                className="text-[64px] text-white mb-16 heading-font text-left cursor-pointer hover:text-rose-300 transition"
              >
                Image to Video →
              </h2>
              <div
                className="w-full rounded-[40px] md:rounded-[56px] p-8 md:p-16 glass-card border border-white/10 hover:border-loverai-gold/40 hover:shadow-[0_0_50px_rgba(230,198,178,0.1)] transition-all duration-300 group cursor-pointer"
                onClick={() =>
                  handleToolClick("image-to-video", () =>
                    setShowImageToVideo(true)
                  )
                }
              >
                <div className="grid md:grid-cols-2 gap-14">
                  <div className="relative">
                    <div className="absolute top-6 left-6 bg-black/60 border border-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-medium z-10">
                      Before
                    </div>
                    <div className="rounded-[32px] overflow-hidden aspect-[4/3.4]">
                      <img
                        src="./images/mandap-image.png"
                        alt="Video before"
                        className="w-full h-full object-cover rounded-[32px]"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute top-6 left-6 bg-black/60 border border-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-medium z-10">
                      After
                    </div>
                    <div className="rounded-[32px] overflow-hidden aspect-[4/3.4]">
                      <video
                        className="w-full h-full object-cover rounded-[32px]"
                        autoPlay
                        loop
                        muted
                        playsInline
                      >
                        <source src="./images/mandap.mp4" type="video/mp4" />
                        <img
                          src="./images/c48fba3dc19716b5860fa1b6d771fc6fd42b3f01.png"
                          alt="Video after"
                          className="w-full h-[480px] object-cover rounded-[32px]"
                        />
                      </video>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Plans Section */}
          <div id="subscriptions-section" className="bg-black py-20 px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-[64px] text-white text-center mb-8 heading-font">
                Choose Your Creative Plan
              </h2>
              <p className="text-gray-400 text-center max-w-3xl mx-auto mb-20">
                Unlock the full potential of AI-powered content creation with plans
                designed for every creator.
              </p>

              {/* Pricing cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
                {/* Free Plan */}
                <div className="glass-card border border-white/10 p-10 rounded-[32px] hover:border-loverai-gold/30 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full">
                  <h3 className="text-xl font-bold text-white mb-2">Free Plan</h3>
                  <div className="text-[36px] font-semibold text-loverai-gold mb-1 font-heading">
                    ₹ 0
                  </div>
                  <div className="text-sm text-white/50 mb-6">/month</div>
                  <p className="text-sm text-white/70 mb-6">
                    Perfect for getting started with AI creativity.
                  </p>

                  <ul className="space-y-4 text-[16px] text-white/90 mt-6 mb-8 flex-grow">
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Retexturizing
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image
                      upscaling
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image views
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Standard
                      quality output
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Community
                      support
                    </li>
                  </ul>
                </div>

                {/* Basic Plan */}
                <div className="glass-card border border-white/10 p-10 rounded-[32px] hover:border-loverai-gold/30 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full">
                  <h3 className="text-xl font-bold text-white mb-2">Basic Plan</h3>
                  <div className="text-[36px] font-semibold text-loverai-gold mb-1 font-heading">
                    ₹ 4,349
                  </div>
                  <div className="text-sm text-white/50 mb-6">/month</div>
                  <p className="text-sm text-white/70 mb-6">
                    Great for individual creators and small projects.
                  </p>

                  <ul className="space-y-4 text-[16px] text-white/90 mt-6 mb-8 flex-grow">
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span>{" "}
                      RetexturCredits per month: 1,300/img
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Number of
                      images: 130
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Storage: 5GB
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Retexturing
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image views
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image to video
                      Conversion
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Generative
                      image and video editing
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> High quality
                      output
                    </li>
                  </ul>

                  <button
                    onClick={() => handlePurchase("basic")}
                    className="w-full mt-10 py-3.5 rounded-full text-sm font-semibold uppercase tracking-wide transition-all duration-300 loverai-btn-primary"
                  >
                    {currentUser ? "Buy Now" : "Login to Purchase"}
                  </button>
                </div>

                {/* Premium Plan */}
                <div className="glass-card border border-[#e6c6b2]/30 shadow-[0_0_30px_rgba(230,198,178,0.1)] p-10 rounded-[32px] hover:border-loverai-gold/50 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-loverai-gold to-amber-700 text-loverai-dark text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Most Popular</div>
                  <h3 className="text-xl font-bold text-white mb-2">Premium Plan</h3>
                  <div className="text-[36px] font-semibold text-loverai-gold mb-1 font-heading">
                    ₹ 9,349
                  </div>
                  <div className="text-sm text-white/50 mb-6">/month</div>
                  <p className="text-sm text-white/70 mb-6">
                    Unlock full creative potential and advanced tools.
                  </p>

                  <ul className="space-y-4 text-[16px] text-white/90 mt-6 mb-8 flex-grow">
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Credits per
                      month: 6,500
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Number of
                      images: 650
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Storage: 15GB
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Retexturing
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image views
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image to video
                      Conversion
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Generative
                      image and video editing
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> 4D quality
                      output
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Priority email
                      support
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Community
                      support
                    </li>
                  </ul>

                  <button
                    onClick={() => handlePurchase("premium")}
                    className="w-full mt-10 py-3.5 rounded-full text-sm font-semibold uppercase tracking-wide transition-all duration-300 loverai-btn-primary"
                  >
                    {currentUser ? "Buy Now" : "Login to Purchase"}
                  </button>
                </div>

                {/* Enterprise */}
                <div className="glass-card border border-white/10 p-10 rounded-[32px] hover:border-loverai-gold/30 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full">
                  <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                  <div className="text-[36px] font-semibold text-loverai-gold mb-1 font-heading">
                    Customisable
                  </div>
                  <div className="text-sm text-white/50 mb-6"></div>
                  <p className="text-sm text-white/70 mb-6">
                    Unlock full creative potential and advanced tools.
                  </p>

                  <ul className="space-y-4 text-[16px] text-white/90 mt-6 mb-8 flex-grow">
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Unlimited
                      conversions
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Unlimited
                      quality output
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Retexturing
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image views
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Image to video
                      Conversion
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Advanced
                      security features
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Priority
                      support
                    </li>
                    <li className="flex items-center">
                      <span className="text-loverai-gold mr-3">✓</span> Generative
                      image and video editing
                    </li>
                  </ul>

                  <button
                    onClick={() => setShowContactPopup(true)}
                    className="w-full mt-10 py-3.5 rounded-full text-sm font-semibold uppercase tracking-wide transition-all duration-300 loverai-btn-primary"
                  >
                    Contact Us
                  </button>
                </div>
              </div>

              {/* Rest of the component remains the same... */}
              {showContactPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]">
                  <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">
                      Contact Us
                    </h2>

                    <p className="text-gray-700 mb-2">
                      📧 Email:{" "}
                      <a
                        href="mailto:aanssha@theloversai.co.in"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        aanssha@theloversai.co.in
                      </a>
                    </p>

                    <p className="text-gray-700 mb-2">
                      📞 Phone: +91 9821640951 | +91 9266355235
                    </p>

                    {/* WhatsApp */}
                    <p className="text-gray-700 mb-6">
                      💬 WhatsApp:{" "}
                      <a
                        href="https://wa.me/919266355235"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-600 underline hover:text-green-800"
                      >
                        Chat with us
                      </a>
                    </p>

                    <p className="text-gray-700 mb-6">
                      📍 Address: G-29, RG Trade Tower, NSP, Pitampura, Delhi
                    </p>

                    <button
                      onClick={() => setShowContactPopup(false)}
                      className="mt-4 bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Top-Up Pricing Section */}
              <div className="w-full px-[6%] md:px-[10%] flex justify-center mb-20 transition-all duration-300">
                <div className="w-full max-w-[1200px]">
                  <h2 className="text-[56px] text-white text-center mb-16 heading-font">
                    Top-Up Pricing
                  </h2>
                  <div className="w-full max-w-[1200px] glass-card rounded-[40px] md:rounded-[48px] p-8 md:p-16 border border-white/10">
                    <div className="grid grid-cols-3 text-center">
                      <div className="text-[16px] md:text-[18px] font-semibold text-white pb-6 border-b border-white/10">
                        Current Plan
                      </div>
                      <div className="text-[16px] md:text-[18px] font-semibold text-white pb-6 border-b border-white/10">
                        Number of Credits
                      </div>
                      <div className="text-[16px] md:text-[18px] font-semibold text-white pb-6 border-b border-white/10">
                        Price per Credit
                      </div>
                    </div>
                    <div>
                      <div className="grid grid-cols-3 text-center py-8 border-b border-white/5 text-white/80 text-[15px] md:text-[18px]">
                        <div>Free</div>
                        <div>10</div>
                        <div className="text-loverai-gold font-medium">₹17.00</div>
                      </div>
                      <div className="grid grid-cols-3 text-center py-8 border-b border-white/5 text-white/80 text-[15px] md:text-[18px]">
                        <div>Basic</div>
                        <div>10</div>
                        <div className="text-loverai-gold font-medium">₹13.60</div>
                      </div>
                      <div className="grid grid-cols-3 text-center py-8 text-white/80 text-[15px] md:text-[18px]">
                        <div>Premium</div>
                        <div>10</div>
                        <div className="text-loverai-gold font-medium">₹8.50</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Comparison Table */}
              <div className="w-full px-[6%] md:px-[10%] mt-32 transition-all duration-300">
                <div className="w-full border border-gray-600 rounded-[8px] overflow-hidden">
                  <div className="grid grid-cols-5">
                    {/* Header row */}
                    <div className="bg-black text-white text-[18px] font-medium p-6">
                      Features
                    </div>
                    <div className="bg-black text-white text-[18px] font-medium p-6 text-center">
                      Free
                    </div>
                    <div className="bg-black text-white text-[18px] font-medium p-6 text-center">
                      Basic
                    </div>
                    <div className="bg-black text-white text-[18px] font-medium p-6 text-center">
                      Premium
                    </div>
                    <div className="bg-black text-white text-[18px] font-medium p-6 text-center">
                      Enterprise
                    </div>

                    {/* Feature rows */}
                    {[
                      ["Image Retexturing", "✔️", "✔️", "✔️", "✔️"],
                      ["Image Views", "✔️", "✔️", "✔️", "✔️"],
                      ["Image to Video Conversions", "—", "✔️", "✔️", "✔️"],
                      ["Generative Image and video Editing", "—", "✔️", "✔️", "✔️"],
                      ["Standard Quality Output", "✔️", "—", "—", "—"],
                      ["High Quality Output", "—", "✔️", "—", "—"],
                      ["HD Quality Output", "—", "—", "✔️", "✔️"],
                      ["Community Support", "✔️", "✔️", "✔️", "—"],
                      ["Priority Email Support", "—", "—", "✔️", "✔️"],
                      ["Custom AI Models", "—", "—", "—", "✔️"],
                    ].map((row, index) => (
                      <React.Fragment key={index}>
                        <div className="border-t border-gray-700 text-white text-[16px] p-6">
                          {row[0]}
                        </div>
                        {row.slice(1).map((cell, cellIndex) => (
                          <div
                            key={cellIndex}
                            className="border-t border-gray-700 text-white text-[16px] p-6 text-center"
                          >
                            {cell === "✔️" ? (
                              <span className="text-green-500 text-[22px]">✔</span>
                            ) : (
                              <span className="text-orange-500 text-[20px]">—</span>
                            )}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Active Image to Video Tool Inline */}
      {showImageToVideo && (
        <div className="bg-black px-4 pt-32 pb-10 md:pt-[175px] md:pb-16 transition-all duration-300">
          <div className="w-full max-w-[1550px] mx-auto px-4 md:px-8 transition-all duration-300">
            <ImageToVideo onClose={() => setShowImageToVideo(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default PitchAIPage;

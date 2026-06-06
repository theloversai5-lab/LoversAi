// PlannerAI_tools.jsx
import React, { useState, useEffect } from "react";
import { openLemonCheckout } from "../utils/lemonCheckout";
import RetexturingTool from "./planner/ai_tools/retexturing";
import AngleChangeComponent from "./planner/ai_tools/image_angle";
import ImageToVideo from "./planner/ai_tools/image_to_video";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { paymentAPI } from "../api/api";
import PlannerQuickMenu from "../components/PlannerQuickMenu";

const SafePlannerQuickMenu =
  typeof PlannerQuickMenu === "function" ? PlannerQuickMenu : () => null;
const SafeRetexturingTool =
  typeof RetexturingTool === "function" ? RetexturingTool : () => null;
const SafeAngleChangeComponent =
  typeof AngleChangeComponent === "function"
    ? AngleChangeComponent
    : () => null;
const SafeImageToVideo =
  typeof ImageToVideo === "function" ? ImageToVideo : () => null;

const RUPEE = "\u20B9";

const pricingPlans = [
  {
    name: "Free Plan",
    price: "0",
    description: "Perfect for getting started with AI creativity.",
    features: [
      "Retexturizing",
      "Image upscaling",
      "Image views",
      "Standard quality output",
      "Community support",
    ],
  },
  {
    name: "Basic Plan",
    key: "basic",
    price: "4,349",
    description: "Great for individual creators and small projects.",
    features: [
      "Credits per month: 1,300",
      "Number of images: 130",
      "Storage: 5GB",
      "Retexturing",
      "Image views",
      "Image to video conversion",
      "Generative image and video editing",
      "High quality output",
    ],
  },
  {
    name: "Premium Plan",
    key: "premium",
    price: "9,349",
    description: "Unlock full creative potential and advanced tools.",
    features: [
      "Credits per month: 6,500",
      "Number of images: 650",
      "Storage: 15GB",
      "Retexturing",
      "Image views",
      "Image to video conversion",
      "Generative image and video editing",
      "4D quality output",
      "Priority email support",
      "Community support",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Customisable",
    description: "Unlock full creative potential and advanced tools.",
    features: [
      "Unlimited conversions",
      "Unlimited quality output",
      "Retexturing",
      "Image views",
      "Image to video conversion",
      "Advanced security features",
      "Priority support",
      "Generative image and video editing",
    ],
    cta: "Contact Us",
  },
];

const topUpPricing = [
  { plan: "Free", credits: "10", pricePerCredit: "17.00" },
  { plan: "Basic", credits: "10", pricePerCredit: "13.60" },
  { plan: "Premium", credits: "10", pricePerCredit: "8.50" },
];

const featureComparisonRows = [
  { label: "Image Retexturing", plans: [true, true, true, true] },
  { label: "Image Views", plans: [true, true, true, true] },
  { label: "Image to Video Conversions", plans: [false, true, true, true] },
  {
    label: "Generative Image and Video Editing",
    plans: [false, true, true, true],
  },
  { label: "Standard Quality Output", plans: [true, false, false, false] },
  { label: "High Quality Output", plans: [false, true, false, false] },
  { label: "HD Quality Output", plans: [false, false, true, true] },
  { label: "Community Support", plans: [true, true, true, false] },
  { label: "Priority Email Support", plans: [false, false, true, true] },
  { label: "Custom AI Models", plans: [false, false, false, true] },
];

function StatusIcon({ enabled }) {
  if (enabled) {
    return (
      <span
        aria-label="Included"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
    );
  }

  return (
    <span
      aria-label="Not included"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/12 text-orange-400"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M4 8h8" />
      </svg>
    </span>
  );
}

function PriceValue({ value }) {
  const isNumericPrice = /^\d[\d,]*([.]\d+)?$/.test(value);

  if (!isNumericPrice) {
    return (
      <div className="mb-1 text-[36px] font-semibold tracking-tight text-loverai-gold font-heading">
        {value}
      </div>
    );
  }

  return (
    <div className="mb-1 flex items-baseline gap-2 text-loverai-gold font-heading">
      <span className="text-[28px] font-semibold">{RUPEE}</span>
      <span className="text-[36px] font-semibold tracking-tight tabular-nums">
        {value}
      </span>
    </div>
  );
}

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
    console.log("ðŸš€ handlePurchase called for plan:", plan);

    // Check if user is authenticated
    if (!currentUser) {
      console.log("âŒ User not authenticated, redirecting to login");

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
      console.log("âœ… User authenticated, getting email...");

      // Get user email
      let userEmail = "";

      if (currentUser.email) {
        userEmail = currentUser.email;
      } else if (currentUser.user?.email) {
        userEmail = currentUser.user.email;
      } else if (currentUser.profile?.email) {
        userEmail = currentUser.profile.email;
      }

      console.log("ðŸ“§ User email found:", userEmail);

      if (!userEmail || !isValidEmail(userEmail)) {
        console.error("âŒ Invalid or missing email");
        alert(
          "Please complete your profile with a valid email address before purchasing",
        );
        navigate("/profile");
        return;
      }

      try {
        const data = await paymentAPI.createCheckout(plan);

        if (data.success && data.checkoutUrl) {
          console.log("âœ… Checkout URL received:", data.checkoutUrl);
          window.location.href = data.checkoutUrl;
        } else {
          console.error("âŒ Failed to create checkout:", data);
          alert("Failed to initiate checkout. Please try again.");
        }
      } catch (error) {
        console.error("âŒ Error creating checkout:", error);
        console.log("ðŸ”„ Using direct Lemon checkout as fallback");
        openLemonCheckout(plan, userEmail);
      }
    } catch (error) {
      console.error("âŒ Error in handlePurchase:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <>
      {!showImageToVideo && (
        <>
          <div className="fixed left-4 top-4 z-30 sm:left-6 sm:top-6 lg:left-8 lg:top-8">
            <button
              type="button"
              onClick={() => navigate("/planner")}
              aria-label="Lovers AI home"
              className="transition hover:opacity-90"
            >
              <img
                src="/images/LogoLoversai.png"
                alt="Lovers AI"
                className="h-20 w-auto object-contain sm:h-24"
              />
            </button>
          </div>

          <SafePlannerQuickMenu className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6 lg:right-8 lg:top-8" />
        </>
      )}

      {/* Hero Section */}
      {!showRetexturing && !showAngleChanger && !showImageToVideo && (
        <div className="relative w-full min-h-[100svh] flex items-center justify-center text-white overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{
              backgroundImage: `url("./images/bridal.png")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
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
            showRetexturing ? "pt-16 pb-4 md:pt-20 md:pb-6" : "py-20"
          }`}
        >
          <div
            className={`w-full transition-all duration-300 ${
              showRetexturing
                ? "max-w-[1550px] mx-auto px-2 md:px-4"
                : "px-4 sm:px-[6%] md:px-[10%]"
            }`}
          >
            {!showRetexturing && (
              <h2
                onClick={() =>
                  handleToolClick("retexturing", () =>
                    setShowRetexturing(!showRetexturing),
                  )
                }
                className="text-[clamp(2.1rem,5vw,4rem)] font-light text-white mb-12 heading-font text-left cursor-pointer hover:text-rose-300 transition"
              >
                Image Retexturing ->
              </h2>
            )}

            {/* BEFORE CLICK â€” show preview */}
            {!showRetexturing && (
              <div
                className="glass-card rounded-[40px] md:rounded-[56px] p-8 md:p-16 border border-white/10 hover:border-loverai-gold/40 hover:shadow-[0_0_50px_rgba(230,198,178,0.1)] transition-all duration-300 group cursor-pointer"
                onClick={() =>
                  handleToolClick("retexturing", () => setShowRetexturing(true))
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-14">
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

            {/* AFTER CLICK â€” show retexturing app directly */}
            {showRetexturing && (
              <SafeRetexturingTool onClose={() => setShowRetexturing(false)} />
            )}
          </div>
        </div>
      )}

      {/* Image Angle Section */}
      {!showRetexturing && !showImageToVideo && (
        <div
          className={`bg-black px-4 transition-all duration-300 ${
            showAngleChanger ? "pt-16 pb-4 md:pt-20 md:pb-6" : "py-20"
          }`}
        >
          <div
            className={`w-full transition-all duration-300 ${
              showAngleChanger
                ? "max-w-[1550px] mx-auto px-2 md:px-4"
                : "px-4 sm:px-[6%] md:px-[10%] mt-16"
            }`}
          >
            {!showAngleChanger && (
              <h2
                onClick={() =>
                  handleToolClick("angle-changer", () =>
                    setShowAngleChanger(!showAngleChanger),
                  )
                }
                className="text-[clamp(2.1rem,5vw,4rem)] text-white mb-16 heading-font text-left cursor-pointer hover:text-rose-300 transition"
              >
                Image Angle ->
              </h2>
            )}

            {/* BEFORE CLICK â€” preview */}
            {!showAngleChanger && (
              <div
                className="w-full rounded-[40px] md:rounded-[56px] p-8 md:p-16 glass-card border border-white/10 hover:border-loverai-gold/40 hover:shadow-[0_0_50px_rgba(230,198,178,0.1)] transition-all duration-300 group cursor-pointer"
                onClick={() =>
                  handleToolClick("angle-changer", () =>
                    setShowAngleChanger(true),
                  )
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10">
                  <div className="md:col-span-8 rounded-[32px] overflow-hidden h-[260px] sm:h-[340px] md:h-[520px]">
                    <img
                      src="./images/Picture1.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 1"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[300px] md:h-[520px]">
                    <img
                      src="./images/Picture2.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 2"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[260px] md:h-[360px]">
                    <img
                      src="./images/Picture3.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 3"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[260px] md:h-[360px]">
                    <img
                      src="./images/Picture4.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 4"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[300px] md:h-[360px]">
                    <img
                      src="./images/Picture5.png"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AFTER CLICK â€” open tool INLINE */}
            {showAngleChanger && (
              <SafeAngleChangeComponent
                onClose={() => setShowAngleChanger(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Image to Video Section */}
      {!showRetexturing && !showAngleChanger && !showImageToVideo && (
        <>
          <div className="bg-black py-20 px-4">
            <div className="w-full px-4 sm:px-[6%] md:px-[10%] mt-16 transition-all duration-300">
              <h2
                onClick={() =>
                  handleToolClick("image-to-video", () =>
                    setShowImageToVideo(true)
                  )
                }
                className="text-[clamp(2.1rem,5vw,4rem)] text-white mb-16 heading-font text-left cursor-pointer hover:text-rose-300 transition"
              >
                Image to Video ->
              </h2>
              <div
                className="w-full rounded-[40px] md:rounded-[56px] p-8 md:p-16 glass-card border border-white/10 hover:border-loverai-gold/40 hover:shadow-[0_0_50px_rgba(230,198,178,0.1)] transition-all duration-300 group cursor-pointer"
                onClick={() =>
                  handleToolClick("image-to-video", () =>
                    setShowImageToVideo(true)
                  )
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-14">
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
              <h2 className="text-[clamp(2.1rem,5vw,4rem)] text-white text-center mb-8 heading-font">
                Choose Your Creative Plan
              </h2>
              <p className="text-gray-400 text-center max-w-3xl mx-auto mb-20">
                Unlock the full potential of AI-powered content creation with
                plans designed for every creator.
              </p>

              {/* Pricing cards */}
              <div className="grid gap-6 mb-16 md:grid-cols-2 lg:grid-cols-4">
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`glass-card relative flex h-full flex-col justify-between rounded-[32px] border p-10 transition-all duration-300 hover:scale-[1.02] ${
                      plan.featured
                        ? "border-[#e6c6b2]/30 shadow-[0_0_30px_rgba(230,198,178,0.1)] hover:border-loverai-gold/50"
                        : "border-white/10 hover:border-loverai-gold/30"
                    }`}
                  >
                    {plan.featured && (
                      <div className="absolute top-0 right-0 rounded-bl-lg bg-gradient-to-r from-loverai-gold to-amber-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-loverai-dark">
                        Most Popular
                      </div>
                    )}
                    <h3 className="mb-2 text-xl font-bold text-white">
                      {plan.name}
                    </h3>
                    <PriceValue value={plan.price} />
                    <div className="mb-6 text-sm text-white/50">
                      {plan.key ? "/month" : plan.price === "0" ? "/month" : ""}
                    </div>
                    <p className="mb-6 text-sm text-white/70">
                      {plan.description}
                    </p>
                    <ul className="mt-6 mb-8 flex-grow space-y-4 text-[16px] text-white/90">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <StatusIcon enabled />
                          <span className="leading-6">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.key ? (
                      <button
                        onClick={() => handlePurchase(plan.key)}
                        className="loverai-btn-primary mt-10 w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-wide transition-all duration-300"
                      >
                        {currentUser ? "Buy Now" : "Login to Purchase"}
                      </button>
                    ) : plan.cta ? (
                      <button
                        onClick={() => setShowContactPopup(true)}
                        className="loverai-btn-primary mt-10 w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-wide transition-all duration-300"
                      >
                        {plan.cta}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {/* Rest of the component remains the same... */}
              {showContactPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]">
                  <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">
                      Contact Us
                    </h2>

                    <p className="text-gray-700 mb-2">
                      ðŸ“§ Email:{" "}
                      <a
                        href="mailto:aanssha@theloversai.co.in"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        aanssha@theloversai.co.in
                      </a>
                    </p>

                    <p className="text-gray-700 mb-2">
                      ðŸ“ž Phone: +91 9821640951 | +91 9266355235
                    </p>

                    {/* WhatsApp */}
                    <p className="text-gray-700 mb-6">
                      ðŸ’¬ WhatsApp:{" "}
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
                      ðŸ“ Address: G-29, RG Trade Tower, NSP, Pitampura, Delhi
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
              <div className="w-full px-4 sm:px-[6%] md:px-[10%] flex justify-center mb-20 transition-all duration-300">
                <div className="w-full max-w-[1200px]">
                  <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] text-white text-center mb-16 heading-font">
                    Top-Up Pricing
                  </h2>
                  <div className="w-full max-w-[1200px] glass-card rounded-[40px] md:rounded-[48px] p-8 md:p-16 border border-white/10">
                    <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-0">
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
                      {topUpPricing.map((row, index) => (
                        <div
                          key={row.plan}
                          className={`grid grid-cols-1 gap-2 py-6 text-center text-[15px] text-white/80 sm:grid-cols-3 sm:gap-0 sm:py-8 md:text-[18px] ${
                            index < topUpPricing.length - 1
                              ? "border-b border-white/5"
                              : ""
                          }`}
                        >
                          <div>{row.plan}</div>
                          <div className="tabular-nums">{row.credits}</div>
                          <div className="font-medium text-loverai-gold tabular-nums">
                            {RUPEE}
                            {row.pricePerCredit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Features Comparison Table */}
              <div className="w-full px-4 sm:px-[6%] md:px-[10%] mt-32 transition-all duration-300">
                <div className="w-full overflow-x-auto rounded-[8px] border border-gray-600">
                  <div className="grid min-w-[760px] grid-cols-5">
                    <div className="bg-black p-4 md:p-6 text-[16px] md:text-[18px] font-medium text-white">
                      Features
                    </div>
                    <div className="bg-black p-4 md:p-6 text-center text-[16px] md:text-[18px] font-medium text-white">
                      Free
                    </div>
                    <div className="bg-black p-4 md:p-6 text-center text-[16px] md:text-[18px] font-medium text-white">
                      Basic
                    </div>
                    <div className="bg-black p-4 md:p-6 text-center text-[16px] md:text-[18px] font-medium text-white">
                      Premium
                    </div>
                    <div className="bg-black p-4 md:p-6 text-center text-[16px] md:text-[18px] font-medium text-white">
                      Enterprise
                    </div>
                    {featureComparisonRows.map((row) => (
                      <React.Fragment key={row.label}>
                        <div className="border-t border-gray-700 p-4 md:p-6 text-[14px] md:text-[16px] text-white">
                          {row.label}
                        </div>
                        {row.plans.map((enabled, cellIndex) => (
                          <div
                            key={cellIndex}
                            className="flex items-center justify-center border-t border-gray-700 p-4 md:p-6 text-center"
                          >
                            <StatusIcon enabled={enabled} />
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
        <div className="bg-black px-0 py-0 transition-all duration-300">
          <div className="w-full transition-all duration-300">
            <SafeImageToVideo onClose={() => setShowImageToVideo(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default PitchAIPage;


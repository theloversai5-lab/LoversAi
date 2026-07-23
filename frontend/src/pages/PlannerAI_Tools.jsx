// PlannerAI_tools.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import RetexturingTool from "./planner/ai_tools/retexturing";
import AngleChangeComponent from "./planner/ai_tools/image_angle";
import ImageToVideo from "./planner/ai_tools/image_to_video";
import PlannerLibrary from "./planner/PlannerLibrary";
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
    name: "Basic Plan",
    key: "basic",
    price: "333",
    period: "Per Credit • \u20B99,999 / month",
    description: "Perfect for wedding planners and event professionals looking to create premium AI-powered visual content for clients.",
    features: [
      "30 Premium AI Images",
      "HD Image Downloads",
      "10+ Professional AI Styles",
      "AI Background Replacement",
      "AI Object Removal",
      "AI Face Enhancement",
      "Commercial Usage Rights",
      "No Watermark",
      "Private Project Workspace",
      "100 GB Cloud Storage",
      "Priority Email Support",
    ],
    buttonText: "Choose Basic",
  },
  {
    name: "Premium Plan",
    key: "premium",
    price: "325",
    period: "Per Credit • \u20B925,999 / month",
    description: "Designed for growing agencies managing multiple clients, premium events, and large creative projects.",
    features: [
      "80 Premium AI Images",
      "4K Ultra HD Downloads",
      "30+ Premium AI Styles",
      "AI Background & Scene Generation",
      "AI Outfit & Decor Transformation",
      "Unlimited Image Editing",
      "Priority Rendering Queue",
      "Team Collaboration (Up to 5 Members)",
      "Unlimited Commercial Usage",
      "Client Delivery Gallery",
      "500 GB Cloud Storage",
      "Priority Support",
    ],
    buttonText: "Choose Premium",
    featured: true,
  },
  {
    name: "Pro Plan",
    key: "pro",
    price: "316",
    period: "Per Credit • \u20B937,999 / month",
    description: "Ultimate toolkit for professional studios and high-volume planners requiring maximum creative output.",
    features: [
      "120 Premium AI Images",
      "4K Ultra HD Downloads",
      "All Professional & Premium AI Styles",
      "AI Mood Board Generator",
      "AI Venue Visualization",
      "AI Theme & Decor Generator",
      "Unlimited Scene Transformation",
      "Team Collaboration (Up to 10 Members)",
      "Unlimited Commercial Usage",
      "White Label Client Gallery",
      "1 TB Cloud Storage",
      "24×7 Priority Support",
    ],
    buttonText: "Choose Pro",
  },
  {
    name: "Enterprise",
    key: "enterprise",
    price: "Custom Pricing",
    period: "Contact Sales",
    description: "Built for large studios, wedding companies, event agencies, and enterprise creative teams requiring unlimited scalability.",
    features: [
      "Unlimited Premium AI Images",
      "Unlimited AI Image Editing",
      "4K Ultra HD Downloads",
      "Every Premium AI Style",
      "Unlimited Background Generation",
      "AI Mood Board Generator",
      "AI Venue Visualization",
      "AI Theme & Decor Generator",
      "Unlimited Commercial Usage",
      "White Label Client Gallery",
      "Unlimited Team Members",
      "Unlimited Cloud Storage",
      "Dedicated Account Manager",
      "24×7 VIP Support",
    ],
    buttonText: "Contact Sales",
    cta: "Contact Sales",
  },
];

const featureComparisonRows = [
  { label: "REDESIGN YOUR INVENTORY", plans: [true, true, true, true] },
  { label: "Image Views", plans: [true, true, true, true] },
  { label: "DESIGN YOUR WALKTHROUGH", plans: [false, true, true, true] },
  { label: "Generative Image & Video Editing", plans: [true, true, true, true] },
  { label: "HD Quality Downloads", plans: [true, true, true, true] },
  { label: "4K Ultra HD Downloads", plans: [false, true, true, true] },
  { label: "Commercial Usage Rights", plans: [true, true, true, true] },
  { label: "White Label Client Gallery", plans: [false, false, true, true] },
  { label: "Team Collaboration", plans: [false, true, true, true] },
  { label: "Priority VIP Support", plans: [false, false, true, true] },
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
      <span className="text-[16px] font-medium text-white/50 ml-1">/ credit</span>
    </div>
  );
}

const loadRazorpay = () =>
  new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const PitchAIPage = ({ navigateTo, onToggleTool }) => {
  const [showAngleChanger, setShowAngleChanger] = useState(false);
  const [showRetexturing, setShowRetexturing] = useState(false);
  const [showImageToVideo, setShowImageToVideo] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
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
        } else if (toolToOpen === "library") {
          setShowLibrary(true);
        }
        // You can add more tools here as needed
      }
    }
  }, [currentUser]);

  // Scroll to top when tools are opened/closed to prevent scroll issues
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [showRetexturing, showAngleChanger, showImageToVideo, showLibrary]);

  // Notify parent component about active tool status to hide footer
  useEffect(() => {
    if (onToggleTool) {
      onToggleTool(showRetexturing || showAngleChanger || showImageToVideo || showLibrary);
    }
  }, [showRetexturing, showAngleChanger, showImageToVideo, showLibrary, onToggleTool]);

  const handlePurchase = async (plan) => {
    console.log("🚀 handlePurchase called for plan:", plan);

    if (plan === "enterprise") {
      window.location.href = "mailto:support@loversai.com?subject=Enterprise Plan Inquiry";
      return;
    }

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

    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        return;
      }

      toast.loading("Initializing payment...", { id: "payment" });
      const backendPlanId = plan.startsWith("planner_") ? plan : `planner_${plan}`;
      const orderData = await paymentAPI.createOrder({ planId: backendPlanId });

      if (!orderData || !orderData.orderId) {
        toast.error("Server error: Could not create order", { id: "payment" });
        return;
      }

      toast.dismiss("payment");

      const options = {
        key: orderData.keyId || "rzp_test_replace_me",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LoversAI Platform",
        description: `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            toast.loading("Verifying payment...", { id: "verify" });
            const verifyRes = await paymentAPI.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              planId: backendPlanId,
            });

            if (verifyRes.success) {
              toast.success("Payment successful! Subscription activated.", {
                id: "verify",
              });
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              toast.error("Payment verification failed", { id: "verify" });
            }
          } catch (verifyErr) {
            console.error("Verification error", verifyErr);
            toast.error("Server connection lost during verification", {
              id: "verify",
            });
          }
        },
        prefill: {
          name: currentUser.displayName || "",
          email: currentUser.email || currentUser.user?.email || "",
        },
        theme: {
          color: "#d4a878",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("❌ Error in handlePurchase:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <>
      {!showImageToVideo && !showLibrary && (
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
      {!showRetexturing && !showAngleChanger && !showImageToVideo && !showLibrary && (
        <div className="relative w-full min-h-[100svh] flex items-center justify-center text-white overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{
              backgroundImage: `url("./images/bridal.webp")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          ></div>
          <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>

          {/* Centered Pitch details */}
          <div className="relative z-20 text-center px-4 max-w-3xl mx-auto space-y-6">
            <h1 
              className="text-[clamp(2.5rem,6vw,5rem)] font-light tracking-wider leading-none text-white font-heading" 
              style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}
            >
              Pitch with AI
            </h1>
            <p className="text-lg md:text-xl text-white/80 font-light max-w-2xl mx-auto leading-relaxed">
              Pitch your couples and vendors with accurate presentation with these tools.
            </p>
            <div className="pt-4 animate-bounce">
              <a 
                href="#library-section" 
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
                aria-label="Scroll to tools"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Pitch with Library Section */}
      {!showAngleChanger && !showImageToVideo && !showRetexturing && !showLibrary && (
        <div
          id="library-section"
          className="bg-black px-4 pt-20 pb-10"
        >
          <div className="w-full px-4 sm:px-[6%] md:px-[10%]">
            <h2
              onClick={() => handleToolClick("library", () => setShowLibrary(true))}
              className="text-[clamp(2.1rem,5vw,4rem)] font-light text-white mb-12 heading-font text-left cursor-pointer hover:text-rose-300 transition"
            >
              Pitch with Library
            </h2>

            <div
              className="glass-card rounded-[40px] md:rounded-[56px] p-8 md:p-16 border border-white/10 hover:border-loverai-gold/40 hover:shadow-[0_0_50px_rgba(230,198,178,0.1)] transition-all duration-300 group cursor-pointer"
              onClick={() => handleToolClick("library", () => setShowLibrary(true))}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-14 items-center">
                <div className="relative rounded-[32px] overflow-hidden aspect-[4/3.1]">
                  <img
                    src="/images/Library/Wedding-1.webp"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                    alt="Wedding Pitch Deck Preview"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                    <span className="text-loverai-gold text-xs font-bold uppercase tracking-wider mb-1">Featured PPTX</span>
                    <h3 className="text-white text-lg font-semibold">Wedding Royal Mandap Deck</h3>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-light text-white">
                    Access Premium Wedding Presentation Templates
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    Download fully editable, high-quality PowerPoint presentation decks. Showcase beautiful luxury themes for Haldi, Mehendi, Mayra, Sangeet, Shaadi, and Reception to secure and impress your clients.
                  </p>
                  <div className="inline-flex items-center gap-2 text-loverai-gold font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    Browse Design Library 
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Retexturing Section */}
      {!showAngleChanger && !showImageToVideo && !showLibrary && (
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
                REDESIGN YOUR INVENTORY
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
                      src="./images/blue.webp"
                      className="w-full h-full object-cover"
                      alt="Blue themed venue"
                    />
                  </div>
                  <div className="relative rounded-[32px] overflow-hidden aspect-[4/3.4]">
                    <div className="absolute top-6 left-6 bg-black/60 border border-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-medium z-10">
                      After
                    </div>
                    <img
                      src="./images/golden.webp"
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
      {!showRetexturing && !showImageToVideo && !showLibrary && (
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
                DESIGN 3D
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
                      src="./images/Picture1.webp"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 1"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[300px] md:h-[520px]">
                    <img
                      src="./images/Picture2.webp"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 2"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[260px] md:h-[360px]">
                    <img
                      src="./images/Picture3.webp"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 3"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[260px] md:h-[360px]">
                    <img
                      src="./images/Picture4.webp"
                      className="w-full h-full object-cover rounded-[32px]"
                      alt="Angle preview 4"
                    />
                  </div>
                  <div className="md:col-span-4 rounded-[32px] overflow-hidden h-[220px] sm:h-[300px] md:h-[360px]">
                    <img
                      src="./images/Picture5.webp"
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
      {!showRetexturing && !showAngleChanger && !showImageToVideo && !showLibrary && (
        <>
          <div className="bg-black py-20 px-4">
            <div className="w-full px-4 sm:px-[6%] md:px-[10%] mt-16 transition-all duration-300">
              <h2
                className="text-[clamp(2.1rem,5vw,4rem)] text-white/40 mb-16 heading-font text-left cursor-not-allowed select-none"
              >
                DESIGN YOUR WALKTHROUGH
              </h2>
              <div
                className="w-full rounded-[40px] md:rounded-[56px] p-8 md:p-16 glass-card border border-white/10 relative overflow-hidden group cursor-not-allowed select-none"
              >
                {/* Images with grayscale filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-14 filter grayscale opacity-55 pointer-events-none">
                  <div className="relative">
                    <div className="absolute top-6 left-6 bg-black/60 border border-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-medium z-10">
                      Before
                    </div>
                    <div className="rounded-[32px] overflow-hidden aspect-[4/3.4]">
                      <img
                        src="./images/mandap-image.webp"
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

                {/* Lock Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10 animate-pulse duration-[3000ms]">
                  <div className="p-4 rounded-full bg-black/45 border border-white/10 backdrop-blur-md mb-3">
                    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold uppercase tracking-[4px] text-amber-400/90 drop-shadow-md">
                    Coming Soon
                  </span>
                  <span className="text-xs text-white/50 mt-1 uppercase tracking-widest">
                    Stay Tuned
                  </span>
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
              <div className="grid gap-6 mb-16 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
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
                      {plan.period}
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
                    {plan.key && plan.key !== "enterprise" ? (
                      <button
                        onClick={() => handlePurchase(plan.key)}
                        className="loverai-btn-primary mt-10 w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-wide transition-all duration-300 cursor-pointer"
                      >
                        {currentUser ? (plan.buttonText || "Choose Plan") : "Login to Purchase"}
                      </button>
                    ) : plan.cta ? (
                      <button
                        onClick={() => setShowContactPopup(true)}
                        className="loverai-btn-primary mt-10 w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-wide transition-all duration-300 cursor-pointer"
                      >
                        {plan.cta}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
                 {showContactPopup && (
                <div 
                  className="fixed inset-0 bg-[#080605]/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fadeIn"
                  onClick={() => setShowContactPopup(false)}
                >
                  <div 
                    className="bg-[#140F0C] border border-loverai-gold/25 rounded-[32px] p-8 md:p-10 w-full max-w-lg relative text-left shadow-[0_0_50px_rgba(230,198,178,0.15)] animate-scaleUp text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close Icon button in top-right */}
                    <button
                      type="button"
                      onClick={() => setShowContactPopup(false)}
                      className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 hover:border-white/20 text-white/40 hover:text-white flex items-center justify-center transition cursor-pointer"
                      aria-label="Close modal"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="space-y-2 mb-8">
                      <span className="text-[10px] text-loverai-gold/80 bg-loverai-gold/5 px-2.5 py-0.5 rounded-full border border-loverai-gold/10 font-bold uppercase tracking-widest">
                        Enterprise Sales
                      </span>
                      <h2 
                        className="text-white text-3xl font-semibold font-heading mt-2" 
                        style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}
                      >
                        Contact Our Team
                      </h2>
                      <p className="text-xs text-white/50 leading-relaxed max-w-sm">
                        Interested in custom volumes, white-labeled client galleries, or priority rendering? Get in touch to activate your plan.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Email Row */}
                      <a 
                        href="mailto:aanssha@theloversai.co.in?subject=Enterprise Plan Inquiry"
                        className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-loverai-gold/25 hover:bg-white/8 transition duration-200"
                      >
                        <div className="w-10 h-10 rounded-xl bg-loverai-gold/10 border border-loverai-gold/20 flex items-center justify-center text-loverai-gold shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Email Us</p>
                          <p className="text-sm font-medium text-loverai-gold mt-0.5">aanssha@theloversai.co.in</p>
                        </div>
                      </a>

                      {/* Phone Row */}
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-loverai-gold/10 border border-loverai-gold/20 flex items-center justify-center text-loverai-gold shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Call or WhatsApp</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-sm font-medium text-white/95">
                            <a href="tel:+919821640951" className="hover:text-loverai-gold transition">+91 9821640951</a>
                            <span className="text-white/20">|</span>
                            <a href="tel:+919266355235" className="hover:text-loverai-gold transition">+91 9266355235</a>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp Chat Link */}
                      <a 
                        href="https://wa.me/919266355235"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-4 p-4 rounded-2xl bg-green-500/5 border border-green-500/10 hover:border-green-500/30 hover:bg-green-500/8 transition duration-200"
                      >
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-green-400/60 uppercase tracking-wider font-semibold">Direct Message</p>
                          <p className="text-sm font-semibold text-green-400 mt-0.5">Chat with us on WhatsApp</p>
                        </div>
                      </a>

                      {/* Address Row */}
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-loverai-gold/10 border border-loverai-gold/20 flex items-center justify-center text-loverai-gold shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Our Office</p>
                          <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
                            G-29, RG Trade Tower, NSP, Pitampura, Delhi
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowContactPopup(false)}
                      className="mt-8 w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-bold transition active:scale-98 cursor-pointer text-center"
                    >
                      Close Window
                  </button>
                </div>
              </div>
            )}

              {/* Features Comparison Table */}
              <div className="w-full px-4 sm:px-[6%] md:px-[10%] mt-32 transition-all duration-300">
                <div className="w-full overflow-x-auto rounded-[8px] border border-gray-600">
                  <div className="grid min-w-[760px] grid-cols-5">
                    <div className="bg-black p-4 md:p-6 text-[16px] md:text-[18px] font-medium text-white">
                      Features
                    </div>
                    <div className="bg-black p-4 md:p-6 text-center text-[16px] md:text-[18px] font-medium text-white">
                      Basic
                    </div>
                    <div className="bg-black p-4 md:p-6 text-center text-[16px] md:text-[18px] font-medium text-white">
                      Premium
                    </div>
                    <div className="bg-black p-4 md:p-6 text-center text-[16px] md:text-[18px] font-medium text-white">
                      Pro
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

      {/* Active Design Library Screen Inline */}
      {showLibrary && (
        <div className="bg-black px-4 py-16 transition-all duration-300">
          <div className="max-w-[1550px] mx-auto px-2 md:px-4">
            <PlannerLibrary onClose={() => setShowLibrary(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default PitchAIPage;


<<<<<<< HEAD
import React from "react";
=======
import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
>>>>>>> origin/Couples
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { paymentAPI } from "../api/api";

const RUPEE = "\u20B9";

const planCards = [
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
      "Custom credits",
      "Unlimited storage",
      "All features",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
  },
];

const topUpRows = [
  { plan: "Free", credits: "10", pricePerCredit: "17.00" },
  { plan: "Basic", credits: "10", pricePerCredit: "13.60" },
  { plan: "Premium", credits: "10", pricePerCredit: "8.50" },
];

const featureRows = [
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
      <div className="mb-1 text-3xl font-bold tracking-tight text-loverai-gold sm:text-4xl">
        {value}
      </div>
    );
  }

  return (
    <div className="mb-1 flex items-baseline gap-2 text-loverai-gold">
      <span className="text-2xl font-semibold sm:text-3xl">{RUPEE}</span>
      <span className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
        {value}
      </span>
    </div>
  );
}

const PricingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

<<<<<<< HEAD
  const loadRazorpay = () =>
    new Promise((resolve) => {
=======
  // Dynamic premium fonts injection
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
>>>>>>> origin/Couples
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePurchase = async (plan) => {
    if (!currentUser) {
<<<<<<< HEAD
      sessionStorage.setItem("redirectAfterLogin", "/pricing");

=======
      console.log("❌ User not authenticated, redirecting to login");
      sessionStorage.setItem("redirectAfterLogin", "/pricing");
>>>>>>> origin/Couples
      if (
        window.confirm(
          "You need to login to purchase a plan. Redirect to login page?",
        )
      ) {
        navigate("/login", { state: { from: "/pricing" } });
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
      const orderData = await paymentAPI.createOrder({ plan });

      if (!orderData || !orderData.orderId) {
        toast.error("Server error: Could not create order", { id: "payment" });
        return;
      }

      toast.dismiss("payment");

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_replace_me",
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
            });

            if (verifyRes.success) {
              toast.success("Payment successful! Credits added.", {
                id: "verify",
              });
              setTimeout(() => {
                navigate("/profile");
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
          name:
            currentUser?.fullName ||
            currentUser?.user?.fullName ||
            "Valued User",
          email:
            currentUser?.email ||
            currentUser?.user?.email ||
            "user@loversai.com",
        },
        theme: {
          color: "#9B5370",
        },
      };

      const razorpayWindow = new window.Razorpay(options);
      razorpayWindow.on("payment.failed", function (response) {
        console.error(response.error);
        toast.error(response.error.description || "Payment failed");
      });

      razorpayWindow.open();
    } catch (error) {
      console.error("Error during purchase:", error);
      toast.error(
        `Failed to initiate purchase: ${error.response?.data?.error || error.message}`,
        { id: "payment" },
      );
    }
  };

  const serif = { fontFamily: "'Cormorant Garamond', serif" };

  return (
<<<<<<< HEAD
    <div style={pageStyle} className="px-4 pb-20">
      <div className="mx-auto max-w-7xl">
        <div className="pt-32" />

        <h2 className="mb-8 text-center text-5xl font-light text-white heading-font">
          Choose Your Creative Plan
        </h2>
        <p className="mx-auto mb-16 max-w-3xl text-center text-white/40">
          Unlock the full potential of AI-powered content creation with plans
          designed for every creator, from hobbyists to enterprises.
        </p>

        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planCards.map((plan) => (
            <div
              key={plan.name}
              style={{
                backgroundColor: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(12px)",
                color: "#fff",
              }}
              className={`relative flex h-full flex-col rounded-2xl border p-6 ${
                plan.featured
                  ? "border-[#e6c6b2]/40 shadow-[0_0_20px_rgba(230,198,178,0.15)]"
                  : "border-white/10"
              }`}
            >
              {plan.featured && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-gradient-to-r from-[#e6c6b2] to-[#c59854] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1c1613]">
                  Most Popular
                </div>
              )}

              <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
              <PriceValue value={plan.price} />
              <div className="mb-6 text-sm text-white/50">
                {plan.key ? "/month" : plan.price === "0" ? "/month" : ""}
              </div>
              <p className="mb-6 text-sm text-white/60">{plan.description}</p>

              <ul className="mb-8 flex-grow space-y-3 text-sm text-white/90">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <StatusIcon enabled />
                    <span className="leading-6">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.key && (
                <button
                  onClick={() => handlePurchase(plan.key)}
                  style={{
                    background: "linear-gradient(135deg, #e6c6b2, #c59854)",
                    color: "#1c1613",
                  }}
                  className="mx-auto mt-4 flex w-2/3 justify-center rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide transition-all hover:brightness-110 shadow-[0_4px_15px_rgba(225,195,135,0.3)]"
                >
                  {currentUser ? "Buy Now" : "Login to Purchase"}
                </button>
              )}

              {plan.cta && (
                <button
                  onClick={() => {
                    toast.info(
                      "Please contact sales@loversai.com for Enterprise plans",
                    );
                  }}
                  style={{
                    background: "linear-gradient(135deg, #e6c6b2, #c59854)",
                    color: "#1c1613",
                  }}
                  className="mx-auto mt-4 flex w-2/3 justify-center rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide transition-all hover:brightness-110 shadow-[0_4px_15px_rgba(225,195,135,0.3)]"
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto mb-16 max-w-4xl">
          <h3 className="mb-8 text-center text-3xl font-light text-white heading-font">
            Top-Up Pricing
          </h3>
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              color: "#fff",
            }}
            className="rounded-2xl border border-white/10 p-8"
          >
            <div className="grid grid-cols-3 gap-4 text-white">
              <div className="text-center font-semibold">Current Plan</div>
              <div className="text-center font-semibold">Number of Credits</div>
              <div className="text-center font-semibold">Price per Credit</div>
            </div>
            <hr className="my-4 border-gray-300/20" />
            <div className="space-y-4">
              {topUpRows.map((row) => (
                <div
                  key={row.plan}
                  className="grid grid-cols-3 gap-4 text-white/70"
                >
                  <div className="text-center">{row.plan}</div>
                  <div className="text-center tabular-nums">{row.credits}</div>
                  <div className="text-center font-medium text-loverai-gold tabular-nums">
                    {RUPEE}
                    {row.pricePerCredit}
                  </div>
                </div>
              ))}
=======
    <div className="relative min-h-screen text-white overflow-x-hidden font-sans pb-24">
      {/* Background Image Setup */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-20 animate-scaleIn"
        style={{
          backgroundImage: 'url("/images/signup.png")',
          filter: "brightness(0.75) contrast(1.05)",
          backgroundAttachment: "fixed",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0a0604] -z-10" />

      <div className="mx-auto w-full max-w-7xl px-6 pt-32 relative z-10 flex flex-col">
        <h2 style={serif} className="text-4.5xl md:text-6xl font-semibold text-center mb-4 tracking-wide text-white">
          Choose Your Wedding Planning Plan
        </h2>
        <p className="text-center text-white/60 mb-16 max-w-3xl mx-auto leading-relaxed text-sm md:text-base">
          Unlock the full potential of AI-powered moodboards, designer decor visions, and direct planner proposals custom tailored for your special day.
        </p>

        {/* Pricing Cards Grid (exactly 3 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto w-full">
          {/* Free Plan */}
          <div className="rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-md p-8 flex flex-col h-full hover:border-[#e6c6b2]/20 transition-all duration-300 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h3 style={serif} className="text-3xl font-semibold mb-2 text-white">Free Plan</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">₹ 0</span>
            </div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-6 font-sans">Free Forever</div>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
              Explore basic AI planning and vision tools for couples starting their journey.
            </p>

            <ul className="text-sm space-y-3 mb-8 flex-grow text-white/80">
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span><strong>1 AI Decor Vision</strong> (Small Event only)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>1 Active moodboard slot</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Browse wedding planner listings</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Standard resolution downloads</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Access to basic wedding profile dashboard</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white/50 border border-white/5 cursor-default mt-auto"
            >
              Default Plan
            </button>
          </div>

          {/* Basic Plan (Upgrade) */}
          <div className="rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-md p-8 flex flex-col h-full hover:border-[#e6c6b2]/20 transition-all duration-300 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h3 style={serif} className="text-3xl font-semibold mb-2 text-white">Basic Plan</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">₹ 1,499</span>
            </div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-6 font-sans">Per Month</div>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
              Great for couples looking for richer event inspiration and contact options.
            </p>

            <ul className="text-sm space-y-3 mb-8 flex-grow text-white/80">
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span><strong>15 AI Decor Visions</strong> (Small/Medium Events)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>5 Active moodboard slots</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Connect with up to 5 wedding planners</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>High resolution downloads</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Standard email customer support</span>
              </li>
            </ul>

            <button
              onClick={() => handlePurchase("basic")}
              className="w-full inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-white py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 border border-white/15 shadow-md mt-auto cursor-pointer"
            >
              {currentUser ? "Upgrade Now" : "Login to Upgrade"}
            </button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-[24px] border border-[#e6c6b2]/40 bg-white/5 backdrop-blur-md p-8 flex flex-col h-full hover:border-[#e6c6b2]/60 transition-all duration-300 shadow-[0_24px_80px_rgba(230,198,178,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#e6c6b2] to-[#c59854] text-[#1c1613] text-[9px] font-extrabold px-3 py-1.5 rounded-bl-xl uppercase tracking-wider font-sans">Most Popular</div>
            <h3 style={serif} className="text-3xl font-semibold mb-2 text-white font-serif">Premium Plan</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">₹ 2,499</span>
            </div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-6 font-sans">Per Month</div>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
              Full access to complete wedding tools, custom theme generations, and unlimited listings.
            </p>

            <ul className="text-sm space-y-3 mb-8 flex-grow text-white/80">
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span><strong>Unlimited AI Decor Visions</strong> (All Event Types)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Unlimited moodboard slots & themes</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Connect & chat with unlimited planners</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Ultra high-res (Watermark-free) downloads</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Access to custom generative theme tools</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                <span>Priority 24/7 dedicated support & chat</span>
              </li>
            </ul>

            <button
              onClick={() => handlePurchase("premium")}
              style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }}
              className="w-full inline-flex items-center justify-center rounded-full text-[#1c1613] py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-[0_8px_24px_rgba(230,198,178,0.25)] hover:brightness-105 mt-auto cursor-pointer"
            >
              {currentUser ? "Buy Premium" : "Login to Purchase"}
            </button>
          </div>
        </div>

        {/* Top-Up Pricing Section */}
        <div className="max-w-4xl mx-auto mb-16 w-full">
          <h3 style={serif} className="text-3xl font-light text-center mb-8 heading-font text-white">
            Top-Up Pricing
          </h3>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="grid grid-cols-3 gap-4 text-white font-semibold text-xs md:text-sm uppercase tracking-wider">
              <div className="text-center">Current Plan</div>
              <div className="text-center">Pack of Extra AI Vision Credits</div>
              <div className="text-center">Price per Pack</div>
            </div>
            <hr className="my-4 border-white/10" />
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-4 text-white/70">
                <div className="text-center">Free</div>
                <div className="text-center">10 Extra Images</div>
                <div className="text-center">₹ 199</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-white/70">
                <div className="text-center">Basic</div>
                <div className="text-center">10 Extra Images</div>
                <div className="text-center">₹ 149</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-white/70">
                <div className="text-center font-bold text-[#e6c6b2]">Premium</div>
                <div className="text-center text-[#e6c6b2] font-semibold">Unlimited Included</div>
                <div className="text-center text-[#e6c6b2] font-semibold">₹ 0</div>
              </div>
>>>>>>> origin/Couples
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <div className="mx-auto mb-16 max-w-6xl">
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              color: "#fff",
            }}
            className="overflow-hidden rounded-2xl border border-white/10"
          >
            <div className="grid grid-cols-5 gap-0">
              <div className="bg-white/10 p-4 font-semibold text-white">
                Features
              </div>
              <div className="bg-white/10 p-4 text-center font-semibold text-white">
                Free
              </div>
              <div className="bg-white/10 p-4 text-center font-semibold text-white">
                Basic
              </div>
              <div className="bg-white/10 p-4 text-center font-semibold text-white">
                Premium
              </div>
              <div className="bg-white/10 p-4 text-center font-semibold text-white">
                Enterprise
              </div>

              {featureRows.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="border-t border-white/10 p-4 text-white">
                    {row.label}
=======
        {/* Features Comparison Table */}
        <div className="max-w-5xl mx-auto mb-16 w-full">
          <h3 style={serif} className="text-3xl font-light text-center mb-8 heading-font text-white">
            Compare Features
          </h3>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="grid grid-cols-4 gap-0 text-sm">
              {/* Header row */}
              <div className="bg-white/15 p-4 text-[#e6c6b2] font-bold uppercase tracking-wider text-xs">
                Features
              </div>
              <div className="bg-white/15 p-4 text-white font-semibold text-center font-sans">
                Free
              </div>
              <div className="bg-white/15 p-4 text-white font-semibold text-center font-sans">
                Basic
              </div>
              <div className="bg-white/15 p-4 text-[#e6c6b2] font-bold text-center font-sans">
                Premium
              </div>

              {/* Feature rows */}
              {[
                ["AI Vision Generations", "1 (Small Event only)", "15 (Small/Medium)", "Unlimited (All Events)"],
                ["Event Categories Allowed", "Anniversary/Birthday only", "Small/Medium Events", "All Events (Wedding, etc.)"],
                ["Moodboard Slots", "1 slot", "5 slots", "Unlimited slots"],
                ["Contact Planners", "Browse Only", "Up to 5", "Unlimited Planners"],
                ["Download Quality", "Standard", "High Resolution", "Ultra High-Res (Watermarked-free)"],
                ["Direct Chat with Planners", "—", "—", "✔️"],
                ["Custom Styling & Themes", "—", "—", "✔️"],
                ["Priority Support", "—", "—", "✔️"],
              ].map((row, index) => (
                <React.Fragment key={index}>
                  <div className="p-4 border-t border-white/10 text-white font-medium font-sans">
                    {row[0]}
>>>>>>> origin/Couples
                  </div>
                  {row.plans.map((enabled, index) => (
                    <div
<<<<<<< HEAD
                      key={`${row.label}-${index}`}
                      className="flex items-center justify-center border-t border-white/10 p-4 text-center"
                    >
                      <StatusIcon enabled={enabled} />
=======
                      key={cellIndex}
                      className="p-4 border-t border-white/10 text-center text-white/70 font-sans"
                    >
                      {cell === "✔️" ? (
                        <span className="text-green-500 text-xl font-bold">✔️</span>
                      ) : cell === "—" ? (
                        <span className="text-red-500 text-xl font-bold">—</span>
                      ) : (
                        cell
                      )}
>>>>>>> origin/Couples
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;

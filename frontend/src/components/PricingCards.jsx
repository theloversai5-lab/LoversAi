import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { paymentAPI } from "../api/api";

const RUPEE = "\u20B9";

const plannerPlans = [
  {
    name: "Basic Plan",
    price: "32,999",
    period: "Lifetime Access",
    description: "Perfect for wedding planners and event professionals looking to create premium AI-powered visual content for clients.",
    features: [
      { bold: "100 Premium AI Images", regular: "" },
      { bold: "HD Image Downloads", regular: "" },
      { bold: "10+ Professional AI Styles", regular: "" },
      { bold: "AI Background Replacement", regular: "" },
      { bold: "AI Object Removal", regular: "" },
      { bold: "AI Face Enhancement", regular: "" },
      { bold: "Commercial Usage Rights", regular: "" },
      { bold: "No Watermark", regular: "" },
      { bold: "Private Project Workspace", regular: "" },
      { bold: "100 GB Cloud Storage", regular: "" },
      { bold: "Priority Email Support", regular: "" }
    ],
    buttonText: "Choose Basic",
    key: "planner_basic"
  },
  {
    name: "Premium Plan",
    price: "63,999",
    period: "Lifetime Access",
    description: "Designed for growing agencies managing multiple clients, premium events, and large creative projects.",
    features: [
      { bold: "210 Premium AI Images", regular: "" },
      { bold: "4K Ultra HD Downloads", regular: "" },
      { bold: "30+ Premium AI Styles", regular: "" },
      { bold: "AI Background & Scene Generation", regular: "" },
      { bold: "AI Outfit & Decor Transformation", regular: "" },
      { bold: "Unlimited Image Editing", regular: "" },
      { bold: "Priority Rendering Queue", regular: "" },
      { bold: "Team Collaboration (Up to 5 Members)", regular: "" },
      { bold: "Unlimited Commercial Usage", regular: "" },
      { bold: "Client Delivery Gallery", regular: "" },
      { bold: "500 GB Cloud Storage", regular: "" },
      { bold: "Priority Support", regular: "" }
    ],
    buttonText: "Choose Premium",
    key: "planner_premium",
    featured: true
  },
  {
    name: "Pro Plan",
    price: "99,999",
    period: "Lifetime Access",
    description: "Ultimate toolkit for professional studios and high-volume planners requiring maximum creative output.",
    features: [
      { bold: "400 Premium AI Images", regular: "" },
      { bold: "4K Ultra HD Downloads", regular: "" },
      { bold: "All Professional & Premium AI Styles", regular: "" },
      { bold: "AI Mood Board Generator", regular: "" },
      { bold: "AI Venue Visualization", regular: "" },
      { bold: "AI Theme & Decor Generator", regular: "" },
      { bold: "Unlimited Scene Transformation", regular: "" },
      { bold: "Team Collaboration (Up to 10 Members)", regular: "" },
      { bold: "Unlimited Commercial Usage", regular: "" },
      { bold: "White Label Client Gallery", regular: "" },
      { bold: "1 TB Cloud Storage", regular: "" },
      { bold: "24×7 Priority Support", regular: "" }
    ],
    buttonText: "Choose Pro",
    key: "planner_pro"
  },
  {
    name: "Enterprise",
    price: "Custom Pricing",
    period: "Contact Sales",
    description: "Built for large studios, wedding companies, event agencies, and enterprise creative teams requiring unlimited scalability.",
    features: [
      { bold: "Unlimited Premium AI Images", regular: "" },
      { bold: "Unlimited AI Image Editing", regular: "" },
      { bold: "4K Ultra HD Downloads", regular: "" },
      { bold: "Every Premium AI Style", regular: "" },
      { bold: "Unlimited Background Generation", regular: "" },
      { bold: "AI Mood Board Generator", regular: "" },
      { bold: "AI Venue Visualization", regular: "" },
      { bold: "AI Theme & Decor Generator", regular: "" },
      { bold: "Unlimited Commercial Usage", regular: "" },
      { bold: "White Label Client Gallery", regular: "" },
      { bold: "Unlimited Team Members", regular: "" },
      { bold: "Unlimited Cloud Storage", regular: "" },
      { bold: "Dedicated Account Manager", regular: "" },
      { bold: "24×7 VIP Support", regular: "" }
    ],
    buttonText: "Contact Sales",
    key: "enterprise"
  }
];

const couplePlans = [
  {
    name: "Free Plan",
    price: "0",
    period: "Forever Free",
    description: "Perfect for trying Lovers AI and creating your first magical AI memories together.",
    features: [
      { bold: "4 AI Couple Photos", regular: "" },
      { bold: "Standard AI Quality", regular: "" },
      { bold: "Romantic Style Presets", regular: "" },
      { bold: "Basic Face Enhancement", regular: "" },
      { bold: "Secure Private Gallery", regular: "" },
      { bold: "Watermarked Downloads", regular: "" },
      { bold: "Community Support", regular: "" }
    ],
    buttonText: "Start Free",
    key: "free"
  },
  {
    name: "Basic Plan",
    price: "4,999",
    period: "Lifetime Access",
    description: "Ideal for couples who want premium AI-generated memories with enhanced quality and exclusive styles.",
    features: [
      { bold: "12 Premium AI Couple Photos", regular: "" },
      { bold: "HD Image Downloads", regular: "" },
      { bold: "10+ Premium AI Art Styles", regular: "" },
      { bold: "AI Background Replacement", regular: "" },
      { bold: "AI Face Enhancement", regular: "" },
      { bold: "5 Free Re-generations", regular: "" },
      { bold: "No Watermark", regular: "" },
      { bold: "Private Couple Gallery", regular: "" },
      { bold: "50GB Secure Cloud Storage", regular: "" },
      { bold: "Email Support", regular: "" }
    ],
    buttonText: "Choose Basic",
    key: "couple_basic"
  },
  {
    name: "Premium Plan",
    price: "13,499",
    period: "Lifetime Access",
    description: "Unlock cinematic-quality memories with advanced AI, exclusive collections, and premium editing features.",
    features: [
      { bold: "32 Premium AI Couple Photos", regular: "" },
      { bold: "4K Ultra HD Downloads", regular: "" },
      { bold: "30+ Premium AI Styles", regular: "" },
      { bold: "Wedding Collection", regular: "" },
      { bold: "Anniversary Collection", regular: "" },
      { bold: "Festival & Holiday Themes", regular: "" },
      { bold: "AI Outfit Transformation", regular: "" },
      { bold: "AI Background Replacement", regular: "" },
      { bold: "20 Free Re-generations", regular: "" },
      { bold: "Couple Story Album", regular: "" },
      { bold: "150GB Secure Cloud Storage", regular: "" },
      { bold: "Priority Image Processing", regular: "" },
      { bold: "Priority Support", regular: "" }
    ],
    buttonText: "Choose Premium",
    key: "couple_premium",
    featured: true
  },
  {
    name: "Pro Plan",
    price: "26,999",
    period: "Lifetime Access",
    description: "The complete Lovers AI experience with unlimited creativity and the highest-quality AI memories.",
    features: [
      { bold: "64 Premium AI Couple Photos", regular: "" },
      { bold: "Unlimited AI Editing", regular: "" },
      { bold: "Unlimited Re-generations", regular: "" },
      { bold: "4K Ultra HD Downloads", regular: "" },
      { bold: "Every Premium AI Style", regular: "" },
      { bold: "Wedding, Travel & Fantasy Collections", regular: "" },
      { bold: "AI Couple Video Generation", regular: "" },
      { bold: "Unlimited Background Changes", regular: "" },
      { bold: "VIP Rendering Queue", regular: "" },
      { bold: "Unlimited Cloud Storage", regular: "" },
      { bold: "Lifetime Gallery Access", regular: "" },
      { bold: "Early Access to New Features", regular: "" },
      { bold: "Dedicated VIP Support", regular: "" }
    ],
    buttonText: "Go Pro",
    key: "couple_pro"
  }
];

export default function PricingCards({ showOnlyRole }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const fetchPlan = async () => {
        try {
          setLoadingPlan(true);
          const response = await paymentAPI.getPaymentStatus();
          if (response.success && response.plan) {
            setCurrentPlan(response.plan);
          }
        } catch (err) {
          console.error("Error fetching subscription status:", err);
        } finally {
          setLoadingPlan(false);
        }
      };
      fetchPlan();
    }
  }, [currentUser]);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePurchase = async (plan) => {
    if (plan === "enterprise") {
      window.location.href = "mailto:support@loversai.com?subject=Enterprise Plan Inquiry";
      return;
    }

    if (!currentUser) {
      sessionStorage.setItem("redirectAfterLogin", "/pricing");

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
      const orderData = await paymentAPI.createOrder({ planId: plan });

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
              planId: plan,
            });

            if (verifyRes.success) {
              toast.success("Payment successful! Subscription activated.", {
                id: "verify",
              });
              setCurrentPlan(plan);
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
          color: "#b89f79",
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

  const [selectedRole, setSelectedRole] = useState(() => {
    if (showOnlyRole) return showOnlyRole;
    const userRole = localStorage.getItem("userRole");
    if (userRole === "planner") return "planner";
    if (userRole === "couple") return "couple";
    return "couple";
  });

  useEffect(() => {
    if (showOnlyRole) {
      setSelectedRole(showOnlyRole);
      return;
    }
    const userRole = currentUser?.role || localStorage.getItem("userRole");
    if (userRole === "planner") {
      setSelectedRole("planner");
    } else if (userRole === "couple") {
      setSelectedRole("couple");
    }
  }, [currentUser, showOnlyRole]);

  const serif = { fontFamily: "'Cormorant Garamond', serif" };
  const activePlans = selectedRole === "planner" ? plannerPlans : couplePlans;

  return (
    <div className="space-y-12">
      {/* Role Switcher Toggle */}
      {!showOnlyRole && (
        <div className="flex justify-center">
          <div className="bg-[#1c1410] border border-white/10 p-1.5 rounded-full flex gap-1 relative z-10">
            <button 
              type="button"
              onClick={() => setSelectedRole("couple")}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                selectedRole === "couple" 
                  ? "bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] shadow-md" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              For Couples
            </button>
            <button 
              type="button"
              onClick={() => setSelectedRole("planner")}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                selectedRole === "planner" 
                  ? "bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] shadow-md" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              For Planners
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto items-stretch">
        {activePlans.map((plan) => {
          const isCurrent = 
            currentPlan === plan.key || 
            (plan.key === 'planner_basic' && currentPlan === 'basic') || 
            (plan.key === 'planner_premium' && currentPlan === 'premium') || 
            (plan.key === 'planner_pro' && currentPlan === 'pro') ||
            (plan.key === 'couple_pro' && currentPlan === 'couple_elite');
            
          return (
            <div
              key={plan.name}
              style={{
                backgroundColor: "rgba(20, 15, 12, 0.65)",
                backdropFilter: "blur(20px)",
                borderColor: plan.featured ? "rgba(230, 198, 178, 0.25)" : "rgba(255, 255, 255, 0.08)",
                boxShadow: plan.featured ? "0 0 25px rgba(230, 198, 178, 0.12)" : "none",
              }}
              className={`relative flex flex-col rounded-[28px] border p-8 md:p-10 text-white transition-all hover:scale-[1.01] hover:border-white/15`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 right-8 bg-[#d4a878] text-[#201913] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-md">
                  Most Popular
                </div>
              )}

              <h3 className="mb-3 text-3xl font-light" style={serif}>
                {plan.name}
              </h3>
              
              <div className="mb-1 flex items-baseline gap-1 text-white" style={serif}>
                {plan.price !== "Custom Pricing" && <span className="text-[28px] font-medium mr-1">{RUPEE}</span>}
                <span className={plan.price === "Custom Pricing" ? "text-[38px] font-bold tracking-tight" : "text-[54px] font-bold tracking-tight"}>{plan.price}</span>
              </div>
              
              <div className="mb-6 text-[11px] font-medium tracking-[0.15em] text-white/50 uppercase">
                {plan.period}
              </div>
              
              <p className="mb-8 text-[14px] text-white/60 leading-relaxed font-light">
                {plan.description}
              </p>

              <ul className="mb-10 flex-grow space-y-4 text-[14px]">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4.5 10l3.5 3.5L15.5 6" />
                    </svg>
                    <span className="leading-5 text-white/80">
                      {feature.bold && <strong className="font-semibold text-white/95">{feature.bold}</strong>}
                      {feature.regular}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/5 cursor-not-allowed text-center"
                >
                  CURRENT PLAN
                </button>
              ) : plan.key === "free" ? (
                <button
                  onClick={() => navigate("/signup")}
                  className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95 cursor-pointer text-center"
                >
                  {plan.buttonText}
                </button>
              ) : plan.featured ? (
                <button
                  onClick={() => handlePurchase(plan.key)}
                  className="w-full py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] hover:brightness-110 shadow-lg shadow-[#d4a878]/10 transition-all active:scale-95 cursor-pointer text-center"
                >
                  {plan.buttonText}
                </button>
              ) : (
                <button
                  onClick={() => handlePurchase(plan.key)}
                  className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95 cursor-pointer text-center"
                >
                  {plan.buttonText}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

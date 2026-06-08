import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { paymentAPI } from "../api/api";

const RUPEE = "\u20B9";

const planCards = [
  {
    name: "Free Plan",
    price: "0",
    period: "FREE FOREVER",
    description: "Explore basic AI planning and vision tools for couples starting their journey.",
    features: [
      { bold: "1 AI Decor Vision ", regular: "(Small Event only)" },
      { bold: "1 Active moodboard slot", regular: "" },
      { bold: "", regular: "Browse wedding planner listings" },
      { bold: "", regular: "Standard resolution downloads" },
      { bold: "", regular: "Access to basic wedding profile dashboard" }
    ],
    buttonText: "DEFAULT PLAN",
    key: "free"
  },
  {
    name: "Basic Plan",
    price: "1,499",
    period: "PER MONTH",
    description: "Great for couples looking for richer event inspiration and contact options.",
    features: [
      { bold: "15 AI Decor Visions ", regular: "(Small/Medium Events)" },
      { bold: "5 Active moodboard slots", regular: "" },
      { bold: "", regular: "Connect with up to 5 wedding planners" },
      { bold: "", regular: "High resolution downloads" },
      { bold: "", regular: "Standard email customer support" }
    ],
    buttonText: "UPGRADE NOW",
    key: "basic"
  },
  {
    name: "Premium Plan",
    price: "2,499",
    period: "PER MONTH",
    description: "Full access to complete wedding tools, custom theme generations, and unlimited listings.",
    features: [
      { bold: "Unlimited AI Decor Visions ", regular: "(All Event Types)" },
      { bold: "Unlimited moodboard slots & themes", regular: "" },
      { bold: "", regular: "Connect & chat with unlimited planners" },
      { bold: "", regular: "Ultra high-res (Watermark-free) downloads" },
      { bold: "", regular: "Access to custom generative theme tools" },
      { bold: "", regular: "Priority 24/7 dedicated support & chat" }
    ],
    buttonText: "BUY PREMIUM",
    key: "premium",
    featured: true
  }
];

const PricingPage = () => {
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

  const serif = { fontFamily: "'Cormorant Garamond', serif" };
  const pageStyle = {
    minHeight: "100vh",
    backgroundImage: "linear-gradient(to bottom, rgba(20, 12, 10, 0.65) 0%, rgba(10, 5, 4, 0.85) 100%), url('/images/signup.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div style={pageStyle} className="px-4 pb-24">
      <div className="mx-auto max-w-7xl">
        <div className="pt-32" />

        <h2 className="mb-4 text-center text-4xl md:text-5xl lg:text-[56px] font-light text-white" style={serif}>
          Choose Your Wedding Planning Plan
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/70 text-sm md:text-base leading-relaxed font-light">
          Unlock the full potential of AI-powered moodboards, designer decor visions, and direct planner proposals custom tailored for your special day.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-6xl mx-auto items-stretch">
          {planCards.map((plan) => {
            const isCurrent = currentPlan === plan.key;
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
                  <span className="text-[28px] font-medium mr-1">{RUPEE}</span>
                  <span className="text-[54px] font-bold tracking-tight">{plan.price}</span>
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

                {plan.key === "free" ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/10 text-white/80 border border-white/5 cursor-not-allowed"
                  >
                    DEFAULT PLAN
                  </button>
                ) : isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/5 cursor-not-allowed"
                  >
                    CURRENT PLAN
                  </button>
                ) : plan.key === "premium" ? (
                  <button
                    onClick={() => handlePurchase("premium")}
                    className="w-full py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] hover:brightness-110 shadow-lg shadow-[#d4a878]/10 transition-all active:scale-95"
                  >
                    BUY PREMIUM
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase("basic")}
                    className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95"
                  >
                    UPGRADE NOW
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;

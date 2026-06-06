import React from "react";
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
  const pageStyle = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(230, 198, 178, 0.12), transparent 40%), linear-gradient(180deg, #17110f 0%, #0d0908 100%)",
  };

  return (
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
            </div>
          </div>
        </div>

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
                  </div>
                  {row.plans.map((enabled, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      className="flex items-center justify-center border-t border-white/10 p-4 text-center"
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
  );
};

export default PricingPage;

// pages/PricingPage.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { paymentAPI } from "../api/api";

const PricingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (plan) => {
    console.log("🚀 handlePurchase called for plan:", plan);

    // Check if user is authenticated
    if (!currentUser) {
      console.log("❌ User not authenticated, redirecting to login");

      // Store the current page to redirect back after login
      sessionStorage.setItem("redirectAfterLogin", "/pricing");

      // Show a message to the user
      if (
        window.confirm(
          "You need to login to purchase a plan. Redirect to login page?",
        )
      ) {
        navigate("/login", { state: { from: "/pricing" } });
      }
      return;
    }

    // If user is authenticated, proceed with purchase
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        return;
      }

      toast.loading("Initializing payment...", { id: "payment" });

      // Step 1: Create Order on Backend
      const orderData = await paymentAPI.createOrder({ plan });

      if (!orderData || !orderData.orderId) {
        toast.error("Server error: Could not create order", { id: "payment" });
        return;
      }

      toast.dismiss("payment");

      // Step 2: Initialize Razorpay window
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_replace_me", // We need the user to set this in .env later
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LoversAI Platform",
        description: `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            toast.loading("Verifying payment...", { id: "verify" });
            // Step 3: Verify Signature on Backend
            const verifyRes = await paymentAPI.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              toast.success("Payment successful! Credits added.", {
                id: "verify",
              });
              // Small delay to allow toast to show, then return to dashboard
              setTimeout(() => {
                navigate("/profile"); // or refresh dashboard
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
          color: "#9B5370", // burgundy wine rose
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
        "Failed to initiate purchase: " +
          (error.response?.data?.error || error.message),
        { id: "payment" },
      );
    }
  };

  const pageStyle = {
    width: "100%",
    minHeight: "100vh",
    backgroundImage: "url('/images/signup.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
    color: "#F9F7F5",
    fontFamily: "'Poppins', sans-serif",
  };

  return (
    <div style={pageStyle} className="px-4 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Navbar spacing fix */}
        <div className="pt-32"></div>

        <h2 className="text-5xl font-light text-center mb-8 heading-font text-white">
          Choose Your Creative Plan
        </h2>
        <p className="text-center text-white/40 mb-16 max-w-3xl mx-auto">
          Unlock the full potential of AI-powered content creation with plans
          designed for every creator, from hobbyists to enterprises.
        </p>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Free Plan */}
          <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-white/10 rounded-2xl p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold mb-2">Free Plan</h3>
            <div className="text-3xl font-bold mb-1">₹ 0</div>
            <div className="text-sm text-white/50 mb-6">/month</div>
            <p className="text-sm text-white/60 mb-6">
              Perfect for getting started with AI creativity.
            </p>

            <ul className="text-sm space-y-2 mb-8 flex-grow">
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Retexturizing
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Image upscaling
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Image views
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Standard quality
                output
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Community
                support
              </li>
            </ul>
          </div>

          {/* Basic Plan */}
          <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-white/10 rounded-2xl p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold mb-2">Basic Plan</h3>
            <div className="text-3xl font-bold mb-1">₹ 4,349</div>
            <div className="text-sm text-white/50 mb-6">/month</div>
            <p className="text-sm text-white/60 mb-6">
              Great for individual creators and small projects.
            </p>

            <ul className="text-sm space-y-2 mb-8 flex-grow">
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Credits per
                month: 1,300
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Number of
                images: 130
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Storage: 5GB
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Retexturing
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Image views
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Image to video
                Conversion
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Generative image
                and video editing
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> High quality
                output
              </li>
            </ul>

            <button
              onClick={() => handlePurchase("basic")}
              style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }}
              className="w-2/3 mx-auto flex justify-center py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide hover:brightness-110 transition-all shadow-[0_4px_15px_rgba(225,195,135,0.3)] mt-4"
            >
              {currentUser ? "Buy Now" : "Login to Purchase"}
            </button>
          </div>

          {/* Premium Plan */}
          <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-[#e6c6b2]/40 shadow-[0_0_20px_rgba(230,198,178,0.15)] rounded-2xl p-6 flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#e6c6b2] to-[#c59854] text-[#1c1613] text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Most Popular</div>
            <h3 className="text-xl font-bold mb-2">Premium Plan</h3>
            <div className="text-3xl font-bold mb-1">₹ 9,349</div>
            <div className="text-sm text-white/50 mb-6">/month</div>
            <p className="text-sm text-white/60 mb-6">
              Unlock full creative potential and advanced tools.
            </p>

            <ul className="text-sm space-y-2 mb-8 flex-grow">
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Credits per
                month: 6,500
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Number of
                images: 650
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Storage: 15GB
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Retexturing
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Image views
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Image to video
                Conversion
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Generative image
                and video editing
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> 4D quality
                output
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Priority email
                support
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Community
                support
              </li>
            </ul>

            <button
              onClick={() => handlePurchase("premium")}
              style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }}
              className="w-2/3 mx-auto flex justify-center py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide hover:brightness-110 transition-all shadow-[0_4px_15px_rgba(225,195,135,0.3)] mt-4"
            >
              {currentUser ? "Buy Now" : "Login to Purchase"}
            </button>
          </div>

          {/* Enterprise */}
          <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-white/10 rounded-2xl p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <div className="text-3xl font-bold mb-1">Customisable</div>
            <div className="text-sm text-white/50 mb-6"></div>
            <p className="text-sm text-white/60 mb-6">
              Unlock full creative potential and advanced tools.
            </p>

            <ul className="text-sm space-y-2 mb-8 flex-grow">
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Custom credits
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Unlimited
                storage
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> All features
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Dedicated
                support
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✔️</span> Custom
                integrations
              </li>
            </ul>

            <button
              onClick={() => {
                toast.info(
                  "Please contact sales@loversai.com for Enterprise plans",
                );
              }}
              style={{ background: "linear-gradient(135deg, #e6c6b2, #c59854)", color: "#1c1613" }}
              className="w-2/3 mx-auto flex justify-center py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide hover:brightness-110 transition-all shadow-[0_4px_15px_rgba(225,195,135,0.3)] mt-4"
            >
              Contact Sales
            </button>
          </div>
        </div>

        {/* Top-Up Pricing Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h3 className="text-3xl font-light text-center mb-8 heading-font text-white">
            Top-Up Pricing
          </h3>
          <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-white/10 rounded-2xl p-8">
            <div className="grid grid-cols-3 gap-4 text-white">
              <div className="text-center font-semibold">Current Plan</div>
              <div className="text-center font-semibold">Number of Credits</div>
              <div className="text-center font-semibold">Price per Credit</div>
            </div>
            <hr className="my-4 border-gray-300" />
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-white/60">
                <div className="text-center">Free</div>
                <div className="text-center">10</div>
                <div className="text-center">₹17.00</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-white/60">
                <div className="text-center">Basic</div>
                <div className="text-center">10</div>
                <div className="text-center">₹13.60</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-white/60">
                <div className="text-center">Premium</div>
                <div className="text-center">10</div>
                <div className="text-center">₹8.50</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Comparison Table */}
        <div className="max-w-6xl mx-auto mb-16">
          <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-5 gap-0">
              {/* Header row */}
              <div className="bg-white/10 p-4 text-white font-semibold">
                Features
              </div>
              <div className="bg-white/10 p-4 text-white font-semibold text-center">
                Free
              </div>
              <div className="bg-white/10 p-4 text-white font-semibold text-center">
                Basic
              </div>
              <div className="bg-white/10 p-4 text-white font-semibold text-center">
                Premium
              </div>
              <div className="bg-white/10 p-4 text-white font-semibold text-center">
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
                  <div className="p-4 border-t border-white/10 text-white">
                    {row[0]}
                  </div>
                  {row.slice(1).map((cell, cellIndex) => (
                    <div
                      key={cellIndex}
                      className="p-4 border-t border-white/10 text-center"
                    >
                      {cell === "✔️" ? (
                        <span className="text-green-500 text-xl">✔️</span>
                      ) : (
                        <span className="text-red-500 text-xl">—</span>
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
  );
};

export default PricingPage;

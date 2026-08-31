import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { paymentAPI } from "../api/api";
import { useAuth } from "../context/AuthContext";

export function useCheckout() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePurchase = async (planKey) => {
    if (planKey === "enterprise") {
      window.location.href = "mailto:support@loversai.com?subject=Enterprise Plan Inquiry";
      return;
    }

    if (!currentUser) {
      sessionStorage.setItem("redirectAfterLogin", "/pricing");
      if (window.confirm("You need to login to purchase a plan. Redirect to login page?")) {
        navigate("/login", { state: { from: "/pricing" } });
      }
      return;
    }

    try {
      setIsProcessing(true);
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        setIsProcessing(false);
        return;
      }

      toast.loading("Initializing payment...", { id: "payment" });
      const orderData = await paymentAPI.createOrder({ planId: planKey });

      if (!orderData.success) {
        throw new Error(orderData.error || orderData.message || "Failed to create order");
      }

      const options = {
        key: orderData.keyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: orderData.amount || orderData.order?.amount,
        currency: orderData.currency || orderData.order?.currency || "INR",
        name: "Lovers AI",
        description: `Subscription to ${planKey.replace("_", " ")}`,
        order_id: orderData.orderId || orderData.order?.id,
        handler: async (response) => {
          try {
            toast.loading("Verifying payment...", { id: "payment" });
            const verifyData = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: planKey,
            });

            if (verifyData.success) {
              toast.success("Payment successful! Your plan has been upgraded.", { id: "payment" });
              // Small delay before redirecting to allow user to see success message
              setTimeout(() => {
                const targetPath = planKey.startsWith("planner") ? "/planner/dashboard" : "/dashboard";
                window.location.href = targetPath;
              }, 1500);
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (err) {
            console.error("Verification error:", err);
            toast.error(err.response?.data?.message || err.message || "Payment verification failed", { id: "payment" });
          }
        },
        prefill: {
          name: currentUser.fullName || currentUser.displayName || "",
          email: currentUser.email || "",
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error(`Payment failed: ${response.error.description}`, { id: "payment" });
      });
      rzp.open();
      toast.dismiss("payment"); // Dismiss loading toast once Razorpay opens
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err.response?.data?.message || err.message || "Something went wrong", { id: "payment" });
    } finally {
      setIsProcessing(false);
    }
  };

  return { handlePurchase, isProcessing };
}

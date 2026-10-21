import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatZodErrors } from "../utils/authValidation";
import { authAPI } from "../api/api";
import toast from "react-hot-toast";

const authBackground = {
  backgroundImage: 'url("/images/auth-wedding-bg.jpg"), url("/images/bridal.png")',
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

export default function VerifyEmail() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown] = useState(60);
  
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  
  const email = location.state?.email || "";
  const requestedRole = location.state?.role || "";
  const name = location.state?.name || "";
  const partnerName = location.state?.partnerName || "";

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (resendDisabled && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, countdown]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.some(isNaN)) return;

    const newOtp = [...otp];
    pastedData.forEach((value, idx) => {
      newOtp[idx] = value;
    });
    setOtp(newOtp);

    const focusIndex = Math.min(pastedData.length, 5);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  };

  const handleResend = async () => {
    try {
      setResendDisabled(true);
      setCountdown(60);
      setError("");
      
      const res = await authAPI.resendOTP({ email });
      if (res.success) {
        toast.success("Verification code resent successfully!");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend code");
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await verifyEmail({ email, otp: otpString });

      if (data.success) {
        toast.success("Email verified successfully!");
        
        // Handle redirect directly based on role, identical to successful login
        const lowerRole = (data.user?.role || requestedRole).toLowerCase();
        
        if (lowerRole === "planner") {
          navigate("/planner/onboarding", { replace: true });
        } else if (lowerRole === "vendor") {
          navigate("/vendor/onboarding", { replace: true });
        } else if (lowerRole === "couple") {
          // Store couple onboarding data if it exists
          if (name && partnerName) {
            localStorage.setItem(
              "lovers-ai-couple-profile",
              JSON.stringify({
                brideName: name,
                groomName: partnerName,
              })
            );
            localStorage.setItem("lovers-ai-couple-profile-step", "1");
          }
          navigate("/couples", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.response?.data?.error || "Invalid verification code.");
      
      // Clear OTP on error for easy retry
      setOtp(["", "", "", "", "", ""]);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-black flex items-center justify-center p-4 relative"
      style={authBackground}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-loverai-gold/20 rounded-full blur-[80px]"></div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-loverai-gold/10 rounded-full blur-[80px]"></div>

          <div className="relative text-center mb-8">
            <h1 className="text-3xl font-light text-white tracking-wide mb-3">
              Verify your email
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-[280px] mx-auto">
              We've sent a 6-digit verification code to <br/>
              <span className="text-loverai-gold font-medium">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="relative z-10 space-y-8">
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  disabled={loading}
                  className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-2xl text-white font-medium focus:outline-none focus:border-loverai-gold focus:ring-1 focus:ring-loverai-gold/50 transition-all disabled:opacity-50"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] p-[1px] group disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="bg-black/40 backdrop-blur-xl rounded-xl px-4 py-3 h-full w-full flex items-center justify-center transition-all group-hover:bg-black/20">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] font-medium tracking-wide">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    "Verify Account"
                  )}
                </span>
              </div>
            </button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <p className="text-white/50 text-sm">
              Didn't receive the code?{" "}
              {resendDisabled ? (
                <span className="text-white/30">
                  Resend in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-loverai-gold hover:text-loverai-gold-bright font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Resend Code
                </button>
              )}
            </p>
            
            <Link
              to="/login"
              className="inline-block mt-4 text-white/40 hover:text-white/70 text-xs transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

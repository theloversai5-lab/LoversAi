import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get("role") || "Couple";
  const mismatch = queryParams.get("mismatch") === "true";

  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const { register, logout, currentUser } = useAuth(); // Assume logout is available if they are already logged in to another role

  // Check if user is already logged in
  useEffect(() => {
    if (currentUser) {
      setIsLoggedIn(true);
      setError("");
    }
  }, [currentUser]);

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);
  const togglePassword = () => setShowPassword((v) => !v);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if ((role === "Planner" || role === "Vendor") && !companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        email: email.trim(),
        password,
        fullName: name.trim(),
        role: role.toLowerCase(),
        partnerName: role === "Couple" ? partnerName.trim() : undefined,
        companyName:
          role === "Planner" || role === "Vendor"
            ? companyName.trim()
            : undefined,
      });

      if (data.success) {
        const lowerRole = role.toLowerCase();
        if (lowerRole === "planner") {
          navigate("/planner/dashboard");
        } else if (lowerRole === "vendor") {
          navigate("/vendor/onboarding");
        } else if (lowerRole === "couple") {
          localStorage.setItem(
            "lovers-ai-couple-profile",
            JSON.stringify({
              brideName: name.trim(),
              groomName: partnerName.trim(),
            }),
          );
          localStorage.setItem("lovers-ai-couple-profile-step", "1");
          navigate("/couple/onboarding");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      const msg =
        err.response?.data?.error || err.message || "Failed to create account.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleConfig = {
    Couple: {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      desc: "Plan your dream wedding",
    },
    Planner: {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      desc: "Manage wedding projects",
    },
    Vendor: {
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      desc: "Showcase your services",
    },
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: `url("/images/signup.png")`,
          filter: "brightness(0.3)",
        }}
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-loverai-deep/60 via-loverai-dark/40 to-loverai-deep/70"></div>

      {/* Ambient glow */}
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-loverai-gold/[0.04] rounded-full blur-[120px] z-[1]"></div>

      <div className="relative z-20 w-full max-w-[460px] px-4 py-10 animate-fadeInUp">
        <div className="glass-card-strong rounded-3xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <img
              src="/images/LogoLoversai.png"
              alt="LoversAI"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-heading loverai-gradient-text tracking-wide mb-2">
              Join LoversAi
            </h1>
            <p className="text-white/40 text-sm">Create your account</p>
          </div>

          {mismatch && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm text-center animate-pulse">
              <p className="font-semibold mb-1">Role Access Denied</p>
              Please create or log into a{" "}
              <span className="text-loverai-gold font-bold">
                {initialRole}
              </span>{" "}
              account to access that dashboard.
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {isLoggedIn ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-blue-200 text-sm mb-2">
                  You are already logged in. To create an account as a different
                  role, please logout first.
                </p>
                <p className="text-white/60 text-xs mb-4">
                  Current role:{" "}
                  <span className="text-loverai-gold font-semibold capitalize">
                    {localStorage.getItem("userRole")}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/", { replace: true });
                  }}
                  className="w-full loverai-btn-primary text-sm"
                >
                  Logout and Return to Home
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Role Selector */}
              <div className="flex gap-3 mb-8">
                {["Couple", "Planner", "Vendor"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setError("");
                    }}
                    className={`flex-1 flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-300 ${
                      role === r
                        ? "glass-card border-loverai-gold/30 shadow-lg"
                        : "glass-card-subtle hover:bg-white/[0.06]"
                    }`}
                  >
                    <div
                      className={`mb-2 transition-colors ${role === r ? "text-loverai-gold" : "text-white/40"}`}
                    >
                      {roleConfig[r].icon}
                    </div>
                    <span
                      className={`text-[13px] font-semibold transition-colors ${role === r ? "text-loverai-gold" : "text-white/50"}`}
                    >
                      {r}
                    </span>
                    <span
                      className={`text-[10px] mt-0.5 transition-colors ${role === r ? "text-white/50" : "text-white/25"}`}
                    >
                      {roleConfig[r].desc}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg
                        className="w-5 h-5 text-white/25"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full glass-input rounded-xl pl-11 pr-4 py-3.5 text-sm"
                    />
                  </div>
                </div>

                {role === "Couple" && (
                  <div className="animate-fadeIn">
                    <label className="block text-white/60 text-[13px] font-medium mb-1.5">
                      Partner's Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-white/25"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Partner's name"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        className="w-full glass-input rounded-xl pl-11 pr-4 py-3.5 text-sm"
                      />
                    </div>
                  </div>
                )}

                {(role === "Planner" || role === "Vendor") && (
                  <div className="animate-fadeIn">
                    <label className="block text-white/60 text-[13px] font-medium mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder={`Your ${role.toLowerCase()} company`}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3.5 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg
                        className="w-5 h-5 text-white/25"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full glass-input rounded-xl pl-11 pr-4 py-3.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg
                        className="w-5 h-5 text-white/25"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full glass-input rounded-xl pl-11 pr-12 py-3.5 text-sm tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={togglePassword}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full loverai-btn-primary !rounded-xl text-[15px] disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </form>

              <div className="text-center mt-6">
                <p className="text-sm text-white/40">
                  Already have an account?{" "}
                  <Link
                    to={`/login${mismatch ? `?role=${initialRole}&mismatch=true` : ""}`}
                    className="text-loverai-gold hover:text-loverai-gold-bright font-medium transition-colors"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

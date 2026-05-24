import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const sharedWeddingBackground = {
  backgroundImage: 'url("/images/auth-wedding-bg.jpg"), url("/images/bridal.png")',
};

export default function Signup() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const requestedRole = queryParams.get("role");
  const normalizedRequestedRole =
    requestedRole?.toLowerCase() === "planner" ? "Planner" : "Couple";
  const initialRole = requestedRole ? normalizedRequestedRole : "Couple";
  const mismatch = queryParams.get("mismatch") === "true";
  const lockedRole = Boolean(requestedRole);
  const isPlannerExperience = initialRole === "Planner";

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
    if (role === "Planner" && !companyName.trim()) {
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
        companyName: role === "Planner" ? companyName.trim() : undefined,
      });

      if (data.success) {
        const lowerRole = role.toLowerCase();
        if (lowerRole === "planner") {
          navigate("/planner/onboarding");
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
  };

  const roleOptions = lockedRole ? [initialRole] : ["Couple", "Planner"];

  const plannerSignupContent = (
    <>
      {mismatch && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Please create or log into a planner account to continue.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isLoggedIn ? (
        <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          <p className="mb-3">
            You are already logged in. To create a planner account with a different profile, logout first.
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/", { replace: true });
            }}
            className="planner-auth-submit"
          >
            Logout and Return to Home
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSignup} className="planner-auth-form">
            <label>Full Name</label>
            <div className="planner-auth-input-wrap">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="planner-auth-input"
              />
            </div>

            <label>Company Name</label>
            <div className="planner-auth-input-wrap">
              <input
                type="text"
                placeholder="Your planner company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="planner-auth-input"
              />
            </div>

            <label>Email</label>
            <div className="planner-auth-input-wrap">
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="planner-auth-input"
              />
            </div>

            <label>Password</label>
            <div className="planner-auth-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="planner-auth-input"
              />
              <button
                type="button"
                onClick={togglePassword}
                className="planner-auth-inline-icon"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.584 10.587a2 2 0 102.829 2.826M9.88 5.09A10.97 10.97 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.916 10.916 0 01-2.287 3.95M6.228 6.228A10.94 10.94 0 002.458 12C3.732 16.057 7.523 19 12 19a10.94 10.94 0 005.772-1.772" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <button type="submit" disabled={loading} className="planner-auth-submit">
              {loading ? "Creating..." : "Sign up"}
            </button>
          </form>

          <div className="planner-auth-divider">
            <span>or</span>
          </div>

          <button className="planner-auth-google" type="button">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div className="planner-auth-switch">
            Already have an account? <Link to="/login?role=planner">Sign in</Link>
          </div>
        </>
      )}
    </>
  );

  return (
    isPlannerExperience ? (
      <div className="planner-auth-shell">
        <div className="planner-auth-frame animate-fadeInUp">
          <div className="planner-auth-nav">
            <div className="planner-auth-nav-links">
              <button type="button" onClick={() => navigate("/planner")} className="planner-auth-nav-link">Home</button>
              <button type="button" onClick={() => navigate("/couples")} className="planner-auth-nav-link">Couples</button>
              <button type="button" onClick={() => navigate("/planner")} className="planner-auth-nav-link">Planner</button>
              <button type="button" onClick={() => navigate("/pricing")} className="planner-auth-nav-link">Features</button>
            </div>
            <button type="button" onClick={() => navigate("/login?role=planner")} className="planner-auth-nav-cta">
              Sign In
            </button>
          </div>

          <div className="planner-auth-grid">
            <div className="planner-auth-copy">
              <h1>Sign up</h1>
              <p>Create your planner account to manage projects and access your workspace.</p>
              {plannerSignupContent}
            </div>

            <div className="planner-auth-visual">
              <img src="/images/bridal.png" alt="Planner signup visual" />
            </div>
          </div>
        </div>
      </div>
    ) : (
    <div className="loverai-wedding-shell min-h-screen flex items-center justify-center">
      <div className="loverai-wedding-bg" style={sharedWeddingBackground} />
      <div className="loverai-wedding-overlay" />
      <div className="loverai-wedding-glow loverai-wedding-glow-left" />
      <div className="loverai-wedding-glow loverai-wedding-glow-right" />

      <div className="relative z-20 w-full max-w-[460px] px-4 py-10 animate-fadeInUp">
        <div className="glass-card-strong loverai-auth-panel rounded-3xl p-8">
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
              <div className={`grid gap-3 mb-8 ${roleOptions.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {roleOptions.map((r) => (
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

                {role === "Planner" && (
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
    )
  );
}

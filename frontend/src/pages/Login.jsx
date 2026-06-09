// pages/Login.jsx - Custom JWT Login with Google OAuth
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase/firebase";
import PlannerQuickMenu from "../components/PlannerQuickMenu";
import { authLoginSchema, formatZodErrors } from "../utils/authValidation";

const plannerWeddingBackground = {
  backgroundImage: 'url("/images/auth-wedding-bg.jpg"), url("/images/bridal.png")',
};

const coupleWeddingBackground = {
  backgroundImage: 'url("/images/signup.png")',
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, firebaseLogin, currentUser, logout } = useAuth();

  useEffect(() => {
    if (currentUser) {
      setIsLoggedIn(true);
      setError("");
    }
  }, [currentUser]);

  const queryParams = new URLSearchParams(location.search);
  const targetRole = queryParams.get("role") || "";
  const mismatch = queryParams.get("mismatch") === "true";
  const isCoupleExperience =
    targetRole.toLowerCase() === "couple" ||
    fromStartsWithCouple(location.state?.from) ||
    fromStartsWithCouple(sessionStorage.getItem("redirectAfterLogin"));
  const isPlannerExperience =
    targetRole.toLowerCase() === "planner" ||
    (typeof location.state?.from === "string" &&
      location.state.from.startsWith("/planner")) ||
    (typeof sessionStorage.getItem("redirectAfterLogin") === "string" &&
      sessionStorage.getItem("redirectAfterLogin").startsWith("/planner"));

  const from =
    location.state?.from || sessionStorage.getItem("redirectAfterLogin") || "/";
  const togglePassword = () => setShowPassword((v) => !v);

  function fromStartsWithCouple(path) {
    return typeof path === "string" &&
      (path.startsWith("/couple") || path.startsWith("/love-story"));
  }

  const getCoupleNextPath = (user) => {
    return "/couples";
  };


  const getPlannerNextPath = () => {
    if (
      typeof from === "string" &&
      (from === "/planner-ai-tools" || from.startsWith("/planner/"))
    ) {
      return from;
    }
    return "/planner";
  };

  const getSignupRole = () => {
    if (targetRole) return targetRole;
    if (
      typeof from === "string" &&
      (from.startsWith("/couple") || from.startsWith("/love-story"))
    ) {
      return "couple";
    }
    if (typeof from === "string" && from.startsWith("/planner")) {
      return "planner";
    }
    return "";
  };

  const getVendorNextPath = () => {
    if (typeof from === "string" && from.startsWith("/vendor/")) {
      return from;
    }
    return "/vendor/dashboard";
  };

  const handleRedirectByRole = (user) => {
    const rawRole = user?.role || localStorage.getItem("userRole") || "";
    const role = rawRole.toLowerCase();

    if (role === "planner") {
      navigate(getPlannerNextPath(), { replace: true });
    } else if (role === "vendor") {
      navigate(getVendorNextPath(), { replace: true });
    } else if (role === "couple") {
      navigate(getCoupleNextPath(user), { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const validation = authLoginSchema.safeParse({ email, password });

    if (!validation.success) {
      setError(formatZodErrors(validation.error));
      return;
    }

    setLoading(true);
    try {
      const data = await login(validation.data.email, validation.data.password);

      if (data.success) {
        sessionStorage.removeItem("redirectAfterLogin");

        const actualRole = (data.user?.role || localStorage.getItem("userRole") || "").toLowerCase();
        const expectedRole = targetRole ? targetRole.toLowerCase() : "";

        console.log("Login Role Check:", {
          targetRole,
          actualRole,
          expectedRole,
          mismatch,
          hasTargetRole: !!targetRole,
          rolesMatch: !expectedRole || actualRole === expectedRole,
          shouldBlock: !!expectedRole && actualRole !== expectedRole,
        });

        if (expectedRole && actualRole !== expectedRole) {
          console.error("Role mismatch detected. Blocking login.");
          setError(
            `Invalid credentials for this section. Please log in with a ${expectedRole} account. Your account is registered as ${actualRole}.`,
          );
          await logout();
          return;
        }

        handleRedirectByRole(data.user);
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg =
        err.response?.data?.error || err.message || "Failed to login.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const firebaseIdToken = await result.user.getIdToken();

      if (!firebaseIdToken) {
        throw new Error("Firebase did not return a sign-in credential. Please try again.");
      }

      const data = await firebaseLogin(firebaseIdToken, targetRole || "couple");

      if (!data.success) {
        return;
      }

      sessionStorage.removeItem("redirectAfterLogin");

      const actualRole = (data.user?.role || localStorage.getItem("userRole") || "").toLowerCase();
      const expectedRole = targetRole.toLowerCase();

      console.log("Google Login Role Check:", {
        targetRole,
        actualRole,
        expectedRole,
        mismatch,
        shouldEnforce: !!targetRole && actualRole !== expectedRole,
      });

      if (targetRole && actualRole !== expectedRole) {
        setError(
          `Invalid credentials for this section. Please log in with a ${expectedRole} account. This Google account is registered as ${actualRole}.`,
        );
        await logout();
        return;
      }

      handleRedirectByRole(data.user);
    } catch (err) {
      console.error("Google auth error:", err);
      setError(err.response?.data?.error || err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const authContent = (
    <>
      {mismatch && targetRole && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm text-center animate-pulse">
          <p className="font-semibold mb-1">Role Access Denied</p>
          Please log into a{" "}
          <span className="text-loverai-gold font-bold">{targetRole}</span>{" "}
          account to access that dashboard.
        </div>
      )}

      {error && (
        <div className="mb-6 glass-card rounded-lg px-4 py-3 border-red-500/20 bg-red-500/10">
          <p className="font-medium text-red-400 text-sm">Error</p>
          <p className="text-sm mt-1 text-red-300/80">{error}</p>
        </div>
      )}

      {isLoggedIn ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-blue-200 text-sm mb-2">
              You are already logged in. To access a different role, please
              logout first.
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
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                {isCoupleExperience ? "Email" : "Email Address"}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 glass-input rounded-xl text-white text-sm ${isCoupleExperience ? "bg-white/[0.03] border-white/10 h-12" : ""}`}
                placeholder={isCoupleExperience ? "you@lovers.ai" : "you@example.com"}
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-white/70">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-loverai-gold/70 hover:text-loverai-gold transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 glass-input rounded-xl text-white text-sm pr-14 ${isCoupleExperience ? "bg-white/[0.03] border-white/10 h-12" : ""}`}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors text-sm"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 bg-white/5 border border-white/10 rounded focus:ring-loverai-gold/50 text-loverai-gold"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-white/50"
              >
                {isCoupleExperience
                  ? "Keep me signed in on this device"
                  : "Remember me"}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full loverai-btn-primary text-[15px] ${isCoupleExperience ? "!rounded-2xl !py-3.5" : "!rounded-xl"}`}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-transparent text-white/40">
                Or continue with
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={`w-full py-3 px-4 glass-card text-white font-medium hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-3 text-sm ${isCoupleExperience ? "rounded-2xl" : "rounded-xl"}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Continue with Google
          </button>

              <div className="text-center mt-6">
                <p className="text-white/50 text-sm">
                  Don't have an account?{" "}
                  <Link
                    to={`/signup${getSignupRole() ? `?role=${getSignupRole()}${mismatch ? "&mismatch=true" : ""}` : ""}`}
                    className="text-loverai-gold hover:text-loverai-gold-bright font-medium transition-colors"
                  >
                    Sign Up
                  </Link>
            </p>
          </div>

          <div className="text-center mt-4">
            <p className="text-xs text-white/30">
              By signing in, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </>
      )}
    </>
  );

  const plannerAuthContent = (
    <>
      {mismatch && targetRole && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Please log into a planner account to continue.
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
            You are already logged in. To use a different role, logout first.
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
          <form onSubmit={handleLogin} className="planner-auth-form">
            <label>Email</label>
            <div className="planner-auth-input-wrap">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="planner-auth-input"
                placeholder="jonsakahnwalda@gmail.com"
                disabled={loading}
              />
            </div>

            <label>Password</label>
            <div className="planner-auth-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="planner-auth-input"
                placeholder="Password"
                disabled={loading}
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

            <label className="planner-auth-check">
              <input type="checkbox" />
              <span className="planner-auth-checkmark"></span>
              Keep me logged in
            </label>

            <button type="submit" disabled={loading} className="planner-auth-submit">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="planner-auth-divider">
            <span>or</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="planner-auth-google"
          >
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
            <span>Sign in with Google</span>
          </button>

          <div className="planner-auth-switch">
            Need an account?{" "}
            <Link to="/signup?role=planner">Create one</Link>
          </div>
        </>
      )}
    </>
  );

  return (
    isPlannerExperience ? (
      <div className="planner-auth-shell">
        <div className="planner-auth-frame animate-fadeInUp">
          <div className="mb-10 flex items-start justify-between gap-6">
            <div /> {/* Spacer to keep QuickMenu on the right */}
            <PlannerQuickMenu className="relative z-40" />
          </div>

          <div className="planner-auth-grid">
            <div className="planner-auth-copy">
              <h1>Sign in</h1>
              <p>Please login to continue to your account.</p>
              {plannerAuthContent}
            </div>

            <div className="planner-auth-visual">
              <img src="/images/bridal.png" alt="Planner auth visual" />
            </div>
          </div>
        </div>
      </div>
    ) : (
    <div className="loverai-wedding-shell w-full min-h-screen flex items-center justify-center">
      <div className="loverai-wedding-bg" style={isCoupleExperience ? coupleWeddingBackground : plannerWeddingBackground} />
      <div className="loverai-wedding-overlay" />
      <div className="loverai-wedding-glow loverai-wedding-glow-left" />
      <div className="loverai-wedding-glow loverai-wedding-glow-right" />

      <div className={`relative z-20 w-full px-4 md:px-6 py-8 animate-fadeInUp ${isCoupleExperience ? "max-w-6xl" : "max-w-md"}`}>
        <div className={`glass-card-strong loverai-auth-panel overflow-hidden ${isCoupleExperience ? "rounded-[34px]" : "rounded-3xl p-8"}`}>
          {isCoupleExperience ? (
            <div className="grid min-h-[620px] md:grid-cols-[1.1fr_0.92fr]">
              <div className="relative flex flex-col justify-end p-8 md:p-10 lg:p-12 border-b md:border-b-0 md:border-r border-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent pointer-events-none" />
                <div className="relative z-10 max-w-xl">
                  <p className="text-[11px] uppercase tracking-[0.38em] text-white/60 mb-5">
                    Lovers AI
                  </p>
                  <h1 className="font-heading text-[42px] leading-[0.95] md:text-[56px] text-[#fff5ea]">
                    Welcome back to your wedding story
                  </h1>
                  <p className="mt-5 text-base md:text-lg text-white/65 max-w-md leading-7">
                    Sign in to continue planning your celebration with your saved account and protected wedding profile.
                  </p>
                </div>
              </div>

              <div className="p-8 md:p-10 lg:p-12 flex items-center">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-8">
                    <img
                      src="/images/LogoLoversai.png"
                      alt="LoversAI"
                      className="h-12 w-auto object-contain"
                    />
                    <div>
                      <p className="text-white/85 font-medium">Sign In</p>
                      <p className="text-xs text-white/45">Access your couple workspace</p>
                    </div>
                  </div>
                  {authContent}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <img
                  src="/images/LogoLoversai.png"
                  alt="LoversAI"
                  className="h-14 w-auto object-contain"
                />
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-heading loverai-gradient-text">
                  Welcome Back
                </h1>
                <p className="text-sm text-white/50 mt-2">
                  Sign in to continue your journey with us
                </p>
              </div>
              {authContent}
            </>
          )}
        </div>
      </div>
    </div>
    )
  );
};

export default Login;

// pages/Login.jsx — Custom JWT Login with Google OAuth
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, currentUser, logout } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    if (currentUser) {
      setIsLoggedIn(true);
      setError("");
    }
  }, [currentUser]);

  const queryParams = new URLSearchParams(location.search);
  const targetRole = queryParams.get("role") || "";
  const mismatch = queryParams.get("mismatch") === "true";

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const from =
    location.state?.from || sessionStorage.getItem("redirectAfterLogin") || "/";
  const togglePassword = () => setShowPassword((v) => !v);

  const getCoupleNextPath = (user) => {
    const weddingProfile = user?.weddingProfile || {};
    return user?.profileCompleted || weddingProfile.completed
      ? "/couple/moodboard"
      : "/couple/onboarding";
  };

  const handleRedirectByRole = (user) => {
    const rawRole = user?.role || localStorage.getItem("userRole") || "";
    const role = rawRole.toLowerCase();
    
    // Route users to their role-specific main page, not directly to dashboard
    if (role === "planner") {
      navigate("/planner/dashboard");
    } else if (role === "vendor") {
      navigate("/vendor/dashboard"); // Vendor goes to dashboard (no main page yet)
    } else if (role === "couple") {
      navigate(getCoupleNextPath(user));
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password);

      if (data.success) {
        sessionStorage.removeItem("redirectAfterLogin");

        // Check if user's role matches the target role from URL or referrer
        const actualRole = (data.user?.role || localStorage.getItem("userRole") || "").toLowerCase();
        const expectedRole = targetRole ? targetRole.toLowerCase() : "";
        
        console.log('🔐 Login Role Check:', {
          targetRole,
          actualRole,
          expectedRole,
          mismatch,
          hasTargetRole: !!targetRole,
          rolesMatch: !expectedRole || actualRole === expectedRole,
          shouldBlock: !!expectedRole && actualRole !== expectedRole
        });
        
        // If coming from a role-specific page, enforce role matching
        if (expectedRole && actualRole !== expectedRole) {
          console.error('❌ Role mismatch detected! Blocking login.');
          setError(
            `Invalid credentials for this section. Please log in with a ${expectedRole} account. Your account is registered as ${actualRole}.`,
          );
          // Log them out since they're on the wrong role
          await logout();
          return;
        }

        console.log('✅ Role check passed, redirecting...');
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
    if (!GOOGLE_CLIENT_ID) {
      setError(
        "Google Sign-In is not configured yet. Please use email/password.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const google = window.google;
      if (!google?.accounts?.id) {
        setError("Google Sign-In SDK not loaded. Please try again.");
        setLoading(false);
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const data = await googleLogin(response.credential);

            if (data.success) {
              sessionStorage.removeItem("redirectAfterLogin");

              const actualRole = (data.user?.role || localStorage.getItem("userRole") || "").toLowerCase();
              const expectedRole = targetRole.toLowerCase();
              
              console.log('🔐 Google Login Role Check:', {
                targetRole,
                actualRole,
                expectedRole,
                mismatch,
                shouldEnforce: !!targetRole && actualRole !== expectedRole
              });
              
              // If coming from a role-specific page, enforce role matching
              if (targetRole && actualRole !== expectedRole) {
                setError(
                  `Invalid credentials for this section. Please log in with a ${expectedRole} account. This Google account is registered as ${actualRole}.`,
                );
                await logout();
                return;
              }

              handleRedirectByRole(data.user);
            }
          } catch (err) {
            console.error("Google auth error:", err);
            setError(err.response?.data?.error || "Google sign-in failed.");
          } finally {
            setLoading(false);
          }
        },
      });

      google.accounts.id.prompt();
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Failed to initialize Google Sign-In.");
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: `url("./images/bridal.png")`,
          filter: "brightness(0.35)",
        }}
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-loverai-deep/60 via-loverai-dark/40 to-loverai-deep/70"></div>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-loverai-gold/[0.04] rounded-full blur-[120px] z-[1]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-amber-700/[0.05] rounded-full blur-[100px] z-[1]"></div>

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-md px-6 py-10 animate-fadeInUp">
        <div className="glass-card-strong rounded-3xl p-8">
          {/* Logo */}
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

          {mismatch && targetRole && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm text-center animate-pulse">
              <p className="font-semibold mb-1">Role Access Denied</p>
              Please log into a{" "}
              <span className="text-loverai-gold font-bold">
                {targetRole}
              </span>{" "}
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-white text-sm"
                    placeholder="you@example.com"
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
                      className="w-full px-4 py-3 glass-input rounded-xl text-white text-sm pr-14"
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
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full loverai-btn-primary !rounded-xl text-[15px]"
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
                className="w-full py-3 px-4 glass-card text-white font-medium rounded-xl hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-3 text-sm"
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
                    to={`/signup${mismatch && targetRole ? `?role=${targetRole}&mismatch=true` : ""}`}
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
        </div>
      </div>
    </div>
  );
};

export default Login;

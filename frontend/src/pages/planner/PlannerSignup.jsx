import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";

export default function PlannerSignup() {
  const navigate = useNavigate();
  const { firebaseLogin, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setError("");

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      if (!idToken) throw new Error("Failed to retrieve Firebase token");

      const data = await firebaseLogin(idToken, "planner");
      if (data.success) {
        navigate("/planner/onboarding");
      } else {
        setError(data.error || "Failed to sign up with Google");
      }
    } catch (err) {
      console.error("Planner Google signup error:", err);
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (
      !name.trim() ||
      !companyName.trim() ||
      !email.trim() ||
      password.length < 6
    ) {
      setError("Please complete all fields and ensure password is >= 6 chars");
      return;
    }

    try {
      setLoading(true);
      const data = await register({
        email: email.trim(),
        password,
        fullName: name.trim(),
        role: "planner",
        companyName: companyName.trim(),
      });

      if (data.success) {
        navigate("/planner/onboarding");
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err) {
      console.error("Planner signup error:", err);
      setError(err.response?.data?.error || err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0c0a] text-white">
      <div className="w-full max-w-md p-8">
        <div className="glass-card-strong p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold mb-2">Planner Signup</h2>
          <p className="text-sm text-white/60 mb-6">
            Create your planner account with Google or email
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-600/10 p-3 text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full mb-4 py-3 rounded-xl glass-card flex items-center justify-center gap-3"
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
            <span>{loading ? "Signing in..." : "Sign up with Google"}</span>
          </button>

          <div className="my-4 flex items-center">
            <div className="flex-1 h-px bg-white/6" />
            <div className="px-3 text-sm text-white/50">or</div>
            <div className="flex-1 h-px bg-white/6" />
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-3">
            <label htmlFor="planner-name" className="sr-only">
              Full name
            </label>
            <input
              id="planner-name"
              aria-label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />

            <label htmlFor="planner-company" className="sr-only">
              Company name
            </label>
            <input
              id="planner-company"
              aria-label="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              autoComplete="organization"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />

            <label htmlFor="planner-email" className="sr-only">
              Email address
            </label>
            <input
              id="planner-email"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
              autoComplete="email"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />

            <label htmlFor="planner-password" className="sr-only">
              Password
            </label>
            <input
              id="planner-password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="new-password"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />
            <button
              disabled={loading}
              type="submit"
              className="w-full loverai-btn-primary py-3 rounded-xl text-sm"
            >
              {loading ? "Creating..." : "Create Planner Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

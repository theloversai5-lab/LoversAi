import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { formatZodErrors, plannerSignupSchema } from "../../utils/authValidation";

export default function PlannerSignup() {
  const navigate = useNavigate();
  const { firebaseLogin, register, completeProfile } = useAuth();
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [socialLink, setSocialLink] = useState("");
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
        if (!data.user.phone || !data.user.socialLink) {
          setTempUser(data);
          setNeedsProfileCompletion(true);
          return;
        }

        if (data.isNewUser) {
          navigate("/planner/onboarding");
        } else {
          navigate("/planner");
        }
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

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid contact number.");
      return;
    }
    if (!socialLink.trim()) {
      setError("Please provide a valid LinkedIn or Instagram profile URL.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await completeProfile(phone, socialLink);
      if (res.success) {
        if (tempUser?.isNewUser) {
          navigate("/planner/onboarding");
        } else {
          navigate("/planner");
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError("");

    const validation = plannerSignupSchema.safeParse({
      role: "Planner",
      fullName: name,
      companyName,
      phone,
      socialLink,
      partnerName: "",
      email,
      password,
    });

    if (!validation.success) {
      setError(formatZodErrors(validation.error));
      return;
    }

    try {
      setLoading(true);
      const validated = validation.data;
      const data = await register({
        email: validated.email,
        password: validated.password,
        fullName: validated.fullName,
        phone: validated.phone,
        socialLink: validated.socialLink,
        role: "planner",
        companyName: validated.companyName,
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

  const needsProfileCompletionContent = (
    <div className="flex flex-col items-center justify-center w-full">
      <h2 className="text-2xl font-semibold text-white mb-2">Complete Your Profile</h2>
      <p className="text-sm text-gray-400 mb-8 text-center">
        Please provide your contact details to finish setting up your account.
      </p>

      <form onSubmit={handleCompleteProfile} className="space-y-4 w-full text-left">
        <div>
          <label className="block text-white/60 text-[13px] font-medium mb-1.5">
            Contact Number
          </label>
          <input
            type="tel"
            placeholder="+91 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3.5 text-sm placeholder-white/35 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-white/60 text-[13px] font-medium mb-1.5">
            LinkedIn or Instagram Profile
          </label>
          <input
            type="url"
            placeholder="https://..."
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3.5 text-sm placeholder-white/35 text-white"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0c0a] text-white">
      <div className="w-full max-w-md p-8">
        <div className="glass-card-strong p-6 rounded-2xl">
          {error && (
            <div className="mb-4 rounded-md bg-red-600/10 p-3 text-red-300">
              {error}
            </div>
          )}

          {needsProfileCompletion ? (
            needsProfileCompletionContent
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-2">Planner Signup</h2>
              <p className="text-sm text-white/60 mb-6">
                Create your planner account with Google or email
              </p>

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

            <label htmlFor="planner-phone" className="sr-only">
              Contact Number
            </label>
            <input
              id="planner-phone"
              aria-label="Contact Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />

            <label htmlFor="planner-social" className="sr-only">
              LinkedIn or Instagram Profile
            </label>
            <input
              id="planner-social"
              aria-label="LinkedIn or Instagram Profile"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              placeholder="LinkedIn or Instagram Profile Link"
              type="url"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

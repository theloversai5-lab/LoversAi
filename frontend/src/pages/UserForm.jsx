// pages/UserForm.jsx - Updated to force completion
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userAPI } from "../api/api";

export default function UserForm() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    location: "",
    age: "",
    budget: "",
    position: "",
    interest: "",
    phone: "",
    company_name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forceComplete, setForceComplete] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        // Always force new users to complete profile
        const isNewUser = localStorage.getItem("isNewUser") === "true";

        if (isNewUser) {
          setForceComplete(true);
          // Pre-fill with Firebase data
          setForm((prev) => ({
            ...prev,
            fullName: currentUser.displayName || "",
            phone: currentUser.phoneNumber || "",
          }));
          setLoading(false);
          return;
        }

        // For returning users, check if profile exists
        const data = await userAPI.checkProfile();

        if (data.success) {
          if (!data.exists || !data.profileCompleted) {
            // Force user to complete profile
            setForceComplete(true);

            // Pre-fill with any existing data
            if (data.profile) {
              setForm((prev) => ({
                ...prev,
                fullName:
                  data.profile.fullName || currentUser.displayName || "",
                location: data.profile.location || "",
                age: data.profile.age || "",
                budget: data.profile.budget || "",
                position: data.profile.position || "",
                interest: data.profile.interest || "",
                phone: data.profile.phone || currentUser.phoneNumber || "",
                company_name: data.profile.company_name || "",
              }));
            } else {
              // Pre-fill with Firebase data
              setForm((prev) => ({
                ...prev,
                fullName: currentUser.displayName || "",
                phone: currentUser.phoneNumber || "",
              }));
            }
          } else {
            // Profile already completed - redirect to home
            navigate("/");
          }
        } else {
          // Error - still force completion
          setForceComplete(true);
          setForm((prev) => ({
            ...prev,
            fullName: currentUser.displayName || "",
            phone: currentUser.phoneNumber || "",
          }));
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        // On error, still force completion
        setForceComplete(true);
        setForm((prev) => ({
          ...prev,
          fullName: currentUser.displayName || "",
          phone: currentUser.phoneNumber || "",
        }));
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!currentUser) {
        alert("Please log in first");
        navigate("/login");
        return;
      }

      // Validate form data
      const formData = {
        ...form,
        age: form.age ? parseInt(form.age) : undefined,
        budget: form.budget ? parseInt(form.budget) : undefined,
      };

      const data = await userAPI.saveProfile(formData);

      if (data.success) {
        // Clear flags
        localStorage.removeItem("isNewUser");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("redirectAfterProfile");

        // Show success message
        alert("Profile saved successfully!");

        // Redirect based on user role
        const userRole = localStorage.getItem("userRole");
        if (userRole === "planner") {
          navigate("/planner"); // Planners go to main planner page
        } else if (userRole === "vendor") {
          navigate("/vendor/dashboard"); // Vendors go to their dashboard
        } else {
          navigate("/couple/onboarding"); // Couples continue with wedding details form
        }
      } else {
        throw new Error(data.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Don't allow skipping - force completion
  const handleCancel = () => {
    if (forceComplete) {
      alert("Please complete your profile to continue using Lovers AI.");
      return;
    }
    navigate("/");
  };

  if (loading) {
    return (
      <div className="relative w-full min-h-screen flex items-center justify-center text-gray-900 overflow-hidden bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: `url("./images/bridal.png")`,
            filter: "brightness(0.55)",
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 to-black/50"></div>
        <div className="relative z-20 text-center">
          <div className="text-white text-xl">Loading profile...</div>
          <div className="mt-4 w-12 h-12 border-4 border-rose-200 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center text-gray-900 overflow-hidden bg-black">
      <style>{`
        select {
          color-scheme: dark;
        }
        select option {
          background-color: #1a1a1a;
          color: #ffffff;
        }
        select option:hover {
          background-color: #374151;
        }
        select option:checked {
          background: linear-gradient(#e879f9, #e879f9);
          background-color: #e879f9;
          color: #000000;
        }
      `}</style>
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: `url("./images/bridal.png")`,
          filter: "brightness(0.55)",
        }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 to-black/50"></div>

      {/* Form Card */}
      <div className="relative z-20 w-full max-w-4xl px-4 py-8">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 lg:p-10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold heading-font bg-gradient-to-r from-rose-200 to-pink-200 bg-clip-text text-transparent">
              {forceComplete ? "Complete Your Profile" : "Update Your Profile"}
            </h1>
            <p className="text-sm text-rose-100/80 mt-2">
              {forceComplete
                ? "Please complete your profile to continue using Lovers AI"
                : "Update your information to enhance your experience"}
            </p>

            {/* Warning message for forced completion */}
            {forceComplete && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-xl">
                <p className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  Profile completion required to access all features
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    name="fullName"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white placeholder-rose-200/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <input
                    name="phone"
                    placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white placeholder-rose-200/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Location *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <input
                    name="location"
                    placeholder="City, Country"
                    value={form.location}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white placeholder-rose-200/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition"
                    required
                  />
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Age *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <input
                    name="age"
                    type="number"
                    min="18"
                    max="100"
                    placeholder="e.g., 28"
                    value={form.age}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white placeholder-rose-200/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition"
                    required
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Budget (₹) *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <input
                    name="budget"
                    type="number"
                    placeholder="e.g., 50000"
                    value={form.budget}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white placeholder-rose-200/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition"
                    required
                  />
                </div>
              </div>

              {/* Position/Role */}
              <div>
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Position/Role *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <select
                    name="position"
                    value={form.position}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition appearance-none"
                    required
                    style={{
                      colorScheme: "dark",
                    }}
                  >
                    <option value="">Select your role</option>
                    <option value="Bride">Bride</option>
                    <option value="Groom">Groom</option>
                    <option value="Wedding Planner">Wedding Planner</option>
                    <option value="Event Manager">Event Manager</option>
                    <option value="Photographer">Photographer</option>
                    <option value="Videographer">Videographer</option>
                    <option value="Decorator">Decorator</option>
                    <option value="Caterer">Caterer</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-rose-100/80 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Interests *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                  <select
                    name="interest"
                    value={form.interest}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition appearance-none"
                    required
                    style={{
                      colorScheme: "dark",
                    }}
                  >
                    <option value="">Select your interests</option>
                    <option value="Wedding Decor">Wedding Decor</option>
                    <option value="Photography">Photography</option>
                    <option value="Catering">Catering</option>
                    <option value="Venue Selection">Venue Selection</option>
                    <option value="Bridal Fashion">Bridal Fashion</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Wedding Planning">Wedding Planning</option>
                    <option value="All of the above">All of the above</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-rose-100/80 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-rose-100/80 mb-2">
                  Company Name (Optional)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-100/80">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <input
                    name="company_name"
                    placeholder="Your company or business name"
                    value={form.company_name}
                    onChange={handleInputChange}
                    className="pl-11 pr-4 py-3 w-full rounded-xl bg-white/5 text-white placeholder-rose-200/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-200/40 transition"
                  />
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="pt-6 border-t border-white/10">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-rose-100/60">
                  <p>✓ All fields are required (except company name)</p>
                  <p>✓ Your data will be shown in your profile</p>
                  {forceComplete && (
                    <p className="text-yellow-400">
                      ⚠️ Profile completion is required to continue
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {!forceComplete && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-3 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </span>
                    ) : forceComplete ? (
                      "Complete Profile & Continue"
                    ) : (
                      "Update Profile"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

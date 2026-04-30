import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { vendorAPI, uploadAPI } from "../../api/api";

export default function VendorOnboarding() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    businessName: "",
    category: "",
    location: "",
    shortBio: "",
    phoneNumber: "",
    email: "",
    gstNumber: "",
    experience: "",
    paymentDetails: "",
  });

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        email: currentUser.email || "",
        businessName: currentUser.company_name || "",
        phoneNumber: currentUser.phone || "",
      }));
    }
  }, [currentUser]);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const nextStep = () => {
    // Validate current step
    if (step === 1) {
      if (!formData.businessName.trim()) { setError("Business name is required"); return; }
      if (!formData.category) { setError("Please select a category"); return; }
      if (!formData.location.trim()) { setError("Location is required"); return; }
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const handleLaunch = async () => {
    setSaving(true);
    setError("");
    try {
      const profileData = {
        businessName: formData.businessName.trim(),
        category: formData.category,
        serviceArea: formData.location.trim(),
        about: formData.shortBio.trim(),
        experience: formData.experience.trim(),
        gstNumber: formData.gstNumber.trim(),
        phone: formData.phoneNumber.trim(),
        fullName: currentUser?.fullName || formData.businessName.trim(),
      };

      const result = await vendorAPI.updateProfile(profileData);
      if (result.success) {
        await refreshUser();
        navigate("/vendor/dashboard");
      } else {
        setError(result.error || "Failed to save profile");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    "Decor", "Catering", "Photography", "Venue", "Jewellery",
    "Makeup", "Entertainment", "Florist", "Invitation Cards", "Other",
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-10">
      <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url("/images/planner.png")`, filter: "brightness(0.3)" }} />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-loverai-deep/60 via-loverai-dark/40 to-loverai-deep/70"></div>
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-loverai-gold/[0.04] rounded-full blur-[120px] z-[1]"></div>

      <div className="relative z-20 w-full max-w-[540px] px-6 animate-fadeInUp">
        {/* Progress Bar */}
        <div className="mb-6 mx-2">
          <div className="flex justify-between text-[11px] text-loverai-gold font-semibold mb-2 px-1">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-loverai-gold-bright to-loverai-gold transition-all duration-300 rounded-full" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
          </div>
        </div>

        <div className="glass-card-strong rounded-3xl p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <img src="/images/LogoLoversai.png" alt="LoversAI" className="h-12 w-auto object-contain" />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <h1 className="text-3xl font-heading text-white tracking-wide mb-2 text-center">Business Details</h1>
              <p className="text-white/40 text-[13px] mb-8 text-center">Tell us about your wedding services</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Business Name *</label>
                  <input type="text" placeholder="Your business name" value={formData.businessName} onChange={(e) => updateFormData("businessName", e.target.value)} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm" />
                </div>
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Category *</label>
                  <select value={formData.category} onChange={(e) => updateFormData("category", e.target.value)} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm appearance-none cursor-pointer" style={{ color: formData.category ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                    <option value="" disabled className="bg-loverai-surface">Select category</option>
                    {categories.map((cat) => (<option key={cat} value={cat} className="bg-loverai-surface text-white">{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Service Area / Location *</label>
                  <input type="text" placeholder="City, State" value={formData.location} onChange={(e) => updateFormData("location", e.target.value)} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm" />
                </div>
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Years of Experience</label>
                  <input type="text" placeholder="e.g. 5 years" value={formData.experience} onChange={(e) => updateFormData("experience", e.target.value)} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <h1 className="text-3xl font-heading text-white tracking-wide mb-2 text-center">Brand Identity</h1>
              <p className="text-white/40 text-[13px] mb-8 text-center">Tell your story and add credentials</p>
              <div className="space-y-6">
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Short Bio</label>
                  <textarea rows={4} placeholder="Tell couples why they should choose you..." value={formData.shortBio} onChange={(e) => updateFormData("shortBio", e.target.value.substring(0, 300))} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm resize-none" />
                  <div className="text-[11px] text-white/30 mt-1.5 text-right">{formData.shortBio.length}/300</div>
                </div>
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">GST Number (optional)</label>
                  <input type="text" placeholder="e.g. 27AAPFU0939F1ZV" value={formData.gstNumber} onChange={(e) => updateFormData("gstNumber", e.target.value.toUpperCase())} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm" maxLength={15} />
                  {formData.gstNumber && formData.gstNumber.length !== 15 && (
                    <p className="text-amber-400/70 text-[11px] mt-1">GST number should be 15 characters</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="animate-fadeIn">
              <h1 className="text-3xl font-heading text-white tracking-wide mb-2 text-center">Contact & Payment</h1>
              <p className="text-white/40 text-[13px] mb-8 text-center">How can planners and couples reach you?</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Phone Number</label>
                  <input type="text" placeholder="+91 98765 43210" value={formData.phoneNumber} onChange={(e) => updateFormData("phoneNumber", e.target.value)} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm" />
                </div>
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Email (auto-filled)</label>
                  <input type="email" value={formData.email} disabled className="w-full bg-black/20 text-white/40 rounded-xl px-4 py-3.5 focus:outline-none border border-transparent text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-white/60 text-[13px] font-medium mb-1.5">Payment Details (optional)</label>
                  <textarea rows={3} placeholder="Bank account / UPI details (can be added later)" value={formData.paymentDetails} onChange={(e) => updateFormData("paymentDetails", e.target.value)} className="w-full glass-input rounded-xl px-4 py-3.5 text-sm resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
            <button onClick={prevStep} className={`flex items-center gap-2 text-sm font-medium transition ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-white/40 hover:text-white'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              <span>Back</span>
            </button>
            {step < totalSteps ? (
              <button onClick={nextStep} className="loverai-btn-primary !py-2.5 flex items-center gap-2">
                <span>Continue</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            ) : (
              <button onClick={handleLaunch} disabled={saving} className="loverai-btn-primary !py-2.5 flex items-center gap-2 disabled:opacity-50">
                <span>{saving ? 'Saving...' : 'Launch Dashboard'}</span>
                {!saving && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

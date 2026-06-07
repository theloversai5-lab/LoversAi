import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../api/api";

const PROFILE_STORAGE_KEY = "lovers-ai-couple-profile";
const PROFILE_STEP_KEY = "lovers-ai-couple-profile-step";
const TOTAL_STEPS = 8;

const initialFormData = {
  brideName: "",
  groomName: "",
  brideAge: "",
  groomAge: "",
  budget: "",
  religion: "",
  weddingDate: null,
  dateNotDecided: false,
  guestCount: "",
  city: "",
  dreamVenue: "",
};

const budgetOptions = [
  "5-15 Lakh",
  "15-25 Lakh",
  "25-45 Lakh",
  "45-70 Lakh",
  "70 Lakh+",
];

const religionOptions = ["Hindu", "Muslim", "Christian", "Sikh", "Jain"];
const guestOptions = ["0-100", "200-500", "500-1000", "1000+"];

const serif = { fontFamily: "'Cormorant Garamond', serif" };

const stepVariants = {
  initial: (direction) => ({
    opacity: 0,
    x: direction >= 0 ? 48 : -48,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction >= 0 ? -48 : 48,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  }),
};

export default function CoupleProfileForm() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) return initialFormData;
    try {
      return { ...initialFormData, ...JSON.parse(saved) };
    } catch {
      return initialFormData;
    }
  });

  const [step, setStep] = useState(() => {
    const savedStep = Number(localStorage.getItem(PROFILE_STEP_KEY));
    return Number.isNaN(savedStep) || savedStep < 1 ? 1 : savedStep;
  });

  const [direction, setDirection] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverMessage, setServerMessage] = useState("");

  const [dateInput, setDateInput] = useState(() => {
    if (!formData.weddingDate) return { dd: "", mm: "", yy: "" };
    const [yyyy = "", mm = "", dd = ""] = formData.weddingDate.split("-");
    return { dd, mm, yy: yyyy.slice(-2) };
  });

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem(
      PROFILE_STEP_KEY,
      String(isComplete ? TOTAL_STEPS + 1 : step),
    );
  }, [isComplete, step]);

  if (!currentUser) {
    navigate("/login", { state: { from: "/couple/onboarding" } });
    return null;
  }

  const goToStep = (nextStep, nextDirection = 1) => {
    setDirection(nextDirection);
    setIsComplete(false);
    setStep(nextStep);
  };

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionSelect = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNamesNext = () => {
    if (
      !formData.brideName.trim() ||
      !formData.groomName.trim() ||
      !formData.brideAge.trim() ||
      !formData.groomAge.trim()
    )
      return;
    goToStep(3, 1);
  };

  const handleDatePartChange = (part, value) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 2);
    const nextDate = { ...dateInput, [part]: numericValue };
    const hasCompleteDate = nextDate.dd && nextDate.mm && nextDate.yy;
    const day = Number(nextDate.dd);
    const month = Number(nextDate.mm);
    const year = Number(`20${nextDate.yy}`);
    const candidateDate = hasCompleteDate
      ? new Date(year, month - 1, day)
      : null;
    const isValidDate =
      !!candidateDate &&
      candidateDate.getFullYear() === year &&
      candidateDate.getMonth() === month - 1 &&
      candidateDate.getDate() === day;

    setDateInput(nextDate);
    setFormData((prev) => ({
      ...prev,
      weddingDate: isValidDate
        ? `20${nextDate.yy}-${nextDate.mm}-${nextDate.dd}`
        : null,
      dateNotDecided: false,
    }));
  };

  const handleDateUndecided = () => {
    setDateInput({ dd: "", mm: "", yy: "" });
    setFormData((prev) => ({
      ...prev,
      weddingDate: null,
      dateNotDecided: true,
    }));
    goToStep(6, 1);
  };

  const handleBack = () => {
    if (isComplete) {
      setDirection(-1);
      setIsComplete(false);
      setStep(TOTAL_STEPS);
      return;
    }
    setDirection(-1);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = async () => {
    setServerError("");
    setServerMessage("");
    setIsSaving(true);
    try {
      await userAPI.saveWeddingProfile({
        partnerName1: formData.brideName,
        partnerName2: formData.groomName,
        budget: formData.budget,
        tradition: formData.religion,
        weddingDate: formData.weddingDate,
        guestCount: formData.guestCount,
        city: formData.city,
        venue: formData.dreamVenue,
        dreamVenue: formData.dreamVenue,
      });
      await refreshUser();
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(PROFILE_STEP_KEY);
      localStorage.removeItem("isNewUser");
      navigate("/love-story");
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setServerError(
          "Your session expired. Please log in again to save your profile. Your progress is saved locally."
        );
      } else {
        setServerError(
          error?.response?.data?.error ||
          error?.message ||
          "We couldn't save your profile. Please try again."
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const progressPct = isComplete
    ? 100
    : Math.round(((step - 1) / TOTAL_STEPS) * 100);

  const renderStepContent = () => {
    /* ── COMPLETION ── */
    if (isComplete) {
      return (
        <div className="flex flex-col items-center justify-center text-center w-full py-6 md:py-10">
          <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-4">
            VISION READY ✨
          </span>
          <h2 style={serif} className="text-3xl md:text-4xl lg:text-[40px] font-light text-white leading-tight mb-6">
            Your wedding story is set
          </h2>
          <p className="text-white/65 text-base md:text-lg max-w-md mx-auto leading-relaxed mb-10">
            Save your profile to the cloud so your vision loads everywhere you sign in.
          </p>

          {serverMessage && (
            <div className="my-6 p-5 rounded-2xl bg-white/5 border border-white/10 text-white text-base leading-relaxed w-full max-w-md backdrop-blur-md">
              {serverMessage}
              <button
                className="mt-4 w-full py-4 rounded-2xl text-base font-bold uppercase tracking-widest bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#1c1613] hover:brightness-110 shadow-lg shadow-[#d4a878]/10 transition-all active:scale-95 cursor-pointer"
                onClick={() => navigate("/love-story")}
              >
                Continue to GenAI Vision
              </button>
            </div>
          )}
          {serverError && (
            <div className="my-6 flex flex-col gap-3 w-full max-w-md mx-auto">
              <p className="text-red-400 text-sm font-semibold text-center rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3">
                {serverError}
              </p>
              {serverError.includes("session expired") && (
                <button
                  style={{
                    background: "linear-gradient(90deg, #e6c6b2, #d4a878)",
                    color: "#1c1613",
                  }}
                  className="w-full py-4 rounded-2xl text-base font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#d4a878]/10 transition-all active:scale-95 cursor-pointer"
                  onClick={() =>
                    navigate("/login", { state: { from: "/couple/onboarding" } })
                  }
                >
                  Log In Again
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mx-auto mb-8">
            {[
              ["Bride", formData.brideName],
              ["Groom", formData.groomName],
              ["Budget", formData.budget],
              ["Tradition", formData.religion],
              [
                "Date",
                formData.dateNotDecided
                  ? "Not decided"
                  : formData.weddingDate || "—",
              ],
              ["Guests", formData.guestCount],
              ["City", formData.city],
              ["Dream Venue", formData.dreamVenue],
            ].map(([label, val]) => (
              <div key={label} className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col justify-start text-left">
                <span className="text-[13px] uppercase tracking-wider font-semibold text-[#e6c6b2]/70">
                  {label}
                </span>
                <strong className="text-lg text-white font-medium mt-1 truncate">
                  {val || "—"}
                </strong>
              </div>
            ))}
          </div>

          {!serverMessage && (
            <div className="flex justify-center gap-4 w-full max-w-md mx-auto">
              <button
                onClick={handleBack}
                type="button"
                className="px-8 py-4 rounded-2xl text-base font-bold uppercase tracking-widest bg-transparent hover:bg-white/5 border border-white/20 text-white transition-all active:scale-95 flex-1 backdrop-blur-md cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                type="button"
                disabled={isSaving}
                style={{
                  background: "linear-gradient(90deg, #e6c6b2, #d4a878)",
                  color: "#1c1613",
                }}
                className="px-8 py-4 rounded-2xl text-base font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#d4a878]/10 transition-all active:scale-95 flex-[2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          )}
        </div>
      );
    }

    /* ── STEP 1: Welcome ── */
    if (step === 1) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-10 md:py-16 w-full">
          <span className="text-[14px] md:text-[16px] text-[#e6c6b2]/80 font-semibold uppercase tracking-[0.3em] mb-6">
            WELCOME TO YOUR GUIDED SETUP
          </span>
          <h2 style={serif} className="text-4xl md:text-5xl lg:text-[56px] font-light text-white leading-tight mb-8">
            Build your wedding profile
          </h2>
          <p className="text-white/80 text-lg md:text-xl lg:text-[22px] max-w-2xl mx-auto leading-relaxed mb-14 font-light">
            Build a wedding profile that feels intentional from day one. Lovers AI will use these details later to shape your planning, design, and venue suggestions.
          </p>
          <button
            onClick={() => goToStep(2, 1)}
            type="button"
            style={{
              background: "linear-gradient(90deg, #e6c6b2, #d4a878)",
              color: "#1c1613",
            }}
            className="px-14 py-4 rounded-2xl text-base font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#d4a878]/15 transition-all active:scale-95 cursor-pointer"
          >
            Start
          </button>
        </div>
      );
    }

    /* ── STEP 2: Names (Tell us about the two of you) ── */
    if (step === 2) {
      return (
        <div className="flex flex-col items-center w-full py-2 md:py-3">
          <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-2">
            COUPLE DETAILS
          </span>
          <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-1.5 text-center">
            Tell us about the two of you
          </h2>
          <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-5 text-center">
            Add names and ages so the planning experience starts to feel personal.
          </p>

          {/* Inputs Grid */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full max-w-xl mx-auto mb-6">
            <div className="col-span-2 text-left">
              <span className="text-[12px] uppercase tracking-wider text-white/50 mb-1 block font-semibold">Bride Name</span>
              <input
                name="brideName"
                type="text"
                placeholder="Bride's name"
                value={formData.brideName}
                onChange={handleTextChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none"
              />
            </div>
            <div className="col-span-1 text-left">
              <span className="text-[12px] uppercase tracking-wider text-white/50 mb-1 block font-semibold">Bride Age</span>
              <input
                name="brideAge"
                type="text"
                placeholder="Age"
                value={formData.brideAge}
                onChange={handleTextChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none text-center"
              />
            </div>
            <div className="col-span-2 text-left">
              <span className="text-[12px] uppercase tracking-wider text-white/50 mb-1 block font-semibold">Groom Name</span>
              <input
                name="groomName"
                type="text"
                placeholder="Groom's name"
                value={formData.groomName}
                onChange={handleTextChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none"
              />
            </div>
            <div className="col-span-1 text-left">
              <span className="text-[12px] uppercase tracking-wider text-white/50 mb-1 block font-semibold">Groom Age</span>
              <input
                name="groomAge"
                type="text"
                placeholder="Age"
                value={formData.groomAge}
                onChange={handleTextChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none text-center"
              />
            </div>
          </div>

          <div className="flex justify-center gap-4 w-full max-w-sm mx-auto">
            <button
              onClick={handleBack}
              type="button"
              className="px-8 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all flex-1 cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleNamesNext}
              type="button"
              disabled={
                !formData.brideName.trim() ||
                !formData.groomName.trim() ||
                !formData.brideAge.trim() ||
                !formData.groomAge.trim()
              }
              style={
                formData.brideName.trim() &&
                formData.groomName.trim() &&
                formData.brideAge.trim() &&
                formData.groomAge.trim()
                  ? { background: "linear-gradient(90deg, #e6c6b2, #d4a878)", color: "#1c1613" }
                  : {}
              }
              className={`px-8 py-4 rounded-2xl text-base font-bold tracking-wider transition-all active:scale-95 flex-1 ${
                formData.brideName.trim() &&
                formData.groomName.trim() &&
                formData.brideAge.trim() &&
                formData.groomAge.trim()
                  ? "hover:brightness-110 shadow-lg shadow-[#d4a878]/10 cursor-pointer"
                  : "border border-white/10 bg-white/5 text-white/30 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 3: Budget ── */
    if (step === 3) {
      return (
        <div className="flex flex-col items-center w-full py-4 md:py-6">
          <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-3">
            BUDGET
          </span>
          <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-2 text-center">
            What budget are you planning around?
          </h2>
          <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-8 text-center">
            Tap the range that feels closest. We'll save it and move ahead instantly.
          </p>

          {/* Options Grid (3-2 layout matching the mockup) */}
          <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto mb-10">
            <div className="grid grid-cols-3 gap-4">
              {budgetOptions.slice(0, 3).map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    handleOptionSelect("budget", opt);
                    goToStep(4, 1);
                  }}
                  type="button"
                  className={`py-4 px-4 rounded-2xl border text-base font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer text-center backdrop-blur-md ${
                    formData.budget === opt
                      ? "border-[#e6c6b2] bg-[#e6c6b2]/20 text-white shadow-lg shadow-[#e6c6b2]/10"
                      : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-4">
              {budgetOptions.slice(3).map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    handleOptionSelect("budget", opt);
                    goToStep(4, 1);
                  }}
                  type="button"
                  className={`w-[calc(33.33%-11px)] py-4 px-4 rounded-2xl border text-base font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer text-center backdrop-blur-md ${
                    formData.budget === opt
                      ? "border-[#e6c6b2] bg-[#e6c6b2]/20 text-white shadow-lg shadow-[#e6c6b2]/10"
                      : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBack}
            type="button"
            className="px-10 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            Back
          </button>
        </div>
      );
    }

    /* ── STEP 4: Religion ── */
    if (step === 4) {
      return (
        <div className="flex flex-col items-center w-full py-4 md:py-6">
          <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-3">
            TRADITION
          </span>
          <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-2 text-center">
            Which ceremony tradition fits your celebration?
          </h2>
          <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-8 text-center">
            This helps shape rituals, styling, and planning recommendations later.
          </p>

          {/* Options Grid (3-2 layout matching the budget layout) */}
          <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto mb-10">
            <div className="grid grid-cols-3 gap-4">
              {religionOptions.slice(0, 3).map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    handleOptionSelect("religion", opt);
                    goToStep(5, 1);
                  }}
                  type="button"
                  className={`py-4 px-4 rounded-2xl border text-base font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer text-center backdrop-blur-md ${
                    formData.religion === opt
                      ? "border-[#e6c6b2] bg-[#e6c6b2]/20 text-white shadow-lg shadow-[#e6c6b2]/10"
                      : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-4">
              {religionOptions.slice(3).map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    handleOptionSelect("religion", opt);
                    goToStep(5, 1);
                  }}
                  type="button"
                  className={`w-[calc(33.33%-11px)] py-4 px-4 rounded-2xl border text-base font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer text-center backdrop-blur-md ${
                    formData.religion === opt
                      ? "border-[#e6c6b2] bg-[#e6c6b2]/20 text-white shadow-lg shadow-[#e6c6b2]/10"
                      : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBack}
            type="button"
            className="px-10 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            Back
          </button>
        </div>
      );
    }

    /* ── STEP 5: Date ── */
    if (step === 5) {
      return (
        <div className="flex flex-col items-center w-full py-4 md:py-6">
          <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-3">
            WEDDING DATE
          </span>
          <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-2 text-center">
            The day our story becomes official...
          </h2>
          <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-8 text-center">
            Add a tentative date if you have one, or skip for now if the plan is still open.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-10">
            {[
              { part: "dd", label: "DD", placeholder: "DD" },
              { part: "mm", label: "MM", placeholder: "MM" },
              { part: "yy", label: "YY", placeholder: "YY" },
            ].map((f) => (
              <div key={f.part} className="text-center">
                <span className="text-[13px] uppercase tracking-wider text-white/40 mb-1.5 block font-semibold">{f.label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={f.placeholder}
                  value={dateInput[f.part]}
                  onChange={(e) => handleDatePartChange(f.part, e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-base font-semibold text-center text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none shadow-inner"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4 w-full max-w-md mx-auto">
            <button
              onClick={handleBack}
              type="button"
              className="px-8 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 flex-1 cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleDateUndecided}
              type="button"
              className="px-8 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-[#e6c6b2] hover:bg-white/5 active:scale-95 flex-1 cursor-pointer"
            >
              Not Decided
            </button>
            <button
              onClick={() => goToStep(6, 1)}
              type="button"
              disabled={!formData.weddingDate}
              style={
                formData.weddingDate
                  ? { background: "linear-gradient(90deg, #e6c6b2, #d4a878)", color: "#1c1613" }
                  : {}
              }
              className={`px-8 py-4 rounded-2xl text-base font-bold tracking-wider transition-all active:scale-95 flex-1 ${
                formData.weddingDate
                  ? "hover:brightness-110 shadow-lg shadow-[#d4a878]/10 cursor-pointer"
                  : "border border-white/10 bg-white/5 text-white/30 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 6: Guest Count ── */
    if (step === 6) {
      return (
        <div className="flex flex-col items-center w-full py-4 md:py-6">
          <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-3">
            GUEST COUNT
          </span>
          <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-2 text-center">
            How many people do you imagine celebrating with you?
          </h2>
          <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-8 text-center">
            Pick the range that best matches the scale of your day.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto mb-10 w-full">
            {guestOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  handleOptionSelect("guestCount", opt);
                  goToStep(7, 1);
                }}
                type="button"
                className={`py-4 px-4 rounded-2xl border text-base font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer text-center backdrop-blur-md ${
                  formData.guestCount === opt
                    ? "border-[#e6c6b2] bg-[#e6c6b2]/20 text-white shadow-lg shadow-[#e6c6b2]/10"
                    : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={handleBack}
            type="button"
            className="px-10 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            Back
          </button>
        </div>
      );
    }

    /* ── STEP 7: City ── */
    if (step === 7) {
      return (
        <div className="flex flex-col items-center w-full py-4 md:py-6">
          <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-3">
            CITY
          </span>
          <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-2 text-center">
            Where love currently lives...
          </h2>
          <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-8 text-center">
            Add the city or town you're planning from so location-based ideas can follow.
          </p>

          <div className="w-full max-w-sm mx-auto text-left mb-10">
            <span className="text-[13px] uppercase tracking-wider text-white/40 mb-1.5 block font-semibold text-center">City or town</span>
            <input
              name="city"
              type="text"
              placeholder="Mumbai, Jaipur, Goa..."
              value={formData.city}
              onChange={handleTextChange}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-base text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none text-center shadow-inner"
            />
          </div>

          <div className="flex justify-center gap-4 w-full max-w-sm mx-auto">
            <button
              onClick={handleBack}
              type="button"
              className="px-8 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 flex-1 cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => goToStep(8, 1)}
              type="button"
              disabled={!formData.city.trim()}
              style={
                formData.city.trim()
                  ? { background: "linear-gradient(90deg, #e6c6b2, #d4a878)", color: "#1c1613" }
                  : {}
              }
              className={`px-8 py-4 rounded-2xl text-base font-bold tracking-wider transition-all active:scale-95 flex-1 ${
                formData.city.trim()
                  ? "hover:brightness-110 shadow-lg shadow-[#d4a878]/10 cursor-pointer"
                  : "border border-white/10 bg-white/5 text-white/30 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 8: Dream Venue ── */
    return (
      <div className="flex flex-col items-center w-full py-4 md:py-6">
        <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-3">
          DREAM VENUE
        </span>
        <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-2 text-center">
          We dream of saying "I Do" in...
        </h2>
        <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-8 text-center">
          Share the destination or city you imagine for the wedding setting.
        </p>

        <div className="w-full max-w-sm mx-auto text-left mb-10">
          <span className="text-[13px] uppercase tracking-wider text-white/40 mb-1.5 block font-semibold text-center">Destination or city</span>
          <input
            name="dreamVenue"
            type="text"
            placeholder="Udaipur, Lake Como, Tuscany..."
            value={formData.dreamVenue}
            onChange={handleTextChange}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-base text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none text-center shadow-inner"
          />
        </div>

        <div className="flex justify-center gap-4 w-full max-w-sm mx-auto">
          <button
            onClick={handleBack}
            type="button"
            className="px-8 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all flex-1 cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={() => {
              setDirection(1);
              setIsComplete(true);
              setStep(TOTAL_STEPS);
            }}
            type="button"
            disabled={!formData.dreamVenue.trim()}
            style={
              formData.dreamVenue.trim()
                ? { background: "linear-gradient(90deg, #e6c6b2, #d4a878)", color: "#1c1613" }
                : {}
            }
            className={`px-8 py-4 rounded-2xl text-base font-bold tracking-wider transition-all active:scale-95 flex-[2] ${
              formData.dreamVenue.trim()
                ? "hover:brightness-110 shadow-lg shadow-[#d4a878]/10 cursor-pointer"
                : "border border-white/10 bg-white/5 text-white/30 cursor-not-allowed"
            }`}
          >
            Review Story
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen w-screen relative px-4 text-white overflow-y-auto flex justify-center items-center">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-20 scale-105 animate-scaleIn"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%), url('/images/signup.png')",
          backgroundAttachment: "fixed",
        }}
      />

      <section
        style={{
          boxShadow: "0 24px 80px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.15)",
        }}
        className="relative z-10 w-full max-w-[880px] h-[90vh] max-h-[640px] rounded-[32px] bg-white/[0.01] backdrop-blur-[6px] border border-white/10 p-6 md:p-10 flex flex-col justify-between text-center overflow-y-auto"
      >
        {/* Header - only show on steps 2 to 8 */}
        {step > 1 && !isComplete && (
          <div className="w-full flex flex-col items-center relative mb-6">
            <span className="text-[13px] text-white/50 uppercase tracking-[0.3em] font-medium mb-1">
              LOVERS AI
            </span>
            <h2 className="text-2xl md:text-3xl font-light leading-tight text-white text-center" style={serif}>
              Build your wedding profile
            </h2>
            
            <span className="absolute top-0 right-0 border border-white/10 bg-white/5 text-white/75 text-[12px] tracking-wide px-3.5 py-1.5 rounded-full font-medium">
              Step {step - 1} of {TOTAL_STEPS - 1}
            </span>

            {/* Progress bar line */}
            <div className="w-full h-[1.5px] bg-white/10 mt-6 relative">
              <div
                style={{
                  width: `${((step - 2) / (TOTAL_STEPS - 1)) * 100}%`,
                  transition: "width 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                className="absolute top-0 left-0 h-full bg-[#e6c6b2]"
              />
            </div>
          </div>
        )}

        {/* Step content with slide animation */}
        <div className="overflow-y-auto md:overflow-visible flex-1 flex flex-col justify-center py-2">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={isComplete ? "complete" : step}
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full flex flex-col justify-center items-center"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

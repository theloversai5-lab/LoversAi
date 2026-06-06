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

/** 6-col grid: 3 equal boxes top row, 2 centered equal boxes bottom row */
const FIVE_ITEM_COL = ["", "", "", "col-start-2", "col-start-4"];

const optionSelected =
  "border-[#e6c6b2] bg-[#e6c6b2]/15 text-[#e6c6b2] shadow-md shadow-[#e6c6b2]/5";
const optionDefault =
  "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10";

const serif = { fontFamily: "'Cormorant Garamond', serif" };

const s = {
  /* ── shared typography (reference mockups) ── */
  pageTitle:
    "text-[36px] md:text-[46px] lg:text-[50px] font-semibold text-white tracking-wide leading-[1.08] mt-3 mb-0",
  pageBrand:
    "text-sm md:text-base tracking-[0.22em] text-white/55 font-semibold block leading-none uppercase font-sans",
  stepPill:
    "flex-shrink-0 bg-white/5 border border-white/20 rounded-full px-4 md:px-5 py-2 text-sm md:text-base text-white/90 font-medium font-sans",
  stepBlock: "flex flex-col gap-4 md:gap-5 items-center text-center w-full",
  kicker:
    "text-sm md:text-base text-[#e6c6b2]/95 uppercase font-bold tracking-[0.22em] font-sans text-center",
  stepTitle:
    "text-[32px] md:text-[40px] lg:text-[44px] font-semibold text-white tracking-wide leading-[1.12] select-none text-center",
  stepBody:
    "text-lg md:text-xl text-white/82 font-sans leading-[1.65] max-w-3xl select-none text-center mx-auto",
  inputLabel:
    "text-white/80 text-base md:text-lg font-medium mb-2 block tracking-wide select-none text-center w-full",
  textInput:
    "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-xl md:text-2xl font-medium text-white placeholder-white/35 focus:border-white/25 focus:bg-white/10 transition duration-300 outline-none text-center",
  dateInput:
    "w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center text-xl md:text-2xl font-semibold text-white placeholder-white/35 focus:border-[#e6c6b2]/40 focus:bg-white/10 focus:text-[#e6c6b2] transition duration-300 outline-none",
  optionGridFive: "grid grid-cols-6 gap-3 md:gap-3.5 w-full mx-auto max-w-3xl justify-center",
  optionGridFour: "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3.5 w-full mx-auto max-w-3xl justify-center",
  optionBox:
    "col-span-2 w-full min-h-[60px] rounded-2xl border px-4 py-4 text-center text-lg md:text-xl font-semibold tracking-wide transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center",
  optionBoxHalf:
    "w-full min-h-[60px] rounded-2xl border px-4 py-4 text-center text-lg md:text-xl font-semibold tracking-wide transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center",
  primaryBtn:
    "inline-flex items-center justify-center rounded-full bg-[#dfb479] hover:bg-[#d4a568] py-4 px-9 text-lg md:text-xl font-bold text-[#1a0f08] transition-all duration-300 active:scale-95 font-sans shadow-[0_8px_24px_rgba(223,180,121,0.28)] hover:brightness-105 disabled:opacity-50",
  secondaryBtn:
    "rounded-full border border-white/20 bg-white/5 hover:bg-white/10 py-4 px-8 text-lg md:text-xl font-semibold text-white transition-all duration-300 active:scale-95",
  actions: "flex flex-wrap justify-center gap-3 md:gap-4 mt-3 md:mt-4 select-none w-full",
  formGrid:
    "grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 w-full max-w-3xl mx-auto justify-center",
  /* Step 1 welcome */
  introShell:
    "flex flex-col flex-1 justify-center items-center text-center w-full gap-8 md:gap-10 mt-6 md:mt-8",
  introCopy: "flex flex-col items-center text-center gap-4 md:gap-5 w-full",
  introTitle:
    "text-[32px] md:text-[40px] lg:text-[44px] font-semibold text-white tracking-wide leading-[1.12] select-none text-center",
  introBody:
    "text-lg md:text-xl text-white/82 font-sans leading-[1.65] max-w-2xl select-none text-center mx-auto",
  introBtn:
    "px-14 py-4 w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center rounded-full bg-[#dfb479] hover:bg-[#d4a568] text-lg md:text-xl font-bold text-[#1a0f08] transition-all duration-300 active:scale-[0.98] font-sans shadow-[0_10px_32px_rgba(223,180,121,0.28)] hover:brightness-105 cursor-pointer",
};

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
      setServerMessage("Your wedding profile has been saved successfully! ✨");
      navigate("/love-story");
    } catch (error) {
      setServerError(
        error?.message || "We couldn't save your profile. Please try again.",
      );
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
        <div className={s.stepBlock}>
          <p className={s.kicker}>Vision Ready ✨</p>
          <h2 style={serif} className={`${s.stepTitle} mt-0.5`}>
            Your wedding story is set
          </h2>
          <p className={s.stepBody}>
            Save your profile to the cloud so your vision loads everywhere you sign in.
          </p>

          {serverMessage && (
            <div className="mt-4 p-5 rounded-2xl bg-[#89b86b]/10 border border-[#89b86b]/20 text-[#d8efc8] text-lg leading-relaxed">
              {serverMessage}
              <button
                className={`mt-4 w-full ${s.primaryBtn}`}
                onClick={() => navigate("/love-story")}
              >
                Continue to GenAI Vision →
              </button>
            </div>
          )}
          {serverError && (
            <p className="mt-6 text-red-400 text-lg font-semibold">
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1 w-full max-w-3xl mx-auto">
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
              <div key={label} className="p-4 rounded-xl border border-white/10 bg-white/[0.03] flex flex-col justify-start">
                <span className="text-sm md:text-base uppercase tracking-[0.12em] font-bold text-[#e6c6b2]/80">
                  {label}
                </span>
                <strong className="text-xl text-white font-semibold mt-1">
                  {val || "—"}
                </strong>
              </div>
            ))}
          </div>

          {!serverMessage && (
            <div className={s.actions}>
              <button onClick={handleBack} type="button" className={`flex-1 ${s.secondaryBtn}`}>
                Back
              </button>
              <button
                onClick={handleFinish}
                type="button"
                disabled={isSaving}
                className={`flex-[2] ${s.primaryBtn}`}
              >
                {isSaving ? "Saving..." : "Save & Start Your Journey"}
              </button>
            </div>
          )}
        </div>
      );
    }

    /* ── STEP 1: Welcome ── */
    if (step === 1) {
      return (
        <div className={s.introShell}>
          <div className={s.introCopy}>
            <p className={s.kicker}>Welcome to your guided setup</p>
            <h2 style={serif} className={s.introTitle}>
              Let's make your Love Story Official
            </h2>
            <p className={`${s.introBody} mt-3 md:mt-5`}>
              Build a wedding profile that feels intentional from day one. Lovers AI will use these details later to shape your planning, design, and venue suggestions.
            </p>
          </div>
          <button
            onClick={() => goToStep(2, 1)}
            type="button"
            className={`${s.introBtn} mt-6 md:mt-8`}
          >
            Start
          </button>
        </div>
      );
    }

    /* ── STEP 2: Names (Tell us about the two of you) ── */
    if (step === 2) {
      return (
        <div className={s.stepBlock}>
          <p className={s.kicker}>Couple details</p>
          <h2 style={serif} className={s.stepTitle}>
            Tell us about the two of you
          </h2>
          <p className={s.stepBody}>
            Add names and ages so the planning experience starts to feel personal.
          </p>

          <div className={s.formGrid}>
            {[
              {
                label: "Bride Name",
                name: "brideName",
                placeholder: "Bride's name",
              },
              { label: "Bride Age", name: "brideAge", placeholder: "Age" },
              {
                label: "Groom Name",
                name: "groomName",
                placeholder: "Groom's name",
              },
              { label: "Groom Age", name: "groomAge", placeholder: "Age" },
            ].map((f) => (
              <label key={f.name} className="block text-center">
                <span className={s.inputLabel}>{f.label}</span>
                <input
                  name={f.name}
                  type="text"
                  placeholder={f.placeholder}
                  value={formData[f.name]}
                  onChange={handleTextChange}
                  className={s.textInput}
                />
              </label>
            ))}
          </div>

          <div className={s.actions}>
            <button onClick={handleBack} type="button" className={s.secondaryBtn}>
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
              className={s.primaryBtn}
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
        <div className={s.stepBlock}>
          <p className={s.kicker}>Budget</p>
          <h2 style={serif} className={s.stepTitle}>
            What budget are you planning around?
          </h2>
          <p className={s.stepBody}>
            Tap the range that feels closest. We'll save it and move ahead instantly.
          </p>

          <div className={s.optionGridFive}>
            {budgetOptions.map((opt, i) => (
              <button
                key={opt}
                onClick={() => {
                  handleOptionSelect("budget", opt);
                  goToStep(4, 1);
                }}
                type="button"
                className={`${s.optionBox} ${FIVE_ITEM_COL[i]} ${
                  formData.budget === opt ? optionSelected : optionDefault
                }`}
              >
                <span style={optionTitle}>{opt}</span>
                <span style={optionHint}>Select this range</span>
              </button>
            ))}
          </div>

          <div className={s.actions}>
            <button onClick={handleBack} type="button" className={s.secondaryBtn}>
              Back
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 4: Religion ── */
    if (step === 4) {
      return (
        <div className={s.stepBlock}>
          <p className={s.kicker}>Tradition</p>
          <h2 style={serif} className={s.stepTitle}>
            Which ceremony tradition fits your celebration?
          </h2>
          <p className={s.stepBody}>
            This helps shape rituals, styling, and planning recommendations later.
          </p>

          <div className={s.optionGridFive}>
            {religionOptions.map((opt, i) => (
              <button
                key={opt}
                onClick={() => {
                  handleOptionSelect("religion", opt);
                  goToStep(5, 1);
                }}
                type="button"
                className={`${s.optionBox} ${FIVE_ITEM_COL[i]} ${
                  formData.religion === opt ? optionSelected : optionDefault
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className={s.actions}>
            <button onClick={handleBack} type="button" className={s.secondaryBtn}>
              Back
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 5: Date ── */
    if (step === 5) {
      return (
        <div className={s.stepBlock}>
          <p className={s.kicker}>Wedding date</p>
          <h2 style={serif} className={s.stepTitle}>
            The day our story becomes official...
          </h2>
          <p className={s.stepBody}>
            Add a tentative date if you have one, or skip for now if the plan is still open.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md md:max-w-lg mx-auto">
            {[
              { part: "dd", label: "DD", placeholder: "DD" },
              { part: "mm", label: "MM", placeholder: "MM" },
              { part: "yy", label: "YY", placeholder: "YY" },
            ].map((f) => (
              <label key={f.part} className="block text-center">
                <span className={`${s.kicker} mb-1.5 block`}>{f.label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={f.placeholder}
                  value={dateInput[f.part]}
                  onChange={(e) => handleDatePartChange(f.part, e.target.value)}
                  className={s.dateInput}
                />
              </label>
            ))}
          </div>

          <div className={s.actions}>
            <button onClick={handleBack} type="button" className={s.secondaryBtn}>
              Back
            </button>
            <button
              onClick={handleDateUndecided}
              type="button"
              className={`${s.secondaryBtn} text-[#e6c6b2]`}
            >
              Not decided yet
            </button>
            <button
              onClick={() => goToStep(6, 1)}
              type="button"
              disabled={!formData.weddingDate}
              className={s.primaryBtn}
            >
              Next →
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 6: Guest Count ── */
    if (step === 6) {
      return (
        <div className={s.stepBlock}>
          <p className={s.kicker}>Guest count</p>
          <h2 style={serif} className={s.stepTitle}>
            How many people do you imagine celebrating with you?
          </h2>
          <p className={s.stepBody}>
            Pick the range that best matches the scale of your day.
          </p>

          <div className={s.optionGridFour}>
            {guestOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  handleOptionSelect("guestCount", opt);
                  goToStep(7, 1);
                }}
                type="button"
                className={`${s.optionBoxHalf} ${
                  formData.guestCount === opt ? optionSelected : optionDefault
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className={s.actions}>
            <button onClick={handleBack} type="button" className={s.secondaryBtn}>
              Back
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 7: City ── */
    if (step === 7) {
      return (
        <div className={s.stepBlock}>
          <p className={s.kicker}>City</p>
          <h2 style={serif} className={s.stepTitle}>
            Where love currently lives...
          </h2>
          <p className={s.stepBody}>
            Add the city or town you're planning from so location-based ideas can follow.
          </p>

          <label className="block text-center w-full max-w-2xl mx-auto">
            <span className={s.inputLabel}>City or town</span>
            <input
              name="city"
              type="text"
              placeholder="Mumbai, Jaipur, Goa..."
              value={formData.city}
              onChange={handleTextChange}
              className={s.textInput}
            />
          </label>

          <div className={s.actions}>
            <button onClick={handleBack} type="button" className={s.secondaryBtn}>
              Back
            </button>
            <button
              onClick={() => goToStep(8, 1)}
              type="button"
              disabled={!formData.city.trim()}
              className={s.primaryBtn}
            >
              Next →
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 8: Dream Venue ── */
    return (
      <div className={s.stepBlock}>
        <p className={s.kicker}>Dream venue</p>
        <h2 style={serif} className={s.stepTitle}>
          We dream of saying "I Do" in...
        </h2>
        <p className={s.stepBody}>
          Share the destination or city you imagine for the wedding setting.
        </p>

        <label className="block text-center w-full max-w-2xl mx-auto">
          <span className={s.inputLabel}>Destination or city</span>
          <input
            name="dreamVenue"
            type="text"
            placeholder="Udaipur, Lake Como, Tuscany..."
            value={formData.dreamVenue}
            onChange={handleTextChange}
            className={s.textInput}
          />
        </label>

        <div className={s.actions}>
          <button onClick={handleBack} type="button" className={s.secondaryBtn}>
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
            className={s.primaryBtn}
          >
            Review My Story →
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen w-screen relative px-1 md:px-2 pt-[10vh] pb-[8vh] text-white overflow-y-auto flex justify-center items-start">
      {/* Background Pillars Mandap setup (fully bright and natural) */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-20 scale-105 animate-scaleIn"
        style={{
          backgroundImage: 'url("/images/signup.png")',
        }}
      />
      <div className="absolute inset-0 bg-black/10 -z-10" />

<<<<<<< HEAD
      <section className="loverai-auth-panel" style={card}>
        <header style={cardHeader}>
          <div>
            <img
              src="/images/LogoLoversai.png"
              alt="LoversAI"
              style={{ height: 38, marginBottom: 8 }}
            />
            <h1
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,245,234,0.85)",
                letterSpacing: "0.28em",
                margin: "0 0 6px",
                textTransform: "uppercase",
              }}
            >
              Lovers AI
            </h1>
            <p style={heroHeading}>Build your wedding profile</p>
          </div>
          <span style={progressPill}>
            {isComplete ? "Ready ✨" : `Step ${step} of ${TOTAL_STEPS}`}
          </span>
        </header>

        {/* Progress bar */}
        <div
          style={{
            height: 3,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            margin: "0 0 28px",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              width: `${progressPct}%`,
              background: "linear-gradient(90deg,#C59854,#f0d196)",
              transition: "width 0.5s ease",
            }}
          />
=======
      {/* Card: pillar-to-pillar width, flower-frame to carpet height */}
      <motion.section
        layout
        transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        className="relative z-10 w-[60%] max-w-[1280px] min-h-[52vh] rounded-[28px] px-8 md:px-12 py-8 md:py-9 shadow-[0_24px_80px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-y-auto animate-scaleIn flex flex-col"
      >
        <div className="w-full mx-auto flex flex-col flex-1 min-h-0">
          <header className="relative select-none mb-8 md:mb-10 w-full">
            <span className={`absolute top-0 right-0 ${s.stepPill}`}>
              {isComplete ? "Ready ✨" : `Step ${step} of ${TOTAL_STEPS}`}
            </span>
            <div className="w-full text-center flex flex-col items-center px-12 md:px-20">
              <span className={s.pageBrand}>LOVERS AI</span>
              <h1 style={serif} className={s.pageTitle}>
                Build your wedding profile
              </h1>
            </div>
          </header>

          {step > 1 && (
            <div className="h-[2px] bg-white/5 rounded-full mb-4 md:mb-5 relative select-none animate-fadeIn">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#e6c6b2]/40 to-[#e6c6b2] transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {/* Step Content Wrapper */}
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={isComplete ? "complete" : `step-${step}`}
              custom={direction}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={stepVariants}
              className={`flex flex-col ${step === 1 && !isComplete ? "flex-1" : ""}`}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
>>>>>>> origin/Couples
        </div>
      </motion.section>
    </main>
  );
}
<<<<<<< HEAD

/* ─── Styles ─── */
const shell = {
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 16px",
  fontFamily: "'Poppins', sans-serif",
  zIndex: 2,
};

const card = {
  position: "relative",
  zIndex: 10,
  width: "100%",
  maxWidth: 720,
  borderRadius: 32,
  padding: "34px 34px 40px",
  boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
};

const progressPill = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "none",
  color: "#fff2e1",
  padding: "8px 15px",
  borderRadius: 99,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};

const heroHeading = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(34px, 5vw, 56px)",
  lineHeight: 0.95,
  color: "#fff6ea",
  margin: 0,
};

const stepHeading = {
  fontFamily: "'DM Serif Display', serif",
  fontSize: "clamp(24px,4vw,38px)",
  lineHeight: 1.15,
  color: "#fff6ea",
  margin: "8px 0 0",
};

const supportingText = {
  fontSize: 14,
  lineHeight: 1.7,
  color: "rgba(249,247,245,0.6)",
  marginTop: 10,
  marginBottom: 0,
};

const actionsRow = {
  display: "flex",
  gap: 12,
  marginTop: 34,
  flexWrap: "wrap",
};

const primaryBtn = {
  background: "linear-gradient(135deg, #f0d196, #C59854)",
  color: "#1C1613",
  padding: "15px 30px",
  borderRadius: 18,
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "'Poppins', sans-serif",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  boxShadow: "0 10px 28px rgba(197,152,84,0.25)",
};

const secondaryBtn = {
  background: "rgba(255,255,255,0.06)",
  color: "#D48C8C",
  padding: "15px 24px",
  borderRadius: 18,
  border: "1px solid rgba(212,140,140,0.22)",
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "'Poppins', sans-serif",
  transition: "background 0.2s ease",
};

const fieldLabel = {
  display: "block",
};

const labelText = {
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "rgba(249,247,245,0.55)",
  marginBottom: 8,
  display: "block",
};

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(225,195,135,0.18)",
  background: "rgba(255,255,255,0.05)",
  color: "#F9F7F5",
  fontSize: 15,
  fontFamily: "'Poppins', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const optionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginTop: 28,
};

const optionCard = {
  minHeight: 116,
  padding: "22px 18px",
  borderRadius: 22,
  border: "1px solid rgba(225,195,135,0.18)",
  background: "rgba(255,255,255,0.04)",
  color: "#F9F7F5",
  fontSize: 15,
  cursor: "pointer",
  fontFamily: "'Poppins', sans-serif",
  transition: "all 0.2s ease",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const selectedCard = {
  background: "rgba(197,152,84,0.15)",
  borderColor: "rgba(197,152,84,0.55)",
  color: "#f0d196",
  boxShadow: "0 4px 20px rgba(197,152,84,0.18)",
};

const optionTitle = {
  fontSize: 24,
  lineHeight: 1.05,
  fontFamily: "'DM Serif Display', serif",
  color: "inherit",
};

const optionHint = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(249,247,245,0.5)",
};

const summaryCard = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1px solid rgba(225,195,135,0.12)",
  background: "rgba(255,255,255,0.03)",
  display: "flex",
  flexDirection: "column",
};
=======
>>>>>>> origin/Couples

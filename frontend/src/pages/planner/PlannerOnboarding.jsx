import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../api/api";
import PlannerQuickMenu from "../../components/PlannerQuickMenu";

const TOTAL_STEPS = 5;
const STORAGE_KEY = "lovers-ai-planner-onboarding";
const STEP_KEY = "lovers-ai-planner-onboarding-step";

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

const initialFormData = {
  company_name: "",
  fullName: "",
  location: "",
  phone: "",
  position: "",
  interest: "",
};

const stepConfig = [
  {
    key: "company_name",
    prompt: "What is your company or brand name?",
    placeholder: "Type your company name here...",
    subLabel: "COMPANY DETAILS",
    description: "This will be displayed on your profile and quotes sent to couples.",
  },
  {
    key: "fullName",
    prompt: "What should we call you as the lead planner?",
    placeholder: "Type your name here...",
    subLabel: "PERSONAL DETAILS",
    description: "Add your full name so communication feels personal.",
  },
  {
    key: "location",
    prompt: "Which city are you primarily planning from?",
    placeholder: "Type your city here...",
    subLabel: "LOCATION",
    description: "We'll use this to match you with couples looking for planners in your area.",
  },
  {
    key: "phone",
    prompt: "What phone number should couples reach you on?",
    placeholder: "Enter your phone number...",
    inputMode: "tel",
    subLabel: "CONTACT INFORMATION",
    description: "This is required for verification and client notifications.",
  },
  {
    key: "interest",
    prompt: "What kind of weddings do you focus on most?",
    placeholder: "Type your focus here...",
    subLabel: "WEDDING FOCUS",
    description: "E.g., luxury destination, intimate traditional, modern outdoor, etc.",
  },
];

export default function PlannerOnboarding() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const [direction, setDirection] = useState(1);
  const [step, setStep] = useState(() => {
    const savedStep = Number(localStorage.getItem(STEP_KEY));
    return Number.isNaN(savedStep) || savedStep < 1 ? 1 : savedStep;
  });
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialFormData;
    try {
      return { ...initialFormData, ...JSON.parse(saved) };
    } catch {
      return initialFormData;
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login?role=planner", { replace: true });
      return;
    }

    setForm((prev) => ({
      ...prev,
      company_name: prev.company_name || currentUser.company_name || "",
      fullName:
        prev.fullName || currentUser.fullName || currentUser.displayName || "",
      location: prev.location || currentUser.location || "",
      phone: prev.phone || currentUser.phone || "",
      position: prev.position || currentUser.position || "Lead Planner",
      interest: prev.interest || currentUser.interest || "",
    }));
  }, [currentUser, navigate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem(STEP_KEY, String(step));
  }, [step]);

  const activeStep = stepConfig[step - 1];
  const activeValue = form[activeStep.key] || "";
  const canContinue = activeValue.trim().length > 0;

  const handleChange = (event) => {
    const { value } = event.target;
    const nextValue =
      activeStep.key === "phone" ? value.replace(/[^\d+\s()-]/g, "") : value;
    setForm((prev) => ({ ...prev, [activeStep.key]: nextValue }));
  };

  const goBack = () => {
    if (step === 1 || isSaving) return;
    setDirection(-1);
    setStep((prev) => prev - 1);
    setServerError("");
  };

  const goNext = async () => {
    if (!canContinue || isSaving) return;

    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((prev) => prev + 1);
      setServerError("");
      return;
    }

    setIsSaving(true);
    setServerError("");
    try {
      const response = await userAPI.saveProfile({
        fullName: form.fullName.trim(),
        company_name: form.company_name.trim(),
        location: form.location.trim(),
        phone: form.phone.trim(),
        position: form.position.trim(),
        interest: form.interest.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.error || "We couldn't save your planner profile.");
      }

      await refreshUser();
      localStorage.removeItem("isNewUser");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_KEY);
      navigate("/planner", { replace: true });
    } catch (error) {
      setServerError(error?.message || "We couldn't save your planner profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    return (
      <div className="flex flex-col items-center w-full py-4 md:py-6">
        <span className="text-[13px] text-[#e6c6b2]/70 font-semibold uppercase tracking-[0.25em] mb-3">
          {activeStep.subLabel}
        </span>
        <h2 style={serif} className="text-3xl md:text-4xl font-light text-white mb-2 text-center leading-tight">
          {activeStep.prompt}
        </h2>
        <p className="text-white/60 text-base max-w-md mx-auto leading-relaxed mb-8 text-center">
          {activeStep.description}
        </p>

        <div className="w-full max-w-sm mx-auto text-left mb-10">
          <input
            type={activeStep.inputMode === "tel" ? "tel" : "text"}
            inputMode={activeStep.inputMode}
            value={activeValue}
            onChange={handleChange}
            placeholder={activeStep.placeholder}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-base text-white placeholder-white/25 focus:border-[#e6c6b2] focus:bg-white/10 transition outline-none text-center shadow-inner"
          />
        </div>

        {serverError && (
          <p className="mb-4 text-sm text-red-400 text-center font-semibold rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2">
            {serverError}
          </p>
        )}

        <div className="flex justify-center gap-4 w-full max-w-sm mx-auto">
          {step > 1 && (
            <button
              onClick={goBack}
              type="button"
              className="px-8 py-4 rounded-2xl text-base font-bold tracking-wider bg-transparent border border-white/20 text-white hover:bg-white/5 active:scale-95 transition-all flex-1 cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            onClick={goNext}
            type="button"
            disabled={!canContinue || isSaving}
            style={
              canContinue && !isSaving
                ? { background: "linear-gradient(90deg, #e6c6b2, #d4a878)", color: "#1c1613" }
                : {}
            }
            className={`px-8 py-4 rounded-2xl text-base font-bold tracking-wider transition-all active:scale-95 flex-1 ${
              canContinue && !isSaving
                ? "hover:brightness-110 shadow-lg shadow-[#d4a878]/10 cursor-pointer"
                : "border border-white/10 bg-white/5 text-white/30 cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : step === TOTAL_STEPS ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen w-screen relative px-4 text-white overflow-y-auto flex justify-center items-center">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-20"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%), url('/images/footer.png')",
          backgroundAttachment: "fixed",
        }}
      />

      <PlannerQuickMenu className="absolute right-6 top-6 z-20 sm:right-10 sm:top-8" />

      {/* Card Container */}
      <section
        style={{
          boxShadow: "0 24px 80px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.15)",
        }}
        className="relative z-10 w-full max-w-[880px] h-[90vh] max-h-[640px] rounded-[32px] bg-white/[0.01] backdrop-blur-[6px] border border-white/10 p-6 md:p-10 flex flex-col justify-between text-center overflow-y-auto"
      >
        {/* Header */}
        <div className="w-full flex flex-col items-center relative mb-6">
          {/* Logo on the left inside the card */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => navigate("/planner")}
              aria-label="Lovers AI home"
              className="transition hover:opacity-90"
            >
              <img
                src="/images/LogoLoversai.png"
                alt="Lovers AI"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </button>
          </div>

          <h2 className="text-2xl md:text-3xl font-light leading-tight text-white text-center px-16 md:px-24" style={serif}>
            Build your planner profile
          </h2>

          <span className="absolute top-1/2 right-0 -translate-y-1/2 border border-white/10 bg-white/5 text-white/75 text-[12px] tracking-wide px-3.5 py-1.5 rounded-full font-medium">
            Step {step} of {TOTAL_STEPS}
          </span>

          {/* Progress bar line */}
          <div className="w-full h-[1.5px] bg-white/10 mt-6 relative">
            <div
              style={{
                width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
                transition: "width 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
              className="absolute top-0 left-0 h-full bg-[#e6c6b2]"
            />
          </div>
        </div>

        {/* Step content with slide animation */}
        <div className="overflow-y-auto md:overflow-visible flex-1 flex flex-col justify-center py-2">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
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

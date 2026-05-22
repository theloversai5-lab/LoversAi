import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../api/api";
import PlannerQuickMenu from "../../components/PlannerQuickMenu";

const TOTAL_STEPS = 5;
const STORAGE_KEY = "lovers-ai-planner-onboarding";
const STEP_KEY = "lovers-ai-planner-onboarding-step";

const plannerBackdrop = {
  backgroundImage: 'url("/images/footer.png")',
};

const stepVariants = {
  initial: (direction) => ({
    opacity: 0,
    y: direction >= 0 ? 22 : -22,
  }),
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (direction) => ({
    opacity: 0,
    y: direction >= 0 ? -18 : 18,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
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
    placeholder: "Type your answer here...",
  },
  {
    key: "fullName",
    prompt: "What should we call you as the lead planner?",
    placeholder: "Type your answer here...",
  },
  {
    key: "location",
    prompt: "Which city are you primarily planning from?",
    placeholder: "Type your answer here...",
  },
  {
    key: "phone",
    prompt: "What phone number should couples or our team reach you on?",
    placeholder: "Enter your phone number...",
    inputMode: "tel",
  },
  {
    key: "interest",
    prompt: "What kind of weddings do you focus on most?",
    placeholder: "Type your answer here...",
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0706] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={plannerBackdrop}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,9,8,0.28),rgba(13,9,8,0.5))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,236,223,0.08),transparent_36%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="absolute left-6 top-6 z-20 sm:left-10 sm:top-8">
          <button
            type="button"
            onClick={() => navigate("/planner")}
            aria-label="Lovers AI home"
            className="transition hover:opacity-90"
          >
            <img
              src="/images/LogoLoversai.png"
              alt="Lovers AI"
              className="h-20 w-auto object-contain sm:h-24"
            />
          </button>
        </div>

        <PlannerQuickMenu className="absolute right-6 top-6 z-20 sm:right-10 sm:top-8" />

        <section className="w-full max-w-6xl overflow-hidden">
          <div className="flex flex-col gap-10 p-7 sm:p-10 lg:p-14">
            <div className="flex justify-end">
              <div className="rounded-full border border-white/14 bg-white/10 px-5 py-3 text-[13px] font-medium tracking-[0.08em] text-white/85">
                {`Step ${step} of ${TOTAL_STEPS}`}
              </div>
            </div>

            <div className="h-[4px] w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#C59854,#f0d196)] transition-all duration-300"
                style={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>

            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.section
                key={activeStep.key}
                custom={direction}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={stepVariants}
                className="mx-auto flex w-full max-w-5xl flex-col items-start justify-center gap-8 py-2 lg:min-h-[360px] lg:px-10"
              >
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-white px-2 text-sm font-semibold text-[#806d66] shadow-sm">
                    {step}
                  </span>
                  <h2 className="font-heading text-[clamp(28px,3vw,42px)] leading-[1.15] text-white">
                    {activeStep.prompt}
                  </h2>
                </div>

                <div className="mt-8 w-full max-w-[980px]">
                  <input
                    type={activeStep.inputMode === "tel" ? "tel" : "text"}
                    inputMode={activeStep.inputMode}
                    value={activeValue}
                    onChange={handleChange}
                    placeholder={activeStep.placeholder}
                    className="w-full border-0 border-b-[3px] border-white/95 bg-transparent px-0 pb-4 pt-1 font-heading text-[clamp(32px,3.6vw,52px)] leading-none text-[#d4b0a4] placeholder:text-[#b08d81] focus:outline-none"
                  />
                </div>

                {serverError && (
                  <p className="mt-1 text-sm text-red-200/90">{serverError}</p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="rounded-2xl border border-white/16 bg-white/10 px-7 py-3 text-lg font-semibold text-white/92 transition hover:bg-white/15"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canContinue || isSaving}
                    className="rounded-2xl bg-[#b8a198] px-8 py-3 text-[22px] font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isSaving ? "Saving..." : step === TOTAL_STEPS ? "Finish" : "OK"}
                  </button>
                </div>
              </motion.section>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  );
}

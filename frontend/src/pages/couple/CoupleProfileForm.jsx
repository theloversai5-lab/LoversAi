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
  const { currentUser } = useAuth();

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
    setDateInput(nextDate);
    setFormData((prev) => ({
      ...prev,
      weddingDate: hasCompleteDate
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
      // Map couple form fields into the unified profile API
      await userAPI.saveProfile({
        fullName: formData.brideName,
        partnerName: formData.groomName,
        brideAge: formData.brideAge,
        groomAge: formData.groomAge,
        budget: formData.budget,
        religion: formData.religion,
        weddingDate: formData.weddingDate,
        dateNotDecided: formData.dateNotDecided,
        guestCount: formData.guestCount,
        city: formData.city,
        dreamVenue: formData.dreamVenue,
        position: "Couple",
        interest: "Wedding Planning",
      });
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
        <div className="step-panel completion-panel">
          <p className="step-kicker">Vision Ready ✨</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(26px, 4vw, 42px)",
              margin: "8px 0 16px",
              color: "#fff6ea",
            }}
          >
            Your wedding story is set
          </h2>
          <p className="supporting-text">
            Save your profile to the cloud so your vision loads everywhere you
            sign in.
          </p>

          {serverMessage && (
            <div
              style={{
                marginTop: 16,
                padding: "14px 20px",
                borderRadius: 12,
                background: "rgba(212,140,140,0.12)",
                border: "1px solid rgba(212,140,140,0.3)",
                color: "#D48C8C",
                fontSize: 15,
              }}
            >
              {serverMessage}
              <button
                style={{ display: "block", marginTop: 16, ...primaryBtn }}
                onClick={() => navigate("/love-story")}
              >
                Go to My Journey →
              </button>
            </div>
          )}
          {serverError && (
            <p style={{ marginTop: 16, color: "#ff7b7b", fontSize: 14 }}>
              {serverError}
            </p>
          )}

          <div
            className="summary-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 14,
              marginTop: 28,
            }}
          >
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
              <div key={label} style={summaryCard}>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(225,195,135,0.6)",
                  }}
                >
                  {label}
                </span>
                <strong
                  style={{
                    fontSize: 16,
                    color: "#fff6ea",
                    marginTop: 4,
                    display: "block",
                  }}
                >
                  {val || "—"}
                </strong>
              </div>
            ))}
          </div>

          {!serverMessage && (
            <div className="step-actions" style={actionsRow}>
              <button style={secondaryBtn} onClick={handleBack} type="button">
                Back
              </button>
              <button
                style={primaryBtn}
                onClick={handleFinish}
                type="button"
                disabled={isSaving}
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
        <div className="step-panel intro-panel">
          <p className="step-kicker">Welcome to your guided setup</p>
          <h2 style={stepHeading}>Let's make your Love Story Official</h2>
          <p className="supporting-text" style={supportingText}>
            Build a wedding profile that feels intentional from day one. Lovers
            AI will use these details to shape your planning, design, and venue
            suggestions.
          </p>
          <button
            style={primaryBtn}
            onClick={() => goToStep(2, 1)}
            type="button"
          >
            Let's Begin →
          </button>
        </div>
      );
    }

    /* ── STEP 2: Names ── */
    if (step === 2) {
      return (
        <div className="step-panel">
          <p className="step-kicker">Couple Details</p>
          <h2 style={stepHeading}>Tell us about the two of you</h2>
          <p style={supportingText}>
            Add names and ages so the experience starts to feel personal.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginTop: 24,
            }}
          >
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
              <label key={f.name} style={fieldLabel}>
                <span style={labelText}>{f.label}</span>
                <input
                  name={f.name}
                  type="text"
                  placeholder={f.placeholder}
                  value={formData[f.name]}
                  onChange={handleTextChange}
                  style={inputStyle}
                />
              </label>
            ))}
          </div>
          <div style={actionsRow}>
            <button style={secondaryBtn} onClick={handleBack} type="button">
              Back
            </button>
            <button
              style={{
                ...primaryBtn,
                opacity:
                  !formData.brideName.trim() ||
                  !formData.groomName.trim() ||
                  !formData.brideAge.trim() ||
                  !formData.groomAge.trim()
                    ? 0.45
                    : 1,
              }}
              onClick={handleNamesNext}
              type="button"
              disabled={
                !formData.brideName.trim() ||
                !formData.groomName.trim() ||
                !formData.brideAge.trim() ||
                !formData.groomAge.trim()
              }
            >
              Next →
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 3: Budget ── */
    if (step === 3) {
      return (
        <div className="step-panel">
          <p className="step-kicker">Budget</p>
          <h2 style={stepHeading}>What budget are you planning around?</h2>
          <p style={supportingText}>
            Tap the range that feels closest. We'll save it and move ahead
            instantly.
          </p>
          <div style={optionGrid}>
            {budgetOptions.map((opt) => (
              <button
                key={opt}
                style={{
                  ...optionCard,
                  ...(formData.budget === opt ? selectedCard : {}),
                }}
                onClick={() => {
                  handleOptionSelect("budget", opt);
                  goToStep(4, 1);
                }}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={actionsRow}>
            <button style={secondaryBtn} onClick={handleBack} type="button">
              Back
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 4: Religion ── */
    if (step === 4) {
      return (
        <div className="step-panel">
          <p className="step-kicker">Tradition</p>
          <h2 style={stepHeading}>
            Which ceremony tradition fits your celebration?
          </h2>
          <p style={supportingText}>
            This shapes rituals, styling, and planning recommendations.
          </p>
          <div style={optionGrid}>
            {religionOptions.map((opt) => (
              <button
                key={opt}
                style={{
                  ...optionCard,
                  ...(formData.religion === opt ? selectedCard : {}),
                }}
                onClick={() => {
                  handleOptionSelect("religion", opt);
                  goToStep(5, 1);
                }}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={actionsRow}>
            <button style={secondaryBtn} onClick={handleBack} type="button">
              Back
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 5: Date ── */
    if (step === 5) {
      return (
        <div className="step-panel">
          <p className="step-kicker">Wedding Date</p>
          <h2 style={stepHeading}>The day our story becomes official...</h2>
          <p style={supportingText}>
            Add a tentative date, or skip if the plan is still open.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              marginTop: 24,
            }}
          >
            {[
              { part: "dd", label: "DD", placeholder: "DD" },
              { part: "mm", label: "MM", placeholder: "MM" },
              { part: "yy", label: "YY", placeholder: "YY" },
            ].map((f) => (
              <label key={f.part} style={fieldLabel}>
                <span style={labelText}>{f.label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={f.placeholder}
                  value={dateInput[f.part]}
                  onChange={(e) => handleDatePartChange(f.part, e.target.value)}
                  style={inputStyle}
                />
              </label>
            ))}
          </div>
          <div style={actionsRow}>
            <button style={secondaryBtn} onClick={handleBack} type="button">
              Back
            </button>
            <button
              style={secondaryBtn}
              onClick={handleDateUndecided}
              type="button"
            >
              Not decided yet
            </button>
            <button
              style={{
                ...primaryBtn,
                opacity: !formData.weddingDate ? 0.45 : 1,
              }}
              onClick={() => goToStep(6, 1)}
              type="button"
              disabled={!formData.weddingDate}
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
        <div className="step-panel">
          <p className="step-kicker">Guest Count</p>
          <h2 style={stepHeading}>
            How many people do you imagine celebrating with you?
          </h2>
          <p style={supportingText}>
            Pick the range that best matches the scale of your day.
          </p>
          <div style={optionGrid}>
            {guestOptions.map((opt) => (
              <button
                key={opt}
                style={{
                  ...optionCard,
                  ...(formData.guestCount === opt ? selectedCard : {}),
                }}
                onClick={() => {
                  handleOptionSelect("guestCount", opt);
                  goToStep(7, 1);
                }}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={actionsRow}>
            <button style={secondaryBtn} onClick={handleBack} type="button">
              Back
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 7: City ── */
    if (step === 7) {
      return (
        <div className="step-panel">
          <p className="step-kicker">City</p>
          <h2 style={stepHeading}>Where love currently lives...</h2>
          <p style={supportingText}>
            Add the city or town you're planning from so location-based ideas
            can follow.
          </p>
          <label style={{ ...fieldLabel, marginTop: 24, display: "block" }}>
            <span style={labelText}>City or Town</span>
            <input
              name="city"
              type="text"
              placeholder="Mumbai, Jaipur, Goa..."
              value={formData.city}
              onChange={handleTextChange}
              style={inputStyle}
            />
          </label>
          <div style={actionsRow}>
            <button style={secondaryBtn} onClick={handleBack} type="button">
              Back
            </button>
            <button
              style={{
                ...primaryBtn,
                opacity: !formData.city.trim() ? 0.45 : 1,
              }}
              onClick={() => goToStep(8, 1)}
              type="button"
              disabled={!formData.city.trim()}
            >
              Next →
            </button>
          </div>
        </div>
      );
    }

    /* ── STEP 8: Dream Venue ── */
    return (
      <div className="step-panel">
        <p className="step-kicker">Dream Venue</p>
        <h2 style={stepHeading}>We dream of saying "I Do" in...</h2>
        <p style={supportingText}>
          Share the destination or city you imagine for the wedding setting.
        </p>
        <label style={{ ...fieldLabel, marginTop: 24, display: "block" }}>
          <span style={labelText}>Destination or City</span>
          <input
            name="dreamVenue"
            type="text"
            placeholder="Udaipur, Lake Como, Tuscany..."
            value={formData.dreamVenue}
            onChange={handleTextChange}
            style={inputStyle}
          />
        </label>
        <div style={actionsRow}>
          <button style={secondaryBtn} onClick={handleBack} type="button">
            Back
          </button>
          <button
            style={{
              ...primaryBtn,
              opacity: !formData.dreamVenue.trim() ? 0.45 : 1,
            }}
            onClick={() => {
              setDirection(1);
              setIsComplete(true);
              setStep(TOTAL_STEPS);
            }}
            type="button"
            disabled={!formData.dreamVenue.trim()}
          >
            Review My Story →
          </button>
        </div>
      </div>
    );
  };

  return (
    <main style={shell}>
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          opacity: 0.22,
        }}
      >
        <source src="/images/couple/couple_video.mp4" type="video/mp4" />
      </video>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(160deg, #0a0604 0%, #1a0f08 60%, #0d0804 100%)",
          zIndex: 1,
        }}
      />

      {/* Card */}
      <section style={card}>
        {/* Header */}
        <header style={cardHeader}>
          <div>
            <img
              src="/images/LogoLoversai.png"
              alt="LoversAI"
              style={{ height: 38, marginBottom: 8 }}
            />
            <h1
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#D48C8C",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              Build Your Wedding Profile
            </h1>
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
        </div>

        {/* Step body */}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={isComplete ? "complete" : `step-${step}`}
            custom={direction}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={stepVariants}
            style={{ minHeight: 340 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}

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
  maxWidth: 580,
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  border: "1px solid rgba(225,195,135,0.14)",
  borderRadius: 28,
  padding: "36px 40px 44px",
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
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#D48C8C",
  padding: "6px 14px",
  borderRadius: 99,
  border: "1px solid rgba(212,140,140,0.22)",
  background: "rgba(212,140,140,0.06)",
  whiteSpace: "nowrap",
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
  marginTop: 30,
  flexWrap: "wrap",
};

const primaryBtn = {
  background: "linear-gradient(135deg, #f0d196, #C59854)",
  color: "#1C1613",
  padding: "13px 28px",
  borderRadius: 12,
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
  padding: "13px 22px",
  borderRadius: 12,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
  marginTop: 24,
};

const optionCard = {
  padding: "16px 14px",
  borderRadius: 14,
  border: "1px solid rgba(225,195,135,0.18)",
  background: "rgba(255,255,255,0.04)",
  color: "#F9F7F5",
  fontSize: 15,
  cursor: "pointer",
  fontFamily: "'Poppins', sans-serif",
  transition: "all 0.2s ease",
  textAlign: "center",
};

const selectedCard = {
  background: "rgba(197,152,84,0.15)",
  borderColor: "rgba(197,152,84,0.55)",
  color: "#f0d196",
  boxShadow: "0 4px 20px rgba(197,152,84,0.18)",
};

const summaryCard = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1px solid rgba(225,195,135,0.12)",
  background: "rgba(255,255,255,0.03)",
  display: "flex",
  flexDirection: "column",
};

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScrollShowcase from "../../components/couple/ScrollShowcase";
import { useAuth } from "../../context/AuthContext";

const carouselImages = [
  {
    src: "/images/1.png",
    title: "Moonlit Mandap Moments",
    copy: "Layered florals, candlelit aisles, and a setting that feels made for cinema.",
  },
  {
    src: "/images/2.png",
    title: "Golden Hour Vows",
    copy: "Soft sea light, sculpted decor, and a ceremony framed like a destination editorial.",
  },
  {
    src: "/images/3.png",
    title: "Reception Afterglow",
    copy: "Romantic tablescapes and an atmosphere designed to feel intimate, grand, and alive.",
  },
  {
    src: "/images/4.png",
    title: "Starlight Celebration",
    copy: "A breathtaking reception designed to make every moment feel unforgettable.",
  },
];

function CoupleHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);

  const handleEnter = (e) => {
    e.currentTarget.style.transform = "translateY(-10px) scale(1.01)";
    e.currentTarget.style.boxShadow = "0 25px 50px rgba(230, 198, 178, 0.15), 0 15px 40px rgba(0,0,0,0.6)";
    e.currentTarget.style.borderColor = "rgba(230, 198, 178, 0.55)";
    e.currentTarget.style.background = "radial-gradient(circle at 80% 20%, rgba(230, 198, 178, 0.16) 0%, transparent 60%), linear-gradient(135deg, rgba(46, 34, 29, 0.95) 0%, rgba(26, 18, 14, 0.98) 100%)";
    const iconCircle = e.currentTarget.querySelector(".step-icon-circle");
    if (iconCircle) {
      iconCircle.style.background = "rgba(230, 198, 178, 0.22)";
      iconCircle.style.borderColor = "rgba(230, 198, 178, 0.6)";
      iconCircle.style.transform = "scale(1.08)";
    }
    const numBg = e.currentTarget.querySelector(".card-number-bg");
    if (numBg) {
      numBg.style.color = "rgba(230, 198, 178, 0.08)";
      numBg.style.transform = "scale(1.05) translateY(-5px)";
    }
    const arrow = e.currentTarget.querySelector(".footer-arrow");
    if (arrow) {
      arrow.style.transform = "translateX(6px)";
      arrow.style.color = "#ebd8c7";
      arrow.style.opacity = "1";
    }
  };

  const handleLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0px) scale(1)";
    e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
    e.currentTarget.style.borderColor = "rgba(230, 198, 178, 0.18)";
    e.currentTarget.style.background = "radial-gradient(circle at 80% 20%, rgba(230, 198, 178, 0.08) 0%, transparent 50%), linear-gradient(135deg, rgba(37, 27, 23, 0.85) 0%, rgba(22, 15, 12, 0.95) 100%)";
    const iconCircle = e.currentTarget.querySelector(".step-icon-circle");
    if (iconCircle) {
      iconCircle.style.background = "rgba(230, 198, 178, 0.08)";
      iconCircle.style.borderColor = "rgba(230, 198, 178, 0.25)";
      iconCircle.style.transform = "scale(1)";
    }
    const numBg = e.currentTarget.querySelector(".card-number-bg");
    if (numBg) {
      numBg.style.color = "rgba(230, 198, 178, 0.03)";
      numBg.style.transform = "scale(1) translateY(0px)";
    }
    const arrow = e.currentTarget.querySelector(".footer-arrow");
    if (arrow) {
      arrow.style.transform = "translateX(0px)";
      arrow.style.color = "rgba(230, 198, 178, 0.4)";
      arrow.style.opacity = "0.75";
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % carouselImages.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, []);

  const hasCompletedWeddingProfile =
    currentUser?.role === "couple" && currentUser?.weddingProfile?.completed === true;

  const handleStartYourStory = () => {
    if (currentUser) {
      // Check if user is actually a couple
      if (currentUser.role === "couple") {
        if (hasCompletedWeddingProfile) {
          navigate("/love-story");
        } else {
          navigate("/couple/onboarding");
        }
      } else {
        // User is logged in but with wrong role (vendor/planner)
        navigate(`/login?role=couple&mismatch=true`, {
          state: { from: "/couple/onboarding" },
        });
      }
      return;
    }
    // New couple flow: Couple -> Sign Up -> Make Profile
    navigate("/signup?role=Couple", { state: { from: "/couple/onboarding" } });
  };

  // Removing <Navbar /> and <Footer /> because they are global in App.jsx

  return (
    <div style={page}>
      <div id="home" />
      {/* Scroll-driven showcase hero anchoring the landing page visual story. */}
      <ScrollShowcase />

      <div className="px-4 py-14 sm:px-8 md:px-10 md:py-16" style={container}>
        {/* Primary CTA and supporting content below the animated hero. */}
        <div id="journey" style={buttonWrapper}>
          <button style={button} onClick={handleStartYourStory}>
            {hasCompletedWeddingProfile ? "Continue Your Journey" : "Start Your Story"}
          </button>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl mt-12 sm:mt-16 md:mt-20" style={title}>
          Your Journey to the Perfect Day,
          <br />
          in 3 easy steps
        </h2>

        <div style={journeyGrid}>
          {[
            { 
              num: "01",
              step: "Step 1", 
              text: "Sign Up & Create Your Profile",
              desc: "Quickly set up your profile and tell us your dream wedding preferences to customize your experience.",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ebd8c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )
            },
            { 
              num: "02",
              step: "Step 2", 
              text: "Edit & Personalize Everything",
              desc: "Refine layouts, change theme palettes, switch lightings, and preview real-time edits powered by our advanced AI tools.",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ebd8c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              )
            },
            { 
              num: "03",
              step: "Step 3", 
              text: "Choose & Order Anything Last Moment",
              desc: "Secure your bookings, order custom decks, and coordinate with planners instantly, even at the last minute.",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ebd8c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              )
            },
          ].map((item) => (
            <div
              key={item.step}
              style={journeyCard}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onClick={handleStartYourStory}
            >
              {/* Elegant serif watermark card number in the background */}
              <div className="card-number-bg" style={cardNumberBg}>
                {item.num}
              </div>

              <div style={cardInner}>
                <div className="step-icon-circle" style={iconCircle}>
                  {item.icon}
                </div>
                <span style={stepLabelPill}>{item.step}</span>
                <span style={cardTitleText}>{item.text}</span>
                <p style={cardDescText}>{item.desc}</p>
              </div>

              {/* Action indicator at footer */}
              <div className="footer-arrow" style={cardFooterArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <section style={carouselSection}>
          <div style={carouselHeading}>
            <p style={carouselEyebrow}>Wedding Inspiration</p>
          </div>

          <div className="w-full" style={carouselShell}>
            <div className="w-full min-h-[320px] sm:min-h-[450px] md:min-h-[600px] lg:min-h-[750px]" style={carouselViewport}>
              {carouselImages.map((image, index) => (
                <article
                  key={image.title}
                  style={{
                    ...carouselSlide,
                    opacity: index === activeSlide ? 1 : 0,
                    transform:
                      index === activeSlide
                        ? "scale(1) translateX(0)"
                        : "scale(1.03) translateX(18px)",
                    pointerEvents: index === activeSlide ? "auto" : "none",
                  }}
                >
                  <img
                    alt={image.title}
                    src={image.src}
                    style={carouselImage}
                  />
                </article>
              ))}
            </div>

            <div className="w-full" style={carouselControls}>
              <button
                onClick={() =>
                  setActiveSlide(
                    (activeSlide - 1 + carouselImages.length) %
                      carouselImages.length,
                  )
                }
                className="w-[84px] sm:w-[112px] py-2.5 sm:py-3 text-xs sm:text-sm"
                style={carouselArrow}
                type="button"
              >
                Prev
              </button>

              <div style={carouselDots}>
                {carouselImages.map((image, index) => (
                  <button
                    key={image.title}
                    onClick={() => setActiveSlide(index)}
                    className="w-4 sm:w-8"
                    style={{
                      ...carouselDot,
                      opacity: index === activeSlide ? 1 : 0.38,
                      transform:
                        index === activeSlide ? "scaleX(1.45)" : "scaleX(1)",
                    }}
                    type="button"
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  setActiveSlide((activeSlide + 1) % carouselImages.length)
                }
                className="w-[84px] sm:w-[112px] py-2.5 sm:py-3 text-xs sm:text-sm"
                style={carouselArrow}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <div id="quote" className="mt-12 sm:mt-16 md:mt-24 py-10 sm:py-14 md:py-20 px-4" style={quoteSection}>
          <h3 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl" style={quoteText}>
            This won’t come again, with us or without us, make sure you live.
          </h3>
        </div>
      </div>
    </div>
  );
}

export default CoupleHome;

/* PAGE */

const page = {
  width: "100%",
  minHeight: "100vh",
  backgroundImage: "url('/images/signup.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  backgroundRepeat: "no-repeat",
  color: "#F9F7F5",
  fontFamily: "'Poppins', sans-serif",
};

/* CONTAINER */

const container = {
  width: "100%",
  maxWidth: "1400px",
  margin: "0 auto",
  background: "transparent",
};

/* BUTTON */

const buttonWrapper = {
  display: "flex",
  justifyContent: "center",
  marginTop: "8px",
};

const button = {
  background: "linear-gradient(135deg, #e6c6b2, #e6c6b2)", // Luxury gold-pink gradient
  padding: "20px 44px",
  borderRadius: "14px",
  border: "none",
  cursor: "pointer",
  fontSize: "18px",
  fontWeight: 600,
  lineHeight: 1,
  fontFamily: "'Poppins', sans-serif",
  color: "#3D1B2D",
  boxShadow: "0 18px 36px rgba(230, 198, 178, 0.28)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
};

/* TITLE */

const title = {
  textAlign: "center",
  lineHeight: "1.2",
  fontFamily: "'DM Serif Display', serif",
};

/* JOURNEY GRID */

const journeyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: "30px",
  marginTop: "60px",
};

/* JOURNEY CARD */

const journeyCard = {
  height: "300px",
  borderRadius: "28px",
  background: "radial-gradient(circle at 80% 20%, rgba(230, 198, 178, 0.08) 0%, transparent 50%), linear-gradient(135deg, rgba(37, 27, 23, 0.85) 0%, rgba(22, 15, 12, 0.95) 100%)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(230, 198, 178, 0.18)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "32px 24px 20px",
  cursor: "pointer",
  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  position: "relative",
  overflow: "hidden",
};

const cardNumberBg = {
  position: "absolute",
  right: "12px",
  bottom: "0px",
  fontSize: "120px",
  fontWeight: 900,
  fontFamily: "'DM Serif Display', serif",
  color: "rgba(230, 198, 178, 0.03)",
  lineHeight: 1,
  pointerEvents: "none",
  userSelect: "none",
  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
};

const cardInner = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "12px",
  width: "100%",
};

const iconCircle = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "rgba(230, 198, 178, 0.08)",
  border: "1px solid rgba(230, 198, 178, 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 2px 8px rgba(255,255,255,0.05)",
  transition: "all 0.3s ease",
};

const stepLabelPill = {
  display: "inline-block",
  background: "rgba(230, 198, 178, 0.12)",
  border: "1px solid rgba(230, 198, 178, 0.35)",
  borderRadius: "100px",
  padding: "4px 14px",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "#ebd8c7",
  fontFamily: "'Poppins', sans-serif",
  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
};

const cardTitleText = {
  fontSize: "18px",
  fontWeight: 700,
  fontFamily: "'DM Serif Display', serif",
  color: "#fff",
  lineHeight: "1.3",
  letterSpacing: "0.02em",
  maxWidth: "92%",
  margin: "0 auto",
};

const cardDescText = {
  fontSize: "12.5px",
  fontFamily: "'Poppins', sans-serif",
  color: "rgba(249, 247, 245, 0.55)",
  lineHeight: "1.6",
  maxWidth: "96%",
  margin: "4px auto 0",
};

const cardFooterArrow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(230, 198, 178, 0.4)",
  opacity: "0.75",
  transition: "all 0.3s ease",
  marginTop: "12px",
};



/* QUOTE */

const quoteSection = {
  textAlign: "center",
};

const quoteText = {
  lineHeight: "1.1",
  letterSpacing: "-0.02em",
  maxWidth: "none",
  margin: "0 auto",
  fontFamily: "'Dream Avenue', 'DM Serif Display', serif",
  fontStyle: "normal",
  fontWeight: 400,
  whiteSpace: "normal",
};

/* CAROUSEL */

const carouselSection = {
  marginTop: "56px",
  display: "grid",
  gap: "20px",
};

const carouselHeading = {
  textAlign: "center",
  display: "grid",
  gap: "8px",
  padding: "12px 16px 8px",
  margin: "0 auto",
};

const carouselEyebrow = {
  fontSize: "10px",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "rgba(249, 247, 245, 0.58)",
  fontFamily: "'Poppins', sans-serif",
  margin: 0,
  padding: "4px 0",
};

const carouselShell = {
  display: "grid",
  gap: "18px",
  width: "100%",
};

const carouselViewport = {
  position: "relative",
  width: "100%",
  borderRadius: "28px",
  overflow: "hidden",
  background: "rgba(255,255,255,0.04)",
  boxShadow: "0 28px 70px rgba(0,0,0,0.32)",
};

const carouselSlide = {
  position: "absolute",
  inset: 0,
  transition: "opacity 420ms ease, transform 420ms ease",
};

const carouselImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
};

const carouselOverlay = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(7, 5, 5, 0.04) 0%, rgba(7, 5, 5, 0.22) 45%, rgba(7, 5, 5, 0.68) 100%)",
};

const carouselCopy = {
  position: "absolute",
  left: "clamp(20px, 4vw, 40px)",
  right: "clamp(20px, 4vw, 40px)",
  bottom: "clamp(24px, 4vw, 42px)",
  maxWidth: "560px",
  display: "grid",
  gap: "10px",
};

const carouselSlideEyebrow = {
  fontSize: "12px",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "rgba(255, 244, 232, 0.7)",
  fontFamily: "'Poppins', sans-serif",
};

const carouselSlideTitle = {
  fontSize: "clamp(30px, 4vw, 56px)",
  lineHeight: 1.02,
  fontFamily: "'DM Serif Display', serif",
  color: "#fff6ea",
};

const carouselSlideText = {
  fontSize: "16px",
  lineHeight: 1.7,
  color: "rgba(249, 247, 245, 0.82)",
  fontFamily: "'Poppins', sans-serif",
};

const carouselControls = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  width: "100%",
};

const carouselArrow = {
  borderRadius: "999px",
  border: "1px solid rgba(225, 195, 135, 0.26)",
  background: "rgba(255,255,255,0.05)",
  color: "#f8f1e8",
  textAlign: "center",
  cursor: "pointer",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontFamily: "'Poppins', sans-serif",
};

const carouselDots = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  flex: 1,
};

const carouselDot = {
  height: "4px",
  borderRadius: "999px",
  border: "none",
  background: "#D48C8C",
  cursor: "pointer",
  transition: "opacity 220ms ease, transform 220ms ease",
};

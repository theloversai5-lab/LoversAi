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
    e.currentTarget.style.transform = "translateY(-10px) scale(1.03)";
    e.currentTarget.style.boxShadow = "0 25px 60px rgba(0,0,0,0.6)";
  };

  const handleLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0px) scale(1)";
    e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
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

      <div style={container}>
        {/* Primary CTA and supporting content below the animated hero. */}
        <div id="journey" style={buttonWrapper}>
          <button style={button} onClick={handleStartYourStory}>
            {hasCompletedWeddingProfile ? "Continue Your Journey" : "Start Your Story"}
          </button>
        </div>

        <h2 style={title}>
          Your Journey to the Perfect Day,
          <br />
          in 3 easy steps
        </h2>

        <div style={journeyGrid}>
          {[
            { step: "Step 1", text: "Sign Up & Create Your Profile" },
            { step: "Step 2", text: "Edit & Personalize Everything" },
            { step: "Step 3", text: "Choose & Order Anything Last Moment" },
          ].map((item) => (
            <div
              key={item.step}
              style={journeyCard}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <div style={cardInner}>
                <span style={stepLabel}>{item.step}</span>
                <span style={cardText}>{item.text}</span>
              </div>
            </div>
          ))}
        </div>

        <section style={carouselSection}>
          <div style={carouselHeading}>
            <p style={carouselEyebrow}>Wedding Inspiration</p>
          </div>

          <div style={carouselShell}>
            <div style={carouselViewport}>
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

            <div style={carouselControls}>
              <button
                onClick={() =>
                  setActiveSlide(
                    (activeSlide - 1 + carouselImages.length) %
                      carouselImages.length,
                  )
                }
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
                style={carouselArrow}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <div id="quote" style={quoteSection}>
          <h3 style={quoteText}>
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
  padding: "56px 40px 72px",
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
  marginTop: "56px",
  fontSize: "42px",
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
  height: "180px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #33251c, #5c3c24)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "28px 24px",
  cursor: "pointer",
  transition: "all 0.4s ease",
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

const cardInner = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "14px",
};

const stepLabel = {
  fontSize: "13px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(230, 198, 178, 0.95)",
  fontWeight: 700,
  fontFamily: "'Poppins', sans-serif",
};

/* CARD TEXT */

const cardText = {
  fontSize: "18px",
  lineHeight: "1.6",
  fontFamily: "'Poppins', sans-serif",
};

/* QUOTE */

const quoteSection = {
  marginTop: "88px",
  textAlign: "center",
  padding: "72px 20px 48px",
};

const quoteText = {
  fontSize: "48px",
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
};

const carouselViewport = {
  position: "relative",
  minHeight: "min(75vh, 800px)",
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
};

const carouselArrow = {
  minWidth: "112px",
  borderRadius: "999px",
  border: "1px solid rgba(225, 195, 135, 0.26)",
  background: "rgba(255,255,255,0.05)",
  color: "#f8f1e8",
  padding: "13px 18px",
  cursor: "pointer",
  fontSize: "14px",
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
  width: "32px",
  height: "4px",
  borderRadius: "999px",
  border: "none",
  background: "#D48C8C",
  cursor: "pointer",
  transition: "opacity 220ms ease, transform 220ms ease",
};

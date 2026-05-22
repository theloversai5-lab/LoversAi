import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const [hovered, setHovered] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionText, setTransitionText] = useState("");
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && currentUser) {
      const userRole = (localStorage.getItem("userRole") || "").toLowerCase();
      if (userRole === "planner") {
        navigate("/planner/dashboard", { replace: true });
      } else if (userRole === "couple") {
        navigate("/couples", { replace: true });
      } else if (userRole === "vendor") {
        navigate("/vendor/dashboard", { replace: true });
      }
    }
  }, [currentUser, loading, navigate]);

  const handleNavigate = (path, skipTransition = false) => {
    if (skipTransition) {
      navigate(path);
    } else {
      setTransitioning(true);
      setTransitionText("Lovers AI");
      setTimeout(() => {
        navigate(path);
      }, 1500);
    }
  };

  return (
    <div
      className="relative w-full min-h-screen md:min-h-[967px]"
      style={{ minHeight: "100vh" }}
    >
      {/* Video Background - Scrolls with page */}
      {!loading && (
        <video
          className="absolute inset-0 w-full h-full object-cover -z-20"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/images/header.mp4" type="video/mp4" />
        </video>
      )}

      {/* Dark overlay with warm tint - also scrolls */}
      {!loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-loverai-deep/30 via-transparent to-loverai-deep/50 -z-10"></div>
      )}

      {/* Loading state while auth is initializing */}
      {loading && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(10,6,4,0.98)" }}
        >
          <div className="text-center">
            <img
              src="/images/LogoLoversai.png"
              alt="LoversAI"
              className="h-20 w-auto mx-auto mb-4 animate-float"
            />
            <div className="w-10 h-10 mx-auto border-2 border-loverai-gold/30 border-t-loverai-gold rounded-full animate-spin"></div>
          </div>
        </div>
      )}

      {/* Slide-up Transition */}
      {transitioning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-slideUp"
          style={{ background: "rgba(10,6,4,0.97)" }}
        >
          <div className="text-center">
            <img
              src="/images/LogoLoversai.png"
              alt="LoversAI"
              className="h-20 w-auto mx-auto mb-4 animate-float"
            />
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading tracking-widest loverai-gradient-text">
              {transitionText}
            </h1>
          </div>
        </div>
      )}

      {/* Hero Section Content */}
      <div
        className="relative z-0 w-full overflow-hidden min-h-screen md:min-h-[967px]"
        style={{ minHeight: "100vh" }}
      >
        {/* Navigation Buttons - Only show for unauthenticated users */}
        {!loading && !currentUser && (
          <div className="absolute w-full flex justify-between items-center z-20 px-8 sm:px-16 bottom-[15%] md:bottom-[20%]">
            {/* Couples - Left Side */}
            <div
              className="relative cursor-pointer"
              onMouseEnter={() => setHovered("couples")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleNavigate("/couples")}
            >
              <button
                className={`text-white font-heading transition-all duration-500 cursor-pointer relative z-30 px-6 sm:px-10 py-3 sm:py-5 rounded-2xl text-2xl sm:text-3xl md:text-5xl ${
                  hovered === "couples"
                    ? "glass-card-strong text-loverai-gold scale-105"
                    : "hover:text-loverai-gold/70"
                }`}
                style={{ fontWeight: 300 }}
              >
                Couples
              </button>
            </div>

            {/* Planners - Right Side */}
            <div
              className="relative cursor-pointer"
              onMouseEnter={() => setHovered("planner")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleNavigate("/planner", true)}
            >
              <button
                className={`text-white font-heading transition-all duration-500 cursor-pointer relative z-30 px-6 sm:px-10 py-3 sm:py-5 rounded-2xl text-2xl sm:text-3xl md:text-5xl ${
                  hovered === "planner"
                    ? "glass-card-strong text-loverai-gold scale-105"
                    : "hover:text-loverai-gold/70"
                }`}
                style={{ fontWeight: 300 }}
              >
                Planners
              </button>
            </div>
          </div>
        )}

        {/* Explore Now - Only show for unauthenticated users */}
        {!loading && !currentUser && !transitioning && hovered && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center text-white z-20 animate-fadeIn">
            <p className="text-sm text-loverai-gold/80 underline underline-offset-4">
              Explore now
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;

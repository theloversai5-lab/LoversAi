import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const [hovered, setHovered] = useState(null);
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

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div
      className="relative w-full min-h-[100svh] md:min-h-[967px]"
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



      {/* Hero Section Content */}
      <div
        className="relative z-0 w-full overflow-hidden min-h-screen md:min-h-[967px]"
        style={{ minHeight: "100vh" }}
      >
        {/* Navigation Buttons - Only show for unauthenticated users */}
        {!loading && !currentUser && (
          <div className="absolute inset-x-0 z-20 bottom-8 flex flex-col items-stretch gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 md:bottom-[15%] md:px-16">
            {/* Couples - Left Side */}
            <div
              className="relative cursor-pointer flex-1"
              onMouseEnter={() => setHovered("couples")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleNavigate("/couples")}
            >
              <button
                className={`w-full text-white font-heading transition-all duration-500 cursor-pointer relative z-30 px-6 sm:px-10 py-3 sm:py-5 rounded-2xl text-2xl sm:text-3xl md:text-5xl ${
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
              className="relative cursor-pointer flex-1"
              onMouseEnter={() => setHovered("planner")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleNavigate("/planner")}
            >
              <button
                className={`w-full text-white font-heading transition-all duration-500 cursor-pointer relative z-30 px-6 sm:px-10 py-3 sm:py-5 rounded-2xl text-2xl sm:text-3xl md:text-5xl ${
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
        {!loading && !currentUser && hovered && (
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

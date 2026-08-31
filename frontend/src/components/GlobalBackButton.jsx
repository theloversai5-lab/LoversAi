import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function GlobalBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check if we are not on root or if history is available
  useEffect(() => {
    // Hide only on the exact root homepage when there's no state/history
    const isRoot = location.pathname === "/";
    setCanGoBack(!isRoot || window.history.state?.idx > 0);
  }, [location.pathname]);

  const handleBack = () => {
    // If browser history has previous pages, go back
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // Smart role-based fallback if directly landed on a deep link
      const role = localStorage.getItem("userRole");
      const path = location.pathname;

      if (path.startsWith("/couple") || path === "/love-story") {
        if (path === "/couples") navigate("/");
        else navigate("/couples");
      } else if (path.startsWith("/planner")) {
        if (path === "/planner") navigate("/");
        else navigate("/planner");
      } else if (path.startsWith("/vendor")) {
        if (path === "/vendor-ai") navigate("/");
        else navigate("/vendor-ai");
      } else if (path.startsWith("/admin")) {
        if (path === "/admin/dashboard") navigate("/");
        else navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    }
  };

  if (!canGoBack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: -10 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 left-6 z-[9999] pointer-events-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back to previous page"
          title="Go back (Browser Back)"
          className="group relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#18110e]/90 hover:bg-[#281c16] text-[#f2dad0] hover:text-white border border-white/15 hover:border-[#d4a878]/60 backdrop-blur-2xl shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer"
        >
          {/* Animated Glowing Ring on Hover */}
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#d4a878]/30 to-[#e6c6b2]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10" />

          {/* Left Arrow Icon */}
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1 text-[#d4a878]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>

          {/* Button Label */}
          <span className="text-xs font-bold uppercase tracking-wider font-['Poppins',sans-serif]">
            Back
          </span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

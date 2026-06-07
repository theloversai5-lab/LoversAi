import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PlannerQuickMenu({
  className = "fixed right-4 top-4 z-40 sm:right-6 sm:top-6 lg:right-8 lg:top-8",
}) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const userName =
    currentUser?.fullName ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Planner";

  const isPlannerUser = currentUser?.role === "planner";
  const buttonLabel = isPlannerUser ? userName.charAt(0).toUpperCase() : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  const guestLinks = [
    { label: "Planner Home", to: "/planner" },
    { label: "Pitch with AI", to: "/planner-ai-tools" },
    { label: "Login", to: "/login?role=planner" },
  ];

  const plannerLinks = [
    { label: "Planner Home", to: "/planner" },
    { label: "Dashboard", to: "/planner/dashboard" },
    { label: "Pitch with AI", to: "/planner-ai-tools" },
    { label: "Profile", to: "/planner/profile" },
  ];

  const menuLinks = isPlannerUser ? plannerLinks : guestLinks;

  return (
    <div ref={menuRef} className={className}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Planner menu"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/16 bg-[linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] text-[18px] font-semibold text-[#fff6ea] shadow-[0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:scale-105 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.24),rgba(255,255,255,0.12))]"
      >
        {isPlannerUser ? (
          buttonLabel
        ) : (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-4 w-52 rounded-3xl border border-white/14 bg-[linear-gradient(145deg,rgba(33,22,18,0.92),rgba(23,15,12,0.88))] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          {isPlannerUser && (
            <div className="mb-2 border-b border-white/10 px-4 pb-3">
              <p className="truncate text-sm font-medium text-white/90">
                {userName}
              </p>
              <p className="truncate text-xs text-white/45">
                {currentUser?.email}
              </p>
            </div>
          )}

          {menuLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-base font-medium text-white/88 transition hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}

          {isPlannerUser && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 w-full rounded-2xl px-4 py-3 text-left text-base font-medium text-red-200 transition hover:bg-red-500/10"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

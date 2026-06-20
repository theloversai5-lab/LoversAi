// components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

let cartCountRequest = null;
let lastCartCountFetchAt = 0;

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const dropdownRef = useRef(null);
  const plannerMenuRef = useRef(null);
  const mobilePanelRef = useRef(null);
  const isPlannerLanding = location.pathname === "/planner";
  const isMainLanding = location.pathname === "/";
  const isCouplesLanding = location.pathname === "/couples";
  const isHamburgerLanding = isPlannerLanding || isMainLanding || isCouplesLanding;
  const shouldShowHamburgerSignIn = !currentUser && !isMainLanding;

  const handleLogout = async () => {
    try {
      logout();
      navigate("/"); // Redirect to home page
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleMenuNavigate = (path) => {
    navigate(path);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  // Get the expected role based on current page
  const getRoleFromPath = () => {
    const path = location.pathname;
    if (path.startsWith("/couple") || path.startsWith("/couples"))
      return "couple";
    if (path.startsWith("/planner")) return "planner";
    if (path.startsWith("/vendor")) return "vendor";
    return null;
  };

  // Handle Sign In click with role awareness
  const handleSignInClick = (e) => {
    e.preventDefault();
    const role = getRoleFromPath();
    if (role) {
      navigate(`/login?role=${role}`, { state: { from: location.pathname } });
    } else {
      navigate("/login");
    }
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  // Fetch cart count for couples
  useEffect(() => {
    const fetchCartCount = async () => {
      if (currentUser && localStorage.getItem("userRole") === "couple") {
        const now = Date.now();
        if (now - lastCartCountFetchAt < 15000) return;
        if (cartCountRequest) return;

        try {
          lastCartCountFetchAt = now;
          cartCountRequest = true;
          const { apiFetch } = await import("../api/api");
          const res = await apiFetch("/cart");
          if (res.success && res.cart) {
            setCartCount(res.cart.items?.length || 0);
          }
        } catch (err) {
          if (err?.response?.status !== 429) {
            console.error("Failed to fetch cart count:", err);
          }
        } finally {
          cartCountRequest = null;
        }
      }
    };

    fetchCartCount();

    const interval = setInterval(fetchCartCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && localStorage.getItem("userRole") === "couple") {
      lastCartCountFetchAt = 0;
    }
  }, [location.pathname, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!mobileMenuOpen) return;

      const activeMenuRef =
        isHamburgerLanding && window.innerWidth >= 768
          ? plannerMenuRef.current
          : mobilePanelRef.current;

      if (activeMenuRef && !activeMenuRef.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isHamburgerLanding, mobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
        setDropdownOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const getUserInitials = () => {
    if (!currentUser?.displayName && !currentUser?.email) return "U";
    const name = currentUser.displayName || currentUser.email;
    return name.charAt(0).toUpperCase();
  };

  const isAdminEmail = (email) => {
    const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return !!(email && adminEmails.includes(email.toLowerCase()));
  };

  const getNavLinks = () => {
    const userRole = localStorage.getItem("userRole");
    const baseLinks = [{ to: "/", label: "Home" }];

    // Add role-specific links
    if (
      userRole === "couple" ||
      userRole === "planner" ||
      userRole === "vendor"
    ) {
      return [...baseLinks, { to: "/pricing", label: "Pricing" }];
    }

    // Not logged in, show all public links
    return [
      { to: "/", label: "Home" },
      { to: "/couples", label: "Couples" },
      { to: "/planner", label: "Planner" },
      { to: "/vendor", label: "Vendors" },
      { to: "/pricing", label: "Pricing" },
    ];
  };

  const navLinks = getNavLinks();
  const userLabel =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";

  const logoTarget =
    localStorage.getItem("userRole") === "planner" ||
    location.pathname.startsWith("/planner")
      ? "/planner"
      : localStorage.getItem("userRole") === "couple" ||
        location.pathname.startsWith("/couples") ||
        location.pathname.startsWith("/couple")
      ? "/couples"
      : "/";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex px-2 md:px-4 pt-3 md:pt-[30px] pointer-events-none animate-fadeInDown ${
          isHamburgerLanding ? "justify-between md:justify-end" : "justify-center"
        }`}
      >
        {/* Logo - Desktop */}
        <Link
          to={logoTarget}
          className="absolute left-3 md:left-[15px] top-1 md:top-[18px] pointer-events-auto hidden md:block z-50"
        >
          <img
            src="/images/logo copy.png"
            alt="Lovers AI logo"
            className="h-[95px] w-auto object-contain transition-transform duration-300 hover:scale-105"
          />
        </Link>

        {/* Main Navbar Container — Glassmorphism */}
        <div
          className={`pointer-events-auto relative transition-all duration-300 w-full ${
            isHamburgerLanding
              ? "md:w-auto max-w-none rounded-none bg-transparent shadow-none backdrop-blur-0 border-none"
              : "max-w-[900px] rounded-[28px] md:rounded-full glass-card-strong"
          }`}
        >
          {/* Mobile Layout */}
          <div className="md:hidden px-3 py-3">
            <div className="flex items-center justify-between">
              <Link to={logoTarget} className="pointer-events-auto shrink-0">
                <img
                  src="/images/logo copy.png"
                  alt="Lovers AI logo"
                  className="h-[75px] w-auto object-contain transition-transform duration-300 hover:scale-105"
                />
              </Link>
              <div className="flex items-center gap-3">
                {!currentUser && (
                  <Link
                    to="/login"
                    className="loverai-btn-primary text-[13px] !py-2 !px-4"
                  >
                    Sign In
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-10 h-10 rounded-full border border-white/15 bg-white/10 flex items-center justify-center text-white transition-all duration-300 hover:bg-white/20"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  <div className="flex flex-col gap-[3px]">
                    <span
                      className={`block h-[2px] w-4 bg-white transition-all duration-300 ${mobileMenuOpen ? "translate-y-[5px] rotate-45" : ""}`}
                    />
                    <span
                      className={`block h-[2px] w-4 bg-white transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : "opacity-100"}`}
                    />
                    <span
                      className={`block h-[2px] w-4 bg-white transition-all duration-300 ${mobileMenuOpen ? "-translate-y-[5px] -rotate-45" : ""}`}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div
            className={`hidden md:flex items-center justify-between ${
              isHamburgerLanding
                ? "px-0 py-0 min-h-0"
                : "px-10 py-0 min-h-[64px]"
            }`}
          >
            {isHamburgerLanding ? (
              <div className="mr-2 flex items-center gap-3 md:mr-6">
                <div className="relative" ref={plannerMenuRef}>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="w-14 h-14 rounded-full border border-white/20 bg-[#221917]/85 flex items-center justify-center text-white shadow-xl backdrop-blur-xl transition-all duration-300 hover:bg-[#2d211e]/90"
                    aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={mobileMenuOpen}
                  >
                    <div className="flex flex-col gap-[4px]">
                      <span
                        className={`block h-[2px] w-5 bg-white transition-all duration-300 ${mobileMenuOpen ? "translate-y-[6px] rotate-45" : ""}`}
                      />
                      <span
                        className={`block h-[2px] w-5 bg-white transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : "opacity-100"}`}
                      />
                      <span
                        className={`block h-[2px] w-5 bg-white transition-all duration-300 ${mobileMenuOpen ? "-translate-y-[6px] -rotate-45" : ""}`}
                      />
                    </div>
                  </button>

                  <div
                    className={`absolute right-0 top-full mt-4 w-[320px] rounded-[28px] border border-white/12 bg-[#1a1412]/95 p-4 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
                      mobileMenuOpen
                        ? "pointer-events-auto translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-2 opacity-0"
                    }`}
                  >
                    {currentUser && (
                      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                          Signed in as
                        </p>
                        <p className="mt-1 truncate text-lg font-medium text-white">
                          {userLabel}
                        </p>
                        <p className="truncate text-sm text-white/45">
                          {currentUser.email}
                        </p>
                      </div>
                    )}
                    <nav className="flex flex-col gap-2">
                      {navLinks.map((link) => (
                        <button
                          key={link.to}
                          type="button"
                          onClick={() => handleMenuNavigate(link.to)}
                          className="rounded-2xl px-4 py-3 text-left text-lg font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          {link.label}
                        </button>
                      ))}

                      {currentUser ? (
                        <>
                          {localStorage.getItem("userRole") === "couple" && (
                            <button
                              onClick={() => {
                                navigate("/couple/cart");
                                setMobileMenuOpen(false);
                              }}
                              className="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                            >
                              <span>My Cart</span>
                              {cartCount > 0 && (
                                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-loverai-gold px-2 text-[11px] font-bold text-loverai-dark">
                                  {cartCount}
                                </span>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleProfileClick();
                              setMobileMenuOpen(false);
                            }}
                            className="rounded-2xl px-4 py-3 text-left text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            Profile
                          </button>
                          {isAdminEmail(currentUser?.email) && (
                            <button
                              onClick={() => {
                                navigate("/admin");
                                setMobileMenuOpen(false);
                              }}
                              className="rounded-2xl px-4 py-3 text-left text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                            >
                              Admin
                            </button>
                          )}
                          <button
                            onClick={handleLogout}
                            className="rounded-2xl px-4 py-3 text-left text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                          >
                            Logout
                          </button>
                        </>
                      ) : shouldShowHamburgerSignIn ? (
                        <button
                          onClick={handleSignInClick}
                          className="mt-2 rounded-2xl px-4 py-3 text-left text-white loverai-btn-primary"
                        >
                          Sign In
                        </button>
                      ) : null}
                    </nav>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <nav className="flex items-center gap-12 text-[19px] font-medium text-white">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="relative hover:text-loverai-gold transition-colors duration-300 whitespace-nowrap after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-loverai-gold after:to-amber-600 after:transition-all after:duration-300 hover:after:w-full"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {currentUser ? (
                  <div
                    className="flex items-center gap-3 ml-auto"
                    ref={dropdownRef}
                  >
                    {localStorage.getItem("userRole") === "couple" && (
                      <button
                        onClick={() => navigate("/couple/cart")}
                        className="relative p-2 text-white/80 hover:text-loverai-gold transition-colors"
                        aria-label="Cart"
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 20a1 1 0 1 0 0 2 1 1 0 1 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM3 3h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8.5 16H21v-2H8.5l1.1-2h7.45a2 2 0 0 0 1.9-1.4l2.5-9v-.1H5.21L4.27 2H1v2h2z" />
                        </svg>
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-loverai-gold text-[10px] font-bold text-loverai-dark animate-pulse">
                            {cartCount}
                          </span>
                        )}
                      </button>
                    )}
                    <span className="text-white/80 text-[16px] max-w-[180px] truncate">
                      {currentUser.displayName || currentUser.email?.split("@")[0]}
                    </span>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-9 h-9 bg-gradient-to-br from-loverai-gold to-amber-700 rounded-full flex items-center justify-center text-loverai-dark font-semibold shadow-lg hover:scale-105 transition-transform duration-300"
                      aria-label="User menu"
                    >
                      {getUserInitials()}
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-6 top-full mt-2 w-48 glass-card-strong rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-xs text-white/50">Signed in as</p>
                          <p className="text-sm font-medium text-white truncate">
                            {currentUser.email}
                          </p>
                        </div>
                        <button
                          onClick={handleProfileClick}
                          className="flex items-center w-full px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
                        >
                          <svg
                            className="w-4 h-4 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Profile
                        </button>
                        {isAdminEmail(currentUser?.email) && (
                          <button
                            onClick={() => {
                              navigate("/admin");
                              setDropdownOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
                          >
                            <svg
                              className="w-4 h-4 mr-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Admin
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-white/70 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left border-t border-white/10"
                        >
                          <svg
                            className="w-4 h-4 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ml-auto">
                    <button
                      onClick={handleSignInClick}
                      className="loverai-btn-primary text-[16px] !px-10 inline-block"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div
          className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40 ${
            mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Mobile Menu Panel */}
        <div
          ref={mobilePanelRef}
          className={`md:hidden fixed top-0 right-0 w-[280px] h-full glass-sidebar shadow-2xl transition-transform duration-300 ease-out z-50 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            background: "linear-gradient(180deg, #0f0a07 0%, #0a0604 100%)",
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Link to={logoTarget} className="shrink-0">
              <img
                src="/images/LogoLoversai.png"
                alt="Lovers AI logo"
                className="h-[43px] w-auto object-contain"
              />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
              aria-label="Close menu"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {currentUser && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-loverai-gold to-amber-700 rounded-full flex items-center justify-center text-loverai-dark font-semibold">
                  {getUserInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {currentUser.displayName ||
                      currentUser.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-white/40 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex flex-col p-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => handleMenuNavigate(link.to)}
                className="px-4 py-3 text-white/70 hover:bg-white/10 hover:text-loverai-gold rounded-xl transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {currentUser ? (
              <>
                {localStorage.getItem("userRole") === "couple" && (
                  <button
                    onClick={() => {
                      navigate("/couple/cart");
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 text-white/70 hover:bg-white/10 hover:text-loverai-gold rounded-xl transition-colors text-left mt-2 flex items-center gap-2"
                  >
                    <div className="relative">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 20a1 1 0 1 0 0 2 1 1 0 1 0 0-2zm11 0a1 1 0 1 0 0 2 1 1 0 1 0 0-2zM3 3h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8.5 16H21v-2H8.5l1.1-2h7.45a2 2 0 0 0 1.9-1.4l2.5-9v-.1H5.21L4.27 2H1v2h2z" />
                      </svg>
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-loverai-gold text-[8px] font-bold text-loverai-dark">
                          {cartCount}
                        </span>
                      )}
                    </div>
                    My Cart
                  </button>
                )}
                <button
                  onClick={handleProfileClick}
                  className="px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors text-left mt-2"
                >
                  Profile
                </button>
                {isAdminEmail(currentUser?.email) && (
                  <button
                    onClick={() => {
                      navigate("/admin");
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors text-left mt-2"
                  >
                    Admin
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 text-red-400/80 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors text-left"
                >
                  Logout
                </button>
              </>
            ) : shouldShowHamburgerSignIn ? (
              <button
                onClick={handleSignInClick}
                className="mt-4 px-4 py-3 text-center loverai-btn-primary rounded-xl w-full"
              >
                Sign In
              </button>
            ) : null}
          </nav>
        </div>
      </header>
    </>
  );
};

export default Navbar;

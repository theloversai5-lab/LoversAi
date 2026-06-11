import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { userAPI } from "../api/api";

const defaultFooterLinks = {
  "Lovers AI": [
    { label: "Couples", page: "couples" },
    { label: "Planner", page: "planner" },
    { label: "AI Tools", page: "pitch", target: "ai-tools-section" },
    {
      label: "Subscriptions",
      page: "pitch",
      target: "subscriptions-section",
    },
  ],
  "Client Services": [
    { label: "Contact", action: "contact" },
    { label: "FAQ", page: "faq" },
  ],
  "About Lovers AI": [{ label: "Our Story", page: "ourstory" }],
  Legal: [
    { label: "Privacy Notice", page: "privacy" },
    { label: "Terms & Conditions", page: null },
  ],
};

const plannerFooterLinks = {
  "Planner Hub": [
    { label: "Planner Home", page: "planner" },
    { label: "Planner Dashboard", page: "plannerDashboard" },
    { label: "Planner Vendors", page: "plannerVendors" },
    { label: "Planner AI Tools", page: "pitch", target: "ai-tools-section" },
  ],
  "Planner Support": [
    { label: "Contact", action: "contact" },
    { label: "FAQ", page: "faq" },
  ],
  "Planner Growth": [
    { label: "Planner Onboarding", page: "plannerOnboarding" },
    { label: "Planner Quotes", page: "plannerQuotes" },
    { label: "Planner Deals", page: "plannerDeals" },
  ],
  Legal: [
    { label: "Privacy Notice", page: "privacy" },
    { label: "Terms & Conditions", page: null },
  ],
};

const phoneRules = {
  "+91": { digits: 10, label: "10-digit mobile number" },
  "+1": { digits: 10, label: "10-digit phone number" },
  "+44": { digits: 10, label: "10-digit phone number" },
  "+61": { digits: 9, label: "9-digit phone number" },
  "+971": { digits: 9, label: "9-digit phone number" },
};

const Footer = ({ navigateTo, openContactPopup }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [showLocalContactPopup, setShowLocalContactPopup] = useState(false);
  const [savedPhone, setSavedPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isPlannerHomeFooter = location.pathname === "/planner";
  const isPlannerFooter =
    isPlannerHomeFooter || location.pathname.startsWith("/planner/");
  const footerLinks = isPlannerFooter ? plannerFooterLinks : defaultFooterLinks;
  const fullPhone = `${countryCode} ${phone}`.trim();
  const requiredDigits = phoneRules[countryCode]?.digits || 10;
  const phonePlaceholder = phoneRules[countryCode]?.label || "phone number";

  const handleFooterNavigation = (page, target) => {
    if (typeof navigateTo === "function") {
      navigateTo(page, target);
      return;
    }

    const routeMap = {
      couples: "/couples",
      planner: "/planner",
      plannerDashboard: "/planner/dashboard",
      plannerSignup: "/planner/signup",
      plannerOnboarding: "/planner/onboarding",
      plannerVendors: "/planner/vendors",
      plannerQuotes: "/planner/quotes",
      plannerDeals: "/planner/deals",
      plannerMessages: "/planner/messages",
      pitch: "/planner-ai-tools",
      privacy: "/privacy",
      faq: "/faq",
      ourstory: "/ourstory",
    };

    const path = routeMap[page];
    if (!path) return;

    if (target) {
      sessionStorage.setItem("footerScrollTarget", target);
    }

    navigate(path);
  };

  const handleBookCall = async () => {
    if (phone.length !== requiredDigits) {
      toast.error(`Please enter a valid ${phonePlaceholder}`);
      return;
    }

    if (
      newsletterEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail.trim())
    ) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (typeof openContactPopup === "function") {
      setSavedPhone(fullPhone);
      openContactPopup(fullPhone);
      setPhone("");
      setNewsletterEmail("");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const data = await userAPI.savePhone(fullPhone);

      setSaved(true);
      setSavedPhone(fullPhone);
      setShowLocalContactPopup(true);
      setPhone("");
      setNewsletterEmail("");

      toast.success(data.message || "Saved - we'll reach out soon");
    } catch (err) {
      console.error("Save phone error:", err);
      setSaveError(err.message || "Failed to save");
      setShowLocalContactPopup(true);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const footerBackgroundStyle = {
    "--footer-bg-image": "url('/images/footer.png')",
  };
  const plannerFooterOuterClass =
    "relative z-10 mx-auto w-full max-w-[1400px] rounded-[36px] bg-[linear-gradient(135deg,rgba(231,200,184,0.22),rgba(78,62,57,0.28))] p-0.5 shadow-[0_24px_90px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[28px]";
  const plannerHomeFooterOuterClass =
    "relative z-10 mx-auto w-full max-w-[1650px] overflow-hidden rounded-[36px] border border-transparent bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-[1px] shadow-[0_30px_120px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[40px]";

  return (
    <>
      <footer
        className={
          isPlannerFooter
            ? "relative overflow-hidden bg-transparent px-4 pb-6 pt-8 footer-blurred-bg sm:px-8 lg:px-12 z-40"
            : "fixed bottom-0 left-0 right-0 z-40 overflow-hidden bg-transparent px-6 py-16 footer-blurred-bg sm:px-10 md:px-16 lg:px-24"
        }
        style={footerBackgroundStyle}
      >
        <div
          className="relative z-10 mx-auto w-full max-w-[1400px] rounded-[32px] md:rounded-[40px] p-8 md:p-12 glass-card border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300"
        >
          {isPlannerFooter ? (
            <div className="grid gap-10 md:grid-cols-[1fr_auto_1.25fr] md:gap-12">
              <div className="flex flex-col items-center text-center md:items-center md:text-center md:pl-6">
                <h2
                  className="text-white text-[clamp(28px,2.8vw,54px)] leading-[0.98] tracking-[-0.02em] font-normal text-center"
                  style={{
                    fontFamily: "'Dream Avenue', 'DM Serif Display', serif",
                  }}
                >
                  Built to help
                  <br />
                  planners win better weddings.
                </h2>

                <div className="mt-6 flex flex-col items-center md:items-center">
                  <img
                    src="/images/logo copy.png"
                    alt="Lovers AI Logo"
                    className="h-[140px] md:h-[160px] w-auto object-contain transition-transform duration-300 hover:scale-[1.03]"
                  />

                  <p className="footer-text-font mt-4 text-[11px] text-white/40 tracking-wider">
                    &copy;2025 LoversAI. Planner growth, simplified.
                  </p>
                </div>
              </div>

              <div className="hidden w-[1px] bg-white/10 mx-4 md:block" />

              <div>
                <div className="mb-8">
                  <h3 className="footer-heading-font mb-2 text-[clamp(28px,2.8vw,54px)] leading-[0.98] font-light text-white">
                    Book a planner growth call
                  </h3>
                  <p className="footer-text-font mb-4 text-[13px] text-white/60">
                    Leave your email and phone number and we will help you set up the planner side properly.
                  </p>

                  <div className="space-y-4 pb-2 sm:pb-4">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your work email"
                      className="footer-text-font w-full h-[54px] rounded-[22px] border border-white/10 bg-white/5 px-6 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 transition-all duration-300"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row items-center w-full">
                      <div className="flex flex-1 gap-3 w-full">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="footer-text-font w-[130px] h-[54px] rounded-[22px] border border-white/10 bg-white/5 px-5 text-[14px] text-white focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 transition-all cursor-pointer"
                        >
                          <option
                            value="+91"
                            className="bg-black/90 text-white"
                          >
                            +91 IN
                          </option>
                          <option value="+1" className="bg-black/90 text-white">
                            +1 US
                          </option>
                          <option
                            value="+44"
                            className="bg-black/90 text-white"
                          >
                            +44 UK
                          </option>
                          <option
                            value="+61"
                            className="bg-black/90 text-white"
                          >
                            +61 AU
                          </option>
                          <option
                            value="+971"
                            className="bg-black/90 text-white"
                          >
                            +971 UAE
                          </option>
                        </select>

                        <input
                          type="tel"
                          name="book_call_phone"
                          value={phone}
                          onChange={(e) =>
                            setPhone(
                              e.target.value
                                .replace(/[^\d]/g, "")
                                .slice(0, requiredDigits),
                            )
                          }
                          placeholder={`Enter your ${phonePlaceholder}`}
                          className="footer-text-font flex-1 h-[54px] rounded-[22px] border border-white/10 bg-white/5 px-5 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 transition-all"
                        />
                      </div>

                      <div className="w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={handleBookCall}
                          className="rounded-full px-8 h-[54px] text-sm font-semibold text-black transition-all duration-300 active:scale-95 shadow-md shadow-black/10 hover:shadow-lg flex items-center justify-center shrink-0 cursor-pointer w-full sm:w-auto"
                          style={{ backgroundColor: "#D0B1A4" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.filter = "brightness(1.08)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.filter = "none")
                          }
                        >
                          {saving ? "Saving..." : "Book a Free Call"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-8 gap-x-4 sm:grid-cols-4 pt-8 border-t border-white/10">
                  {Object.keys(footerLinks).map((category) => (
                    <div key={category}>
                      <h4 className="footer-heading-font mb-3.5 text-sm font-semibold tracking-wider uppercase text-white/50">
                        {category}
                      </h4>

                      <ul className="space-y-2">
                        {footerLinks[category].map((item) => (
                          <li key={item.label}>
                            {item.page || item.action ? (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  if (item.action === "contact") {
                                    if (
                                      typeof openContactPopup === "function"
                                    ) {
                                      openContactPopup(fullPhone);
                                    } else {
                                      setShowLocalContactPopup(true);
                                    }
                                  } else {
                                    handleFooterNavigation(
                                      item.page,
                                      item.target,
                                    );
                                  }
                                }}
                                className="footer-text-font cursor-pointer text-sm font-normal text-white/70 transition-colors duration-200 hover:text-loverai-gold"
                              >
                                {item.label}
                              </span>
                            ) : (
                              <span className="footer-text-font text-sm font-normal text-white/30">
                                {item.label}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-10 md:grid-cols-[1fr_auto_1.25fr] md:gap-12">
              <div className="flex flex-col items-center text-center md:items-center md:text-center md:pl-6">
                <h2
                  className="text-white text-2xl md:text-[32px] lg:text-[36px] leading-[1.1] tracking-[-0.02em] font-normal text-center"
                  style={{
                    fontFamily: "'Dream Avenue', 'DM Serif Display', serif",
                  }}
                >
                  Let&apos;s Work
                  <br />
                  With Expert!
                </h2>

                <div className="mt-6 flex flex-col items-center md:items-center">
                  <img
                    src="/images/logo copy.png"
                    alt="Lovers AI Logo"
                    className="h-[140px] md:h-[160px] w-auto object-contain transition-transform duration-300 hover:scale-[1.03]"
                  />

                  <p className="footer-text-font mt-4 text-[11px] text-white/40 tracking-wider">
                    &copy;2025 LoversAI. All rights reserved.
                  </p>
                </div>
              </div>

              <div className="hidden w-[1px] bg-white/10 mx-4 md:block" />

              <div>
                <div className="mb-8">
                  <h3 className="footer-heading-font mb-4 text-[clamp(28px,2.8vw,54px)] leading-[0.98] font-light text-white">
                    Join our newsletter
                  </h3>

                  <div className="space-y-4 pb-2 sm:pb-4">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="footer-text-font w-full h-[54px] rounded-[22px] border border-white/10 bg-white/5 px-6 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 transition-all duration-300"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row items-center w-full">
                      <div className="flex flex-1 gap-3 w-full">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="footer-text-font w-[130px] h-[54px] rounded-[22px] border border-white/10 bg-white/5 px-5 text-[14px] text-white focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 transition-all cursor-pointer"
                        >
                          <option
                            value="+91"
                            className="bg-black/90 text-white"
                          >
                            +91 IN
                          </option>
                          <option value="+1" className="bg-black/90 text-white">
                            +1 US
                          </option>
                          <option
                            value="+44"
                            className="bg-black/90 text-white"
                          >
                            +44 UK
                          </option>
                          <option
                            value="+61"
                            className="bg-black/90 text-white"
                          >
                            +61 AU
                          </option>
                          <option
                            value="+971"
                            className="bg-black/90 text-white"
                          >
                            +971 UAE
                          </option>
                        </select>

                        <input
                          type="tel"
                          name="book_call_phone"
                          value={phone}
                          onChange={(e) =>
                            setPhone(
                              e.target.value
                                .replace(/[^\d]/g, "")
                                .slice(0, requiredDigits),
                            )
                          }
                          placeholder={`Enter your ${phonePlaceholder}`}
                          className="footer-text-font flex-1 h-[54px] rounded-[22px] border border-white/10 bg-white/5 px-5 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 transition-all"
                        />
                      </div>

                      <div className="w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={handleBookCall}
                          className="rounded-full px-8 h-[54px] text-sm font-semibold text-black transition-all duration-300 active:scale-95 shadow-md shadow-black/10 hover:shadow-lg flex items-center justify-center shrink-0 cursor-pointer w-full sm:w-auto"
                          style={{ backgroundColor: "#D0B1A4" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.filter = "brightness(1.08)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.filter = "none")
                          }
                        >
                          {saving ? "Saving..." : "Book a Free Call"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-8 gap-x-4 sm:grid-cols-4 pt-8 border-t border-white/10">
                  {Object.keys(footerLinks).map((category) => (
                    <div key={category}>
                      <h4 className="footer-heading-font mb-3.5 text-sm font-semibold tracking-wider uppercase text-white/50">
                        {category}
                      </h4>

                      <ul className="space-y-2">
                        {footerLinks[category].map((item) => (
                          <li key={item.label}>
                            {item.page || item.action ? (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  if (item.action === "contact") {
                                    if (
                                      typeof openContactPopup === "function"
                                    ) {
                                      openContactPopup(fullPhone);
                                    } else {
                                      setShowLocalContactPopup(true);
                                    }
                                  } else {
                                    handleFooterNavigation(
                                      item.page,
                                      item.target,
                                    );
                                  }
                                }}
                                className="footer-text-font cursor-pointer text-sm font-normal text-white/70 transition-colors duration-200 hover:text-loverai-gold"
                              >
                                {item.label}
                              </span>
                            ) : (
                              <span className="footer-text-font text-sm font-normal text-white/30">
                                {item.label}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>

      {showLocalContactPopup && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60"
          onClick={() => setShowLocalContactPopup(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/6 p-6 text-white shadow-xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-2xl font-bold">Contact Us</h2>

            <p className="mb-4 text-white/90">
              {saved
                ? "Saved - we'll reach out to you shortly."
                : "We'll reach out to you shortly."}
            </p>

            <div className="mb-4">
              <div className="text-sm text-white/70">Phone</div>
              <div className="text-lg font-medium">
                {savedPhone || phone || "(not provided)"}
              </div>
            </div>

            {newsletterEmail && (
              <div className="mb-4">
                <div className="text-sm text-white/70">Email</div>
                <div className="text-lg font-medium break-all">
                  {newsletterEmail}
                </div>
              </div>
            )}

            {saveError && (
              <p className="mb-4 text-sm text-red-300">{saveError}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowLocalContactPopup(false)}
                className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;

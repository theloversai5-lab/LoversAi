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
  "Planner Platform": [
    { label: "Planner Home", page: "planner" },
    { label: "Planner Dashboard", page: "plannerDashboard" },
    { label: "Planner Signup", page: "plannerSignup" },
  ],
  "Growth Tools": [
    { label: "Planner AI Tools", page: "pitch" },
    { label: "Vendor Network", page: "plannerVendors" },
    { label: "Book a Call", action: "contact" },
  ],
  Support: [
    { label: "Planner FAQ", page: "faq" },
    { label: "Our Story", page: "ourstory" },
    { label: "Contact Support", action: "contact" },
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

  const isPlannerFooter =
    location.pathname === "/planner" || location.pathname.startsWith("/planner/");
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
      plannerVendors: "/planner/vendors",
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

  const footerBackgroundStyle = isPlannerFooter
    ? { "--footer-bg-image": "url('/images/footer.png')" }
    : location.pathname === "/"
      ? { "--footer-bg-image": "url('/images/footer.png')" }
      : location.pathname === "/couples"
        ? { "--footer-bg-image": "url('/images/signup.png')" }
        : { "--footer-bg-image": "none" };

  return (
    <>
      <footer
<<<<<<< HEAD
        className={
          isPlannerFooter
            ? "relative overflow-hidden bg-transparent px-4 pb-10 pt-16 footer-blurred-bg sm:px-8 lg:px-12"
            : "fixed bottom-0 left-0 right-0 z-40 overflow-hidden bg-transparent px-6 py-16 footer-blurred-bg sm:px-10 md:px-16 lg:px-24"
        }
        style={footerBackgroundStyle}
      >
        <div
          className={
            isPlannerFooter
              ? "relative z-10 mx-auto w-full max-w-6xl rounded-[36px] border border-white/12 bg-[linear-gradient(145deg,rgba(17,10,8,0.9),rgba(41,24,21,0.78))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8 lg:p-10"
              : "relative z-10 mx-auto w-full max-w-[1400px] rounded-[40px] border border-white/15 p-8 shadow-[0_0_60px_rgba(255,255,255,0.05)] backdrop-blur-md md:p-12"
          }
          style={
            isPlannerFooter
              ? undefined
              : {
                  background: "rgba(255, 255, 255, 0.08)",
                }
          }
        >
          {isPlannerFooter ? (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
              <div className="flex flex-col gap-7">
                <div className="space-y-4">
                  <span className="footer-text-font inline-flex w-fit rounded-full border border-[#e9cfc1]/20 bg-[#f7e4db]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f4ddd4]">
                    For Wedding Planners
                  </span>
                  <h2 className="footer-heading-font max-w-xl text-[clamp(38px,5vw,62px)] leading-[0.98] text-white">
                    Built to help planners win better weddings.
                  </h2>
                  <p className="footer-text-font max-w-xl text-sm leading-7 text-[#f5e8e1]/72 sm:text-base">
                    Discover qualified leads, pitch faster, and manage vendor
                    coordination from one polished workflow.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    "Qualified couple leads",
                    "AI-powered pitch support",
                    "Vendor-ready coordination",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-[#f8ede8]/82 backdrop-blur-md"
=======
        className="fixed bottom-0 left-0 right-0 overflow-hidden px-6 py-16 sm:px-10 md:px-16 lg:px-24 bg-transparent footer-blurred-bg z-40"
        style={{
          "--footer-bg-image": "url('/images/footer.png')",
        }}
      >
        <div
          className="relative z-10 mx-auto max-w-[1400px] w-full rounded-[32px] md:rounded-[40px] p-8 md:p-12 glass-card border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300"
        >
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
                <h3 className="footer-heading-font mb-4 text-2xl md:text-[28px] font-light text-white">
                  Join our newsletter
                </h3>

                <div className="space-y-4">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="footer-text-font w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 text-sm transition-all duration-300"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row items-stretch">
                    <div className="flex flex-1 gap-3">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="footer-text-font w-[110px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 text-sm transition-all cursor-pointer"
                      >
                        <option value="+91" className="bg-black/90 text-white">+91 IN</option>
                        <option value="+1" className="bg-black/90 text-white">+1 US</option>
                        <option value="+44" className="bg-black/90 text-white">+44 UK</option>
                        <option value="+61" className="bg-black/90 text-white">+61 AU</option>
                        <option value="+971" className="bg-black/90 text-white">+971 UAE</option>
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
                        className="footer-text-font flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-loverai-gold/50 focus:border-loverai-gold/50 text-sm transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleBookCall}
                      className="rounded-full px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 active:scale-95 shadow-md shadow-black/10 hover:shadow-lg flex items-center justify-center shrink-0 cursor-pointer"
                      style={{ backgroundColor: "#D0B1A4" }}
                      onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
>>>>>>> origin/Ai-tools
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <img
                    src="/images/logo copy.png"
                    alt="Lovers AI Logo"
                    className="h-16 w-auto object-contain"
                  />
                  <p className="footer-text-font text-sm text-[#f5e8e1]/58">
                    &copy;2025 LoversAI. Planner growth, simplified.
                  </p>
                </div>
              </div>

<<<<<<< HEAD
              <div className="space-y-8">
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-6">
                  <div className="mb-6">
                    <h3 className="footer-heading-font text-[30px] font-light text-white sm:text-[34px]">
                      Book a planner growth call
                    </h3>
                    <p className="footer-text-font mt-2 max-w-xl text-sm leading-6 text-[#f5e8e1]/66">
                      Leave your email and phone number and we will help you
                      set up the planner side properly.
                    </p>
=======
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
                                  if (typeof openContactPopup === "function") {
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
>>>>>>> origin/Ai-tools
                  </div>

                  <div className="grid gap-4">
                    <label className="footer-text-font grid gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f5e8e1]/58">
                      Email Address
                      <input
                        type="email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Enter your work email"
                        className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.08] px-4 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#dcb6a6]"
                      />
                    </label>

                    <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)_210px]">
                      <label className="footer-text-font grid gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f5e8e1]/58">
                        Country
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.08] px-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#dcb6a6]"
                        >
                          <option value="+91">+91 IN</option>
                          <option value="+1">+1 US</option>
                          <option value="+44">+44 UK</option>
                          <option value="+61">+61 AU</option>
                          <option value="+971">+971 UAE</option>
                        </select>
                      </label>

                      <label className="footer-text-font grid gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#f5e8e1]/58">
                        Phone Number
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
                          className="h-14 w-full rounded-[18px] border border-white/10 bg-white/[0.08] px-4 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#dcb6a6]"
                        />
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleBookCall}
                          className="h-14 w-full rounded-[18px] bg-[#d0b1a4] px-6 text-[15px] font-semibold text-[#1f1411] transition hover:brightness-95"
                        >
                          {saving ? "Saving..." : "Book a Free Call"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  {Object.keys(footerLinks).map((category) => (
                    <div key={category}>
                      <h4 className="footer-heading-font mb-4 text-lg text-white">
                        {category}
                      </h4>

                      <ul className="space-y-3">
                        {footerLinks[category].map((item) => (
                          <li key={item.label}>
                            {item.page || item.action ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.action === "contact") {
                                    if (typeof openContactPopup === "function") {
                                      openContactPopup(fullPhone);
                                    } else {
                                      setShowLocalContactPopup(true);
                                    }
                                  } else {
                                    handleFooterNavigation(item.page, item.target);
                                  }
                                }}
                                className="footer-text-font text-left text-sm font-light text-[#f2dfd8]/72 transition hover:text-white"
                              >
                                {item.label}
                              </button>
                            ) : (
                              <span className="footer-text-font text-sm font-light text-[#f2dfd8]/42">
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
              <div className="flex flex-col items-center text-center md:items-center md:pl-12 md:text-center">
                <h2
                  className="text-white"
                  style={{
                    fontFamily: "'Dream Avenue', 'DM Serif Display', serif",
                    fontSize: "48px",
                    lineHeight: "1.1",
                    letterSpacing: "-0.02em",
                    fontWeight: 400,
                  }}
                >
                  Let&apos;s Work
                  <br />
                  With Expert!
                </h2>

                <div className="mt-8 flex flex-col items-center md:items-center">
                  <img
                    src="/images/logo copy.png"
                    alt="Lovers AI Logo"
                    className="h-[205px] w-auto object-contain"
                  />

                  <p className="footer-text-font mt-6 text-sm text-gray-300">
                    &copy;2025 LoversAI. All rights reserved.
                  </p>
                </div>
              </div>

              <div className="mx-8 hidden w-[1px] bg-white/50 md:block" />

              <div>
                <div className="mb-10">
                  <h3 className="footer-heading-font mb-6 text-[32px] font-light text-white">
                    Join our newsletter
                  </h3>

                  <div className="space-y-5">
                    <div className="rounded-[26px] border border-white/12 bg-white/[0.08] p-3 backdrop-blur-lg">
                      <input
                        type="email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="footer-text-font w-full rounded-[20px] bg-transparent px-4 py-3 text-white placeholder:text-white/55 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="flex flex-1 flex-col gap-4 sm:flex-row">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="footer-text-font rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                        >
                          <option value="+91">+91 IN</option>
                          <option value="+1">+1 US</option>
                          <option value="+44">+44 UK</option>
                          <option value="+61">+61 AU</option>
                          <option value="+971">+971 UAE</option>
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
                          className="footer-text-font flex-1 rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/55 focus:outline-none focus:ring-2 focus:ring-pink-300"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleBookCall}
                        className="rounded-full px-7 py-3.5 text-[14px] font-semibold text-black transition hover:opacity-50"
                        style={{ backgroundColor: "#D0B1A4" }}
                      >
                        {saving ? "Saving..." : "Book a Free Call"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                  {Object.keys(footerLinks).map((category) => (
                    <div key={category}>
                      <h4 className="footer-heading-font mb-4 text-lg text-white">
                        {category}
                      </h4>

                      <ul className="space-y-2.5">
                        {footerLinks[category].map((item) => (
                          <li key={item.label}>
                            {item.page || item.action ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.action === "contact") {
                                    if (typeof openContactPopup === "function") {
                                      openContactPopup(fullPhone);
                                    } else {
                                      setShowLocalContactPopup(true);
                                    }
                                  } else {
                                    handleFooterNavigation(item.page, item.target);
                                  }
                                }}
                                className="footer-text-font text-left text-sm font-light text-gray-300 transition hover:text-white"
                              >
                                {item.label}
                              </button>
                            ) : (
                              <span className="footer-text-font text-sm font-light text-gray-400">
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

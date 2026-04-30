import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { userAPI } from "../api/api";

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

  const phoneRules = {
    "+91": { digits: 10, label: "10-digit mobile number" },
    "+1": { digits: 10, label: "10-digit phone number" },
    "+44": { digits: 10, label: "10-digit phone number" },
    "+61": { digits: 9, label: "9-digit phone number" },
    "+971": { digits: 9, label: "9-digit phone number" },
  };

  const footerLinks = {
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

      toast.success(data.message || "Saved — we'll reach out soon");
    } catch (err) {
      console.error("Save phone error:", err);
      setSaveError(err.message || "Failed to save");
      setShowLocalContactPopup(true);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <footer
        className="fixed bottom-0 left-0 right-0 overflow-hidden px-6 py-16 sm:px-10 md:px-16 lg:px-24 bg-transparent footer-blurred-bg z-40"
        style={
          location.pathname === "/"
            ? {
                "--footer-bg-image": "url('/images/footer.png')",
              }
            : location.pathname === "/couples"
              ? {
                  "--footer-bg-image": "url('/images/signup.png')",
                }
              : { "--footer-bg-image": "none" }
        }
      >
        <div
          className="relative z-10 mx-auto max-w-[1400px] w-full rounded-[40px] border border-white/15 p-8 shadow-[0_0_60px_rgba(255,255,255,0.05)] backdrop-blur-md md:p-12"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="grid gap-10 md:grid-cols-[1fr_auto_1.25fr] md:gap-12">
            <div className="flex flex-col items-center text-center md:items-center md:text-center md:pl-12">
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

            <div className="hidden w-[1px] bg-white/50 mx-8 md:block" />

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
                              className="footer-text-font cursor-pointer text-sm font-light text-gray-300 transition hover:text-white"
                            >
                              {item.label}
                            </span>
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
                ? "Saved — we'll reach out to you shortly."
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

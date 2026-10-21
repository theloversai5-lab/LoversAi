import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";



/* ─── Section Data ─── */
const PRIVACY_SECTIONS = [
  { id: "info-collect", num: "01", title: "Information We Collect" },
  { id: "auto-info", num: "02", title: "Automatically Collected Information" },
  { id: "uploaded-content", num: "03", title: "Uploaded Content & Event Data" },
  { id: "how-we-use", num: "04", title: "How We Use Information" },
  { id: "ai-processing", num: "05", title: "AI Processing & Generated Outputs" },
  { id: "sharing", num: "06", title: "Information Sharing" },
  { id: "legal", num: "07", title: "Legal Disclosures" },
  { id: "security", num: "08", title: "Data Security" },
  { id: "retention", num: "09", title: "Data Retention" },
  { id: "rights", num: "10", title: "Your Rights" },
  { id: "children", num: "11", title: "Children's Privacy" },
  { id: "third-party", num: "12", title: "Third-Party Services" },
  { id: "transfers", num: "13", title: "International Transfers" },
  { id: "updates", num: "14", title: "Policy Updates" },
  { id: "contact", num: "15", title: "Contact Information" },
];

const COOKIE_SECTIONS = [
  { id: "what-are-cookies", num: "01", title: "What Are Cookies" },
  { id: "essential-cookies", num: "02", title: "Essential Cookies" },
  { id: "analytics-cookies", num: "03", title: "Analytics & Performance Cookies" },
  { id: "functional-cookies", num: "04", title: "Functionality Cookies" },
  { id: "marketing-cookies", num: "05", title: "Marketing & Advertising Cookies" },
  { id: "third-party-cookies", num: "06", title: "Third-Party Cookies" },
  { id: "managing-cookies", num: "07", title: "Managing Cookies" },
  { id: "similar-tech", num: "08", title: "Similar Technologies" },
  { id: "cookie-updates", num: "09", title: "Updates to This Policy" },
  { id: "cookie-contact", num: "10", title: "Contact Information" },
];

const SECTIONS = [...PRIVACY_SECTIONS, ...COOKIE_SECTIONS];

/* ─── Animated Section Wrapper ─── */
const AnimatedSection = ({ id, children }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="scroll-mt-28"
    >
      {children}
    </motion.section>
  );
};
// TODO: Review policy with legal team before production release.
// TODO: Update the effective date during deployment.
/* ─── Section Header ─── */
const SectionHeader = ({ num, title }) => (
  <div className="flex items-center gap-4 mb-5">
    <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold tracking-wider"
      style={{ background: "rgba(230, 198, 178, 0.12)", color: "#e6c6b2", border: "1px solid rgba(230, 198, 178, 0.18)" }}>
      {num}
    </span>
    <h2 className="text-xl md:text-2xl font-heading text-white tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
      {title}
    </h2>
  </div>
);

/* ─── Paragraph ─── */
const P = ({ children, className = "" }) => (
  <p className={`text-white/65 text-[14.5px] leading-[1.8] font-light mb-4 ${className}`}>{children}</p>
);

/* ─── Divider ─── */
const SectionDivider = () => (
  <div className="my-10 md:my-12 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(230, 198, 178, 0.15), transparent)" }} />
);

/* ─── Copy Link Button ─── */
const CopyLinkButton = ({ sectionId }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/privacy#${sectionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-1.5 rounded-lg hover:bg-white/5"
      title="Copy link to section"
      aria-label={`Copy link to ${sectionId} section`}
    >
      {copied ? (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
    </button>
  );
};

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  /* SEO */
  useEffect(() => {
    document.title = "Privacy Policy | Lovers AI";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "Learn how Lovers AI collects, uses, stores, processes, and protects your information, including details about cookies, AI processing, and data security.";
  }, []);

  /* Scroll tracking */
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    setShowBackToTop(scrollTop > 500);

    /* Active section detection */
    const sectionEls = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    let current = "";
    for (const el of sectionEls) {
      if (el.getBoundingClientRect().top <= 160) {
        current = el.id;
      }
    }
    setActiveSection(current);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* Hash scroll on load */
  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const serif = { fontFamily: "'Cormorant Garamond', serif" };

  const pageStyle = {
    minHeight: "100vh",
    backgroundImage: "linear-gradient(to bottom, rgba(20, 12, 10, 0.75) 0%, rgba(10, 5, 4, 0.95) 100%), url('/images/signup.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div style={pageStyle} className="relative">
      {/* ── Scroll Progress Bar ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px]" style={{ background: "rgba(10, 6, 4, 0.5)" }}>
        <motion.div
          className="h-full"
          style={{ background: "linear-gradient(90deg, #e6c6b2, #d4a878)", width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* ── Ambient Glows ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[15%] left-[8%] w-[380px] h-[380px] rounded-full" style={{ background: "rgba(230, 198, 178, 0.06)", filter: "blur(130px)" }} />
        <div className="absolute bottom-[20%] right-[6%] w-[300px] h-[300px] rounded-full" style={{ background: "rgba(136, 88, 68, 0.08)", filter: "blur(120px)" }} />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-32">
        {/* ══════════════════════════
           HERO SECTION
           ══════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-4xl pt-28 md:pt-36 pb-10 text-center"
        >
          {/* Hero Card */}
          <div className="glass-card-strong rounded-[28px] md:rounded-[36px] p-8 md:p-12 lg:p-16 relative overflow-hidden">
            {/* Gradient accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #e6c6b2, transparent)" }} />

            <p className="text-[11px] uppercase tracking-[0.35em] text-white/40 mb-6 font-medium">Lovers AI</p>

            <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-light text-white leading-[0.95] mb-6" style={serif}>
              Privacy Policy
            </h1>

            <p className="text-white/55 text-[15px] md:text-base leading-relaxed max-w-2xl mx-auto mb-8 font-light">
              This Privacy Policy explains how Lovers AI collects, uses, processes, stores, and protects information when you access and use our platform.
            </p>

            {/* Meta badge */}
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold" style={{ background: "rgba(230, 198, 178, 0.1)", border: "1px solid rgba(230, 198, 178, 0.2)", color: "#e6c6b2" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Privacy & Data Protection
              </span>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════
           MAIN CONTENT
           ══════════════════════════ */}
        <div className="mx-auto max-w-6xl">
          <div className="flex gap-8 lg:gap-12 relative">

            {/* ── Sticky TOC (Desktop) ── */}
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-28">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">Privacy Policy</h3>
                  <nav aria-label="Privacy Policy Contents" className="mb-8">
                    <ul className="space-y-1">
                      {PRIVACY_SECTIONS.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => scrollToSection(s.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all duration-300 ${
                              activeSection === s.id
                                ? "bg-white/8 text-loverai-gold font-medium"
                                : "text-white/45 hover:text-white/70 hover:bg-white/[0.03]"
                            }`}
                          >
                            <span className="text-[11px] font-mono mr-2 opacity-50">{s.num}</span>
                            {s.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">Cookie Policy</h3>
                  <nav aria-label="Cookie Policy Contents">
                    <ul className="space-y-1">
                      {COOKIE_SECTIONS.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => scrollToSection(s.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all duration-300 ${
                              activeSection === s.id
                                ? "bg-white/8 text-loverai-gold font-medium"
                                : "text-white/45 hover:text-white/70 hover:bg-white/[0.03]"
                            }`}
                          >
                            <span className="text-[11px] font-mono mr-2 opacity-50">{s.num}</span>
                            {s.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </motion.div>
              </div>
            </aside>

            {/* ── Mobile TOC ── */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
              {tocOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="glass-card-strong rounded-2xl p-4 mb-3 max-h-[60vh] overflow-y-auto custom-scrollbar"
                >
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Privacy Policy</h3>
                  <nav aria-label="Privacy Policy Contents" className="mb-6">
                    <ul className="space-y-0.5">
                      {PRIVACY_SECTIONS.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => scrollToSection(s.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                              activeSection === s.id
                                ? "bg-white/8 text-loverai-gold font-medium"
                                : "text-white/50 hover:text-white/70"
                            }`}
                          >
                            <span className="text-[11px] font-mono mr-2 opacity-50">{s.num}</span>
                            {s.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Cookie Policy</h3>
                  <nav aria-label="Cookie Policy Contents">
                    <ul className="space-y-0.5">
                      {COOKIE_SECTIONS.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => scrollToSection(s.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                              activeSection === s.id
                                ? "bg-white/8 text-loverai-gold font-medium"
                                : "text-white/50 hover:text-white/70"
                            }`}
                          >
                            <span className="text-[11px] font-mono mr-2 opacity-50">{s.num}</span>
                            {s.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </motion.div>
              )}
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="w-full glass-card-strong rounded-2xl px-5 py-3.5 flex items-center justify-between text-sm font-medium text-white/80"
                aria-label="Toggle table of contents"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Table of Contents
                </span>
                <svg className={`w-4 h-4 text-white/40 transition-transform duration-300 ${tocOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>

            {/* ── Legal Document Content ── */}
            <main className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="glass-card rounded-[24px] md:rounded-[32px] p-6 md:p-10 lg:p-12"
              >
                {/* ── 01 Information We Collect ── */}
                <AnimatedSection id="info-collect">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="01" title="Information We Collect" />
                      <P>We may collect information that you voluntarily provide to us, including your name, email address, phone number, company name, business details, account credentials, payment information, venue information, event preferences, uploaded images, documents, messages, and any other information that you choose to provide while using the Platform.</P>
                    </div>
                    <CopyLinkButton sectionId="info-collect" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 02 Automatically Collected Information ── */}
                <AnimatedSection id="auto-info">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="02" title="Automatically Collected Information" />
                      <P>We may automatically collect certain technical information including your IP address, browser type, device information, operating system, language preferences, pages visited, session duration, usage patterns, clickstream data, referral URLs, and other analytics information generated through your interaction with the Platform.</P>
                    </div>
                    <CopyLinkButton sectionId="auto-info" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 03 Uploaded Content & Event Data ── */}
                <AnimatedSection id="uploaded-content">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="03" title="Uploaded Content & Event Data" />
                      <P>We may collect and process venue photographs, floor plans, design inspirations, event details, guest preferences, and other materials uploaded by users for the purpose of generating AI-powered visualizations, concepts, recommendations, and other Platform functionalities.</P>
                    </div>
                    <CopyLinkButton sectionId="uploaded-content" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 04 How We Use Information ── */}
                <AnimatedSection id="how-we-use">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="04" title="How We Use Information" />
                      <P>We use the information collected to provide, operate, maintain, improve, personalize, and secure the Platform; process transactions; communicate with users; provide customer support; generate AI-powered outputs; analyze user behavior; detect fraud and security incidents; conduct research and development activities; and comply with applicable legal and regulatory obligations.</P>
                    </div>
                    <CopyLinkButton sectionId="how-we-use" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 05 AI Processing & Generated Outputs ── */}
                <AnimatedSection id="ai-processing">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="05" title="AI Processing & Generated Outputs" />
                      <P>Our Platform utilizes artificial intelligence and machine learning technologies that may process information uploaded by users in order to generate visualizations, recommendations, and related outputs. Such processing is performed solely to provide and improve the services offered through the Platform.</P>
                      
                      <div className="mt-6 rounded-xl p-5 md:p-6" style={{
                        background: "linear-gradient(135deg, rgba(230, 198, 178, 0.08), rgba(230, 198, 178, 0.03))",
                        border: "1px solid rgba(230, 198, 178, 0.18)",
                      }}>
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 shrink-0 mt-0.5 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <div>
                            <p className="text-loverai-gold font-semibold text-sm mb-1">AI Notice</p>
                            <p className="text-loverai-gold/70 text-[13px] leading-relaxed">Uploaded venue photos, event details, design preferences, and related materials may be processed by our AI systems to generate visualizations, concepts, and planning recommendations.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CopyLinkButton sectionId="ai-processing" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 06 Information Sharing ── */}
                <AnimatedSection id="sharing">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="06" title="Information Sharing" />
                      <P>We may share information with our employees, affiliates, contractors, service providers, cloud hosting providers, payment processors, analytics providers, communication service providers, professional advisors, and other trusted third parties strictly on a need-to-know basis for the operation and improvement of the Platform.</P>
                    </div>
                    <CopyLinkButton sectionId="sharing" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 07 Legal Disclosures ── */}
                <AnimatedSection id="legal">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="07" title="Legal Disclosures" />
                      <P>We may disclose your information if required by law, regulation, court order, governmental authority, legal process, or where such disclosure is reasonably necessary to protect our rights, enforce our agreements, investigate fraud or security incidents, or protect the safety and rights of users and third parties.</P>
                    </div>
                    <CopyLinkButton sectionId="legal" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 08 Data Security ── */}
                <AnimatedSection id="security">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="08" title="Data Security" />
                      <P>We implement commercially reasonable administrative, technical, and organizational safeguards designed to protect information against unauthorized access, alteration, disclosure, loss, misuse, and destruction. However, no method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security of information.</P>
                    </div>
                    <CopyLinkButton sectionId="security" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 09 Data Retention ── */}
                <AnimatedSection id="retention">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="09" title="Data Retention" />
                      <P>We retain personal information only for as long as reasonably necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, enforce agreements, and protect legitimate business interests.</P>
                    </div>
                    <CopyLinkButton sectionId="retention" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 10 Your Rights ── */}
                <AnimatedSection id="rights">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="10" title="Your Rights" />
                      <P>Depending on applicable law, you may have the right to access, update, correct, delete, restrict processing of, or request a copy of your personal information. You may also have the right to withdraw consent for certain processing activities, subject to legal and contractual limitations.</P>
                    </div>
                    <CopyLinkButton sectionId="rights" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 11 Children's Privacy ── */}
                <AnimatedSection id="children">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="11" title="Children's Privacy" />
                      <P>The Platform is not directed toward individuals under the age of eighteen (18) years, and we do not knowingly collect personal information from minors. If we become aware that information has been collected from a minor without appropriate authorization, we reserve the right to delete such information.</P>
                    </div>
                    <CopyLinkButton sectionId="children" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 12 Third-Party Services ── */}
                <AnimatedSection id="third-party">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="12" title="Third-Party Services" />
                      <P>The Platform may contain links to third-party websites, applications, or services. We are not responsible for the privacy practices, content, or security measures implemented by such third parties, and users are encouraged to review their respective privacy policies before interacting with them.</P>
                    </div>
                    <CopyLinkButton sectionId="third-party" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 13 International Transfers ── */}
                <AnimatedSection id="transfers">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="13" title="International Transfers" />
                      <P>In connection with our business operations, your information may be processed and stored in jurisdictions outside your country of residence. By using the Platform, you consent to the transfer, storage, and processing of your information in accordance with this Privacy Policy and applicable laws.</P>
                    </div>
                    <CopyLinkButton sectionId="transfers" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 14 Policy Updates ── */}
                <AnimatedSection id="updates">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="14" title="Policy Updates" />
                      <P>We reserve the right to amend, modify, or update this Privacy Policy from time to time. Updated versions shall become effective immediately upon publication on the Platform. Continued use of the Platform following any modifications constitutes acceptance of the revised Privacy Policy.</P>
                    </div>
                    <CopyLinkButton sectionId="updates" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 15 Contact Information ── */}
                <AnimatedSection id="contact">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="15" title="Contact Information" />

                      {/* Contact Card */}
                      <div className="mt-6 rounded-2xl p-6 md:p-8 relative overflow-hidden" style={{
                        background: "linear-gradient(135deg, rgba(230, 198, 178, 0.08), rgba(230, 198, 178, 0.02))",
                        border: "1px solid rgba(230, 198, 178, 0.15)",
                      }}>
                        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(230, 198, 178, 0.3), transparent)" }} />

                        <h3 className="text-lg font-heading text-white mb-5" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Lovers AI</h3>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(230, 198, 178, 0.1)" }}>
                              <svg className="w-4 h-4 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-white/35 mb-0.5">Email</p>
                              <a href="mailto:privacy@loversai.com" className="text-[14px] text-loverai-gold hover:underline transition-colors">privacy@loversai.com</a>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(230, 198, 178, 0.1)" }}>
                              <svg className="w-4 h-4 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-white/35 mb-0.5">Website</p>
                              <a href="https://www.loversai.com" target="_blank" rel="noopener noreferrer" className="text-[14px] text-loverai-gold hover:underline transition-colors">www.loversai.com</a>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(230, 198, 178, 0.1)" }}>
                              <svg className="w-4 h-4 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-white/35 mb-0.5">Address</p>
                              <p className="text-[14px] text-white/60">Registered Office Address</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CopyLinkButton sectionId="contact" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ══════════════════════════
                   COOKIE POLICY SECTION
                   ══════════════════════════ */}
                <div className="mt-20 mb-12">
                  <h2 className="text-[32px] md:text-[40px] font-light text-white leading-tight mb-4" style={serif}>
                    Cookie Policy
                  </h2>
                  <div className="h-px w-full" style={{ background: "linear-gradient(90deg, rgba(230, 198, 178, 0.3), transparent)" }} />
                </div>

                <div className="mb-12 rounded-xl p-5 md:p-6" style={{
                  background: "linear-gradient(135deg, rgba(230, 198, 178, 0.08), rgba(230, 198, 178, 0.03))",
                  border: "1px solid rgba(230, 198, 178, 0.18)",
                }}>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-loverai-gold/90 text-[14px] leading-relaxed">We use cookies and similar technologies to improve platform functionality, personalize experiences, analyze performance, maintain security, and enhance our services.</p>
                    </div>
                  </div>
                </div>

                {/* ── 01 What Are Cookies ── */}
                <AnimatedSection id="what-are-cookies">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="01" title="What Are Cookies" />
                      <P>Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.</P>
                    </div>
                    <CopyLinkButton sectionId="what-are-cookies" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 02 Essential Cookies ── */}
                <AnimatedSection id="essential-cookies">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="02" title="Essential Cookies" />
                      <P>These cookies are strictly necessary to provide you with services available through our Platform and to use some of its features, such as access to secure areas.</P>
                    </div>
                    <CopyLinkButton sectionId="essential-cookies" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 03 Analytics & Performance Cookies ── */}
                <AnimatedSection id="analytics-cookies">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="03" title="Analytics & Performance Cookies" />
                      <P>These cookies collect information that is used either in aggregate form to help us understand how our Platform is being used or how effective our marketing campaigns are, or to help us customize our Platform for you.</P>
                    </div>
                    <CopyLinkButton sectionId="analytics-cookies" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 04 Functionality Cookies ── */}
                <AnimatedSection id="functional-cookies">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="04" title="Functionality Cookies" />
                      <P>These cookies are used to recognize you when you return to our Platform. This enables us to personalize our content for you and remember your preferences.</P>
                    </div>
                    <CopyLinkButton sectionId="functional-cookies" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 05 Marketing & Advertising Cookies ── */}
                <AnimatedSection id="marketing-cookies">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="05" title="Marketing & Advertising Cookies" />
                      <P>These cookies record your visit to our Platform, the pages you have visited, and the links you have followed. We may use this information to make our Platform and advertising more relevant to your interests.</P>
                    </div>
                    <CopyLinkButton sectionId="marketing-cookies" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 06 Third-Party Cookies ── */}
                <AnimatedSection id="third-party-cookies">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="06" title="Third-Party Cookies" />
                      <P>In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Platform, deliver advertisements on and through the Platform, and so on.</P>
                    </div>
                    <CopyLinkButton sectionId="third-party-cookies" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 07 Managing Cookies ── */}
                <AnimatedSection id="managing-cookies">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="07" title="Managing Cookies" />
                      <P>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager or by amending your web browser controls to accept or refuse cookies.</P>
                    </div>
                    <CopyLinkButton sectionId="managing-cookies" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 08 Similar Technologies ── */}
                <AnimatedSection id="similar-tech">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="08" title="Similar Technologies" />
                      <P>We may also use other tracking technologies, such as web beacons or pixel tags, to help deliver cookies, count visits, understand usage, and campaign effectiveness.</P>
                    </div>
                    <CopyLinkButton sectionId="similar-tech" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 09 Updates to This Policy ── */}
                <AnimatedSection id="cookie-updates">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="09" title="Updates to This Policy" />
                      <P>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons.</P>
                    </div>
                    <CopyLinkButton sectionId="cookie-updates" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 10 Contact Information ── */}
                <AnimatedSection id="cookie-contact">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="10" title="Contact Information" />
                      <P>If you have questions about our use of cookies or other technologies, please email us at privacy@loversai.com.</P>
                    </div>
                    <CopyLinkButton sectionId="cookie-contact" />
                  </div>
                </AnimatedSection>

              </motion.div>
            </main>
          </div>
        </div>
      </div>

      {/* ── Back to Top Button ── */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg lg:bottom-8 lg:right-8"
          style={{
            background: "linear-gradient(135deg, #e6c6b2, #d4a878)",
            boxShadow: "0 4px 20px rgba(230, 198, 178, 0.3)",
          }}
          aria-label="Back to top"
        >
          <svg className="w-5 h-5 text-[#1a100b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}

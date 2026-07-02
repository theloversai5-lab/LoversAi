import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";

/* ─── Section Data ─── */
const SECTIONS = [
  { id: "eligibility", num: "01", title: "Eligibility" },
  { id: "services", num: "02", title: "Description of Services" },
  { id: "accounts", num: "03", title: "User Accounts" },
  { id: "user-content", num: "04", title: "User Content" },
  { id: "ai-outputs", num: "05", title: "AI-Generated Outputs" },
  { id: "ip", num: "06", title: "Intellectual Property" },
  { id: "payments", num: "07", title: "Payments and Subscriptions" },
  { id: "acceptable-use", num: "08", title: "Acceptable Use" },
  { id: "third-party", num: "09", title: "Third-Party Services" },
  { id: "privacy", num: "10", title: "Privacy" },
  { id: "liability", num: "11", title: "Limitation of Liability" },
  { id: "indemnification", num: "12", title: "Indemnification" },
  { id: "suspension", num: "13", title: "Suspension and Termination" },
  { id: "warranties", num: "14", title: "Disclaimer of Warranties" },
  { id: "governing-law", num: "15", title: "Governing Law and Jurisdiction" },
  { id: "changes", num: "16", title: "Changes to Terms" },
  { id: "contact", num: "17", title: "Contact Information" },
];



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
// TODO: Review terms with legal team before production release.
// TODO: Add links to Privacy Policy and Contact Us page.
/* ─── Paragraph ─── */
const P = ({ children, className = "" }) => (
  <p className={`text-white/65 text-[14.5px] leading-[1.8] font-light mb-4 ${className}`}>{children}</p>
);

/* ─── Bullet List ─── */
const BulletList = ({ items }) => (
  <ul className="space-y-2.5 mb-5 ml-1">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-3">
        <span className="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full" style={{ background: "#e6c6b2" }} />
        <span className="text-white/65 text-[14px] leading-[1.75] font-light">{item}</span>
      </li>
    ))}
  </ul>
);

/* ─── Divider ─── */
const SectionDivider = () => (
  <div className="my-10 md:my-12 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(230, 198, 178, 0.15), transparent)" }} />
);

/* ─── Copy Link Button ─── */
const CopyLinkButton = ({ sectionId }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/terms-and-conditions#${sectionId}`;
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
export default function TermsAndConditions() {
  const [activeSection, setActiveSection] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  /* SEO */
  useEffect(() => {
    document.title = "Terms & Conditions | Lovers AI";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "Read the official Terms & Conditions governing your use of Lovers AI's AI-powered event visualization and planning platform.";
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
    backgroundImage: "linear-gradient(to bottom, rgba(20, 12, 10, 0.75) 0%, rgba(10, 5, 4, 0.95) 100%), url('/images/signup.png')",
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
              Terms &amp; Conditions
            </h1>

            <p className="text-white/55 text-[15px] md:text-base leading-relaxed max-w-2xl mx-auto mb-8 font-light">
              Please read these Terms and Conditions carefully before using Lovers AI. By accessing our platform, you agree to be bound by the terms outlined below.
            </p>

            {/* Meta badge */}
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold" style={{ background: "rgba(230, 198, 178, 0.1)", border: "1px solid rgba(230, 198, 178, 0.2)", color: "#e6c6b2" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Legally Binding Agreement
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
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-4">Contents</h3>
                  <nav aria-label="Table of Contents">
                    <ul className="space-y-1">
                      {SECTIONS.map((s) => (
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
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Contents</h3>
                  <nav aria-label="Table of Contents">
                    <ul className="space-y-0.5">
                      {SECTIONS.map((s) => (
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
                {/* ── 01 Eligibility ── */}
                <AnimatedSection id="eligibility">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="01" title="Eligibility" />
                      <P>You must be at least 18 years of age and capable of entering into legally binding contracts under applicable law. By using the Platform, you represent and warrant that you satisfy these requirements.</P>
                    </div>
                    <CopyLinkButton sectionId="eligibility" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 02 Description of Services ── */}
                <AnimatedSection id="services">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="02" title="Description of Services" />
                      <P>Lovers AI provides AI-powered event visualization and planning solutions, including but not limited to:</P>
                      <BulletList items={[
                        "AI-generated event concepts and mood boards",
                        "Venue transformation and visualization",
                        "Customized event renderings based on user preferences",
                        "Planning assistance and related digital services",
                      ]} />
                      <P>The Platform is intended for informational and visualization purposes and does not constitute architectural, engineering, legal, or professional advice.</P>
                    </div>
                    <CopyLinkButton sectionId="services" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 03 User Accounts ── */}
                <AnimatedSection id="accounts">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="03" title="User Accounts" />
                      <P>You may be required to create an account to access certain features.</P>
                      <P>You agree to:</P>
                      <BulletList items={[
                        "Provide accurate and complete information",
                        "Maintain the confidentiality of your account credentials",
                        "Be responsible for all activities conducted through your account",
                        "Notify us immediately of any unauthorized use of your account",
                      ]} />
                      <P>We reserve the right to suspend or terminate accounts that violate these Terms.</P>
                    </div>
                    <CopyLinkButton sectionId="accounts" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 04 User Content ── */}
                <AnimatedSection id="user-content">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="04" title="User Content" />
                      <P>You retain ownership of the information, images, text, venue details, and other content you upload (&quot;User Content&quot;).</P>
                      <P>By submitting User Content, you grant Lovers AI a non-exclusive, worldwide, royalty-free license to:</P>
                      <BulletList items={[
                        "Host, process, display, reproduce, and analyze such content solely for providing and improving the Platform",
                        "Generate AI outputs and visualizations based on your submissions",
                      ]} />
                      <P>You represent and warrant that:</P>
                      <BulletList items={[
                        "You own or have all necessary rights to the User Content",
                        "The content does not infringe any third-party rights",
                        "The content does not violate applicable laws",
                      ]} />
                    </div>
                    <CopyLinkButton sectionId="user-content" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 05 AI-Generated Outputs ── */}
                <AnimatedSection id="ai-outputs">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="05" title="AI-Generated Outputs" />
                      <P>The Platform uses artificial intelligence to generate concepts, visualizations, and recommendations.</P>
                      <P>You acknowledge that:</P>
                      <BulletList items={[
                        "AI outputs are illustrative and conceptual in nature",
                        "Generated designs may not perfectly reflect actual venues, products, dimensions, or final event execution",
                        "AI outputs may occasionally contain inaccuracies or similarities to third-party content",
                      ]} />
                      <P>Lovers AI does not guarantee that AI-generated outputs are unique, error-free, or suitable for any specific purpose.</P>
                    </div>
                    <CopyLinkButton sectionId="ai-outputs" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 06 Intellectual Property ── */}
                <AnimatedSection id="ip">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="06" title="Intellectual Property" />
                      <P>All rights, title, and interest in and to the Platform, including software, trademarks, logos, algorithms, designs, databases, and proprietary technologies, are owned by Lovers AI or its licensors.</P>
                      <P>Except as expressly permitted, you may not:</P>
                      <BulletList items={[
                        "Copy, reproduce, distribute, modify, or reverse engineer the Platform",
                        "Use our trademarks without written authorization",
                        "Build competing products using our proprietary technologies or outputs",
                      ]} />
                    </div>
                    <CopyLinkButton sectionId="ip" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 07 Payments and Subscriptions ── */}
                <AnimatedSection id="payments">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="07" title="Payments and Subscriptions" />
                      <P>Certain services may be offered on a paid basis.</P>
                      <P>By purchasing any subscription or service:</P>
                      <BulletList items={[
                        "You agree to pay all applicable fees and taxes",
                        "Payments are strictly non-refundable under all circumstances unless required by applicable law",
                        "We reserve the right to revise pricing at our discretion",
                      ]} />
                      <P>Failure to pay may result in suspension or termination of services.</P>

                      {/* Warning box */}
                      <div className="mt-6 rounded-xl p-5 md:p-6" style={{
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03))",
                        border: "1px solid rgba(239, 68, 68, 0.18)",
                      }}>
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <div>
                            <p className="text-red-300 font-semibold text-sm mb-1">NO REFUND POLICY</p>
                            <p className="text-red-300/70 text-[13px] leading-relaxed">All purchases, subscriptions, credits, AI generations, and digital services provided by Lovers AI are final and non-refundable except where required under applicable law.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CopyLinkButton sectionId="payments" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 08 Acceptable Use ── */}
                <AnimatedSection id="acceptable-use">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="08" title="Acceptable Use" />
                      <P>You agree not to:</P>
                      <BulletList items={[
                        "Upload unlawful, harmful, fraudulent, or infringing content",
                        "Attempt unauthorized access to our systems",
                        "Use the Platform to create misleading, defamatory, or illegal materials",
                        "Interfere with the security or operation of the Platform",
                        "Use automated tools to scrape or extract Platform data without permission",
                      ]} />
                    </div>
                    <CopyLinkButton sectionId="acceptable-use" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 09 Third-Party Services ── */}
                <AnimatedSection id="third-party">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="09" title="Third-Party Services" />
                      <P>The Platform may integrate with third-party services, websites, or applications.</P>
                      <P>We do not control and are not responsible for:</P>
                      <BulletList items={[
                        "Third-party products or services",
                        "Their availability, security, or content",
                        "Any losses arising from your interactions with such third parties",
                      ]} />
                      <P>Your use of third-party services is subject to their own terms and policies.</P>
                    </div>
                    <CopyLinkButton sectionId="third-party" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 10 Privacy ── */}
                <AnimatedSection id="privacy">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="10" title="Privacy" />
                      <P>Our collection and processing of personal information are governed by our Privacy Policy.</P>
                      <P>By using the Platform, you consent to such collection and processing in accordance with applicable data protection laws.</P>
                      <a
                        href="/privacy"
                        className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 hover:gap-3"
                        style={{ background: "rgba(230, 198, 178, 0.1)", border: "1px solid rgba(230, 198, 178, 0.2)", color: "#e6c6b2" }}
                      >
                        View Privacy Policy
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                    <CopyLinkButton sectionId="privacy" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 11 Limitation of Liability ── */}
                <AnimatedSection id="liability">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="11" title="Limitation of Liability" />
                      <P>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL LOVERS AI, ITS DIRECTORS, OFFICERS, EMPLOYEES, AFFILIATES, AGENTS, CONTRACTORS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:</P>
                      <BulletList items={[
                        "Your access to or use of or inability to access or use the Platform",
                        "Any conduct or content of any third party on the Platform",
                        "Any content obtained from the Platform",
                        "Unauthorized access, use, or alteration of your transmissions or content",
                      ]} />
                      <P>IN NO EVENT SHALL LOVERS AI'S TOTAL AGGREGATE LIABILITY EXCEED THE AMOUNT YOU HAVE PAID TO LOVERS AI IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED US DOLLARS (USD $100), WHICHEVER IS GREATER.</P>
                    </div>
                    <CopyLinkButton sectionId="liability" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 12 Indemnification ── */}
                <AnimatedSection id="indemnification">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="12" title="Indemnification" />
                      <P>You agree to defend, indemnify, and hold harmless Lovers AI and its officers, directors, employees, contractors, agents, licensors, and affiliates from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney&apos;s fees) arising from:</P>
                      <BulletList items={[
                        "Your use of and access to the Platform",
                        "Your violation of any term of these Terms",
                        "Your violation of any third-party right, including without limitation any intellectual property, privacy, or proprietary right",
                        "Any claim that your User Content caused damage to a third party",
                      ]} />
                      <P>This defense and indemnification obligation will survive these Terms and your use of the Platform.</P>
                    </div>
                    <CopyLinkButton sectionId="indemnification" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 13 Suspension and Termination ── */}
                <AnimatedSection id="suspension">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="13" title="Suspension and Termination" />
                      <P>We may, at our sole discretion, suspend or terminate your access to all or part of the Platform at any time, with or without notice, for any reason, including but not limited to:</P>
                      <BulletList items={[
                        "Violation of these Terms",
                        "Conduct that we determine to be harmful to other users, third parties, or the business interests of Lovers AI",
                        "Extended periods of inactivity",
                        "Requests by law enforcement or government agencies",
                      ]} />
                      <P>Upon termination, your right to use the Platform will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</P>
                    </div>
                    <CopyLinkButton sectionId="suspension" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 14 Disclaimer of Warranties ── */}
                <AnimatedSection id="warranties">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="14" title="Disclaimer of Warranties" />
                      <P>THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</P>
                      <P>LOVERS AI DOES NOT WARRANT THAT:</P>
                      <BulletList items={[
                        "The Platform will function uninterrupted, secure, or error-free",
                        "The results obtained from the Platform will be accurate or reliable",
                        "Any errors in the Platform will be corrected",
                        "AI-generated content will meet your specific requirements or expectations",
                      ]} />
                      <P>YOU EXPRESSLY UNDERSTAND AND AGREE THAT YOUR USE OF THE PLATFORM IS AT YOUR SOLE RISK.</P>
                    </div>
                    <CopyLinkButton sectionId="warranties" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 15 Governing Law and Jurisdiction ── */}
                <AnimatedSection id="governing-law">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="15" title="Governing Law and Jurisdiction" />
                      <P>These Terms shall be governed by and construed in accordance with the laws of India.</P>
                      <P>Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India.</P>
                    </div>
                    <CopyLinkButton sectionId="governing-law" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 16 Changes to Terms ── */}
                <AnimatedSection id="changes">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="16" title="Changes to Terms" />
                      <P>We reserve the right to modify these Terms at any time.</P>
                      <P>Updated Terms shall become effective upon publication on the Platform. Continued use of the Platform constitutes acceptance of the revised Terms.</P>
                    </div>
                    <CopyLinkButton sectionId="changes" />
                  </div>
                </AnimatedSection>

                <SectionDivider />

                {/* ── 17 Contact Information ── */}
                <AnimatedSection id="contact">
                  <div className="group flex items-start">
                    <div className="flex-1">
                      <SectionHeader num="17" title="Contact Information" />
                      <P>If you have any questions about these Terms, please contact us:</P>

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
                              <a href="mailto:support@loversai.com" className="text-[14px] text-loverai-gold hover:underline transition-colors">support@loversai.com</a>
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
                              <p className="text-[14px] text-white/60">Registered Office, New Delhi, India</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CopyLinkButton sectionId="contact" />
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

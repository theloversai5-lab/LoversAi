import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
// TODO: Refine content and animations based on design feedback.
// TODO: Replace placeholder images with brand assets.
// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const Section = ({ children, className = "", id }) => (
  <section id={id} className={`py-20 md:py-32 relative ${className}`}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
      {children}
    </div>
  </section>
);

const SectionTitle = ({ children, align = "center" }) => (
  <motion.h2 
    variants={fadeUp}
    className={`text-3xl md:text-5xl lg:text-6xl text-white font-light mb-6 md:mb-8 ${align === "center" ? "text-center" : "text-left"}`}
    style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
  >
    {children}
  </motion.h2>
);

export default function OurStory() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "About Us | Lovers AI";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "Learn about Lovers AI, our mission, vision, and how we're transforming event planning through artificial intelligence and visualization technology.";
  }, []);

  const pageStyle = {
    minHeight: "100vh",
    backgroundImage: "linear-gradient(to bottom, rgba(20, 12, 10, 0.85) 0%, rgba(10, 5, 4, 0.98) 100%), url('/images/signup.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div style={pageStyle} className="relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full" style={{ background: "rgba(230, 198, 178, 0.04)", filter: "blur(150px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full" style={{ background: "rgba(136, 88, 68, 0.05)", filter: "blur(150px)" }} />
      </div>

      {/* SECTION 1: HERO */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto"
          >
            <motion.p variants={fadeUp} className="text-loverai-gold uppercase tracking-[0.3em] text-sm font-medium mb-6">
              Welcome to Lovers AI
            </motion.p>
            <motion.h1 
              variants={fadeUp}
              className="text-5xl md:text-7xl lg:text-8xl text-white font-light mb-8 leading-[1.1]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Reimagining Event Planning with <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #e6c6b2, #d4a878)" }}>Artificial Intelligence</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/60 text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto leading-relaxed">
              Lovers AI transforms ideas, inspirations, and venue concepts into beautiful visual experiences that help users plan events with confidence.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto px-8 py-4 rounded-full text-[#1a100b] font-medium transition-all duration-300 hover:scale-105"
                style={{ background: "linear-gradient(135deg, #e6c6b2, #d4a878)" }}
              >
                Get Started
              </button>
              <button 
                onClick={() => navigate("/")}
                className="w-full sm:w-auto px-8 py-4 rounded-full text-white font-medium transition-all duration-300 hover:bg-white/5 border border-white/10"
              >
                Explore Studio
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: WHO WE ARE */}
      <Section id="who-we-are">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          <div>
            <SectionTitle align="left">Who We Are</SectionTitle>
            <motion.p variants={fadeUp} className="text-white/70 text-lg font-light leading-relaxed mb-6">
              Lovers AI is an AI-powered event visualization platform built to help couples, planners, venue owners, and creative professionals transform ideas into stunning visual concepts.
            </motion.p>
            <motion.p variants={fadeUp} className="text-white/70 text-lg font-light leading-relaxed">
              Our platform combines creativity and artificial intelligence to make event planning more intuitive, efficient, and inspiring.
            </motion.p>
          </div>
          <motion.div variants={fadeUp} className="relative">
            <div className="glass-card-strong rounded-3xl p-8 aspect-square relative overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at center, rgba(230,198,178,0.4) 0%, transparent 70%)" }} />
               <svg className="w-32 h-32 text-loverai-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
               </svg>
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* SECTION 3: OUR STORY */}
      <Section id="our-story" className="bg-white/[0.02] border-y border-white/5">
        <SectionTitle>Our Story</SectionTitle>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-4xl mx-auto space-y-8 mt-16"
        >
          {[
            "Event planning often begins with imagination.",
            "People spend countless hours searching for inspiration, saving references, and trying to communicate ideas to planners and vendors.",
            "Yet visualizing how an event will actually look remains one of the biggest challenges in planning.",
            "Lovers AI was created to bridge the gap between imagination and reality.",
            "By leveraging artificial intelligence, we help users explore concepts, visualize venues, and discover possibilities before making important decisions."
          ].map((text, i) => (
            <motion.div 
              key={i}
              variants={fadeUp}
              className={`glass-card rounded-2xl p-8 md:p-10 transition-all duration-300 hover:bg-white/[0.05] ${i % 2 !== 0 ? "ml-auto" : "mr-auto"} max-w-2xl relative`}
            >
              <div className="absolute top-8 -left-4 w-8 h-px bg-loverai-gold/30 hidden md:block" />
              <p className="text-white/80 text-lg md:text-xl font-light leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* SECTION 4: OUR MISSION */}
      <Section id="mission">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="glass-card-strong rounded-[40px] p-12 md:p-24 text-center max-w-5xl mx-auto relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-loverai-gold to-transparent opacity-50" />
          <SectionTitle>Our Mission</SectionTitle>
          <h3 className="text-2xl md:text-4xl text-loverai-gold font-light mb-8 leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            "To make event visualization simple, intelligent, and accessible for everyone."
          </h3>
          <p className="text-white/60 text-lg md:text-xl font-light max-w-3xl mx-auto leading-relaxed">
            We believe everyone should have access to tools that help bring their ideas to life. Our mission is to empower users with AI-driven visualizations that simplify planning, reduce uncertainty, and unlock creativity.
          </p>
        </motion.div>
      </Section>

      {/* SECTION 5: OUR VISION */}
      <Section id="vision">
        <div className="text-center max-w-4xl mx-auto">
          <SectionTitle>Our Vision</SectionTitle>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="text-white/80 text-xl md:text-3xl font-light leading-relaxed mb-8" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              We envision a future where anyone can instantly visualize their dream celebration before it becomes reality.
            </motion.p>
            <motion.p variants={fadeUp} className="text-white/50 text-lg font-light leading-relaxed">
              By combining creativity with artificial intelligence, Lovers AI aims to redefine how events are imagined, designed, and planned worldwide.
            </motion.p>
          </motion.div>
        </div>
      </Section>

      {/* SECTION 6: WHAT WE DO */}
      <Section id="what-we-do" className="bg-white/[0.02] border-y border-white/5">
        <SectionTitle>What We Do</SectionTitle>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16"
        >
          {[
            { title: "AI Event Concepts", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
            { title: "Mood Board Generation", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { title: "Venue Visualization", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
            { title: "Venue Transformation", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
            { title: "Theme Exploration", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
            { title: "Decor Inspiration", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
            { title: "Personalized Recommendations", icon: "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" },
            { title: "Planning Assistance", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" }
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="glass-card rounded-2xl p-6 group hover:bg-white/[0.04] transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-loverai-gold/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              </div>
              <h4 className="text-white font-medium mb-2">{item.title}</h4>
              <div className="h-0.5 w-8 bg-gradient-to-r from-loverai-gold to-transparent group-hover:w-16 transition-all duration-300" />
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* SECTION 7: WHY LOVERS AI */}
      <Section id="why-lovers-ai">
        <SectionTitle>Why Choose Lovers AI</SectionTitle>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 max-w-5xl mx-auto"
        >
          {[
            { title: "AI-Powered Creativity", desc: "Generate event concepts in seconds." },
            { title: "Better Decision Making", desc: "Preview possibilities before investing time and money." },
            { title: "Faster Planning", desc: "Reduce time spent searching for inspiration." },
            { title: "Personalized Experience", desc: "Receive recommendations tailored to your preferences." }
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="glass-card-strong rounded-3xl p-8 md:p-10 hover:-translate-y-1 transition-transform duration-300">
              <h4 className="text-2xl text-loverai-gold font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{item.title}</h4>
              <p className="text-white/60 font-light text-lg">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* SECTION 8: OUR VALUES */}
      <Section id="our-values" className="bg-white/[0.02] border-y border-white/5">
        <SectionTitle>Our Values</SectionTitle>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="flex flex-wrap justify-center gap-6 mt-16 max-w-6xl mx-auto"
        >
          {[
            { title: "Innovation", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
            { title: "Creativity", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
            { title: "Transparency", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
            { title: "Excellence", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
            { title: "Customer Focus", icon: "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" }
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="glass-card rounded-2xl p-8 flex-1 min-w-[200px] max-w-[250px] text-center group hover:bg-white/[0.04] transition-all duration-300">
              <div className="w-14 h-14 mx-auto rounded-full bg-loverai-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              </div>
              <h4 className="text-white font-medium">{item.title}</h4>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* SECTION 9: WHO WE SERVE */}
      <Section id="who-we-serve">
        <SectionTitle>Who We Serve</SectionTitle>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mt-16 max-w-5xl mx-auto"
        >
          {[
            "Couples Planning Weddings",
            "Event Planners",
            "Venue Owners",
            "Decor Professionals",
            "Corporate Event Organizers",
            "Creative Agencies"
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="glass-card rounded-2xl p-6 md:p-8 text-center hover:border-loverai-gold/30 transition-colors duration-300">
              <p className="text-white/80 font-medium">{item}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* SECTION 10: OUR TECHNOLOGY */}
      <Section id="our-technology" className="bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <SectionTitle>Powered by Advanced AI</SectionTitle>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.p variants={fadeUp} className="text-white/70 text-lg md:text-xl font-light leading-relaxed mb-8">
              Lovers AI leverages advanced artificial intelligence technologies to generate visualizations, concepts, recommendations, and planning assistance.
            </motion.p>
            <motion.p variants={fadeUp} className="text-white/70 text-lg md:text-xl font-light leading-relaxed mb-16">
              Our technology continuously evolves to provide smarter, faster, and more personalized experiences.
            </motion.p>
            
            <motion.div variants={fadeUp} className="relative h-40 md:h-64 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(230,198,178,0.15),transparent_50%)]" />
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="glass-card-strong w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center relative z-10"
              >
                <svg className="w-12 h-12 md:w-16 md:h-16 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </Section>

      {/* SECTION 11: COMMITMENT TO USERS */}
      <Section id="commitment">
        <SectionTitle>Our Commitment</SectionTitle>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="flex flex-col gap-4 mt-16 max-w-4xl mx-auto"
        >
          {[
            "Privacy & Security",
            "Reliable Experiences",
            "Continuous Innovation",
            "User-Centered Design",
            "Platform Excellence"
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="glass-card rounded-2xl p-6 flex items-center gap-4 group hover:bg-white/[0.04] transition-colors duration-300">
              <div className="w-2 h-2 rounded-full bg-loverai-gold" />
              <p className="text-white/90 font-medium text-lg">{item}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* SECTION 12: CONTACT SECTION */}
      <Section id="contact" className="bg-white/[0.02] border-y border-white/5">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="max-w-2xl mx-auto"
        >
          <SectionTitle>Get In Touch</SectionTitle>
          <div className="glass-card-strong rounded-[32px] p-10 md:p-14 relative overflow-hidden mt-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-loverai-gold to-transparent opacity-50" />
            
            <div>
              <h3 className="text-3xl text-white font-light mb-8" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Lovers AI</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-white/40 uppercase tracking-wider text-xs mb-1">Email</p>
                  <a href="mailto:support@loversai.com" className="text-loverai-gold hover:underline text-lg">support@loversai.com</a>
                </div>
                <div>
                  <p className="text-white/40 uppercase tracking-wider text-xs mb-1">Website</p>
                  <a href="http://www.loversai.com" target="_blank" rel="noreferrer" className="text-loverai-gold hover:underline text-lg">www.loversai.com</a>
                </div>
                <div>
                  <p className="text-white/40 uppercase tracking-wider text-xs mb-1">Address</p>
                  <p className="text-white/80 text-lg">Registered Office Address</p>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <button 
                onClick={() => window.location.href = "mailto:support@loversai.com"}
                className="px-8 py-4 rounded-full text-[#1a100b] font-medium transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(230,198,178,0.2)]"
                style={{ background: "linear-gradient(135deg, #e6c6b2, #d4a878)" }}
              >
                Contact Support
              </button>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* SECTION 13: FINAL CTA */}
      <Section id="final-cta" className="pb-32">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="glass-card-strong rounded-[40px] p-12 md:p-24 text-center max-w-5xl mx-auto relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,198,178,0.1),transparent_70%)]" />
          <h2 className="text-4xl md:text-6xl text-white font-light mb-6 relative z-10 leading-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            Ready to Bring Your Vision to Life?
          </h2>
          <p className="text-white/60 text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto relative z-10 leading-relaxed">
            Explore AI-powered event visualization and discover new possibilities for your next celebration.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
            <button 
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto px-10 py-4 rounded-full text-[#1a100b] font-medium transition-all duration-300 hover:scale-105 text-lg"
              style={{ background: "linear-gradient(135deg, #e6c6b2, #d4a878)" }}
            >
              Start Creating
            </button>
            <button 
              onClick={() => navigate("/")}
              className="w-full sm:w-auto px-10 py-4 rounded-full text-white font-medium transition-all duration-300 hover:bg-white/5 border border-white/10 text-lg"
            >
              Explore Studio
            </button>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}

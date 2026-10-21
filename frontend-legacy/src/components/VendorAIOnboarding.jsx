import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, UploadCloud, Wand2, Download } from "lucide-react";
import PricingCards from "./PricingCards";
import VendorGuideCarousel from "./VendorGuideCarousel";

export default function VendorAIOnboarding({ config }) {
  const navigate = useNavigate();

  const handleProceed = () => {
    window.open(config.redirectUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-12 animate-fadeInUp pb-24">
      {/* Top Bar: Back */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* SECTION 1 — HEADER */}
      <div className="max-w-3xl flex flex-col items-start">
        <h1 className="font-heading text-4xl text-white md:text-5xl lg:text-[56px] font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {config.title}
        </h1>
        <p className="text-white/70 mt-4 leading-relaxed font-light text-sm md:text-base max-w-2xl">
          {config.description}
        </p>
        <button
          onClick={handleProceed}
          className="mt-6 bg-gradient-to-r from-[#e6c6b2] via-[#e8cbba] to-[#d4a878] text-[#201913] font-extrabold text-[11px] md:text-xs tracking-widest uppercase px-8 py-3.5 rounded-full hover:brightness-110 shadow-lg shadow-[#d4a878]/25 transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2"
        >
          {config.buttonText}
          <ArrowRight className="w-4 h-4 text-[#201913]" strokeWidth={2.5} />
        </button>
      </div>

      {/* SECTION 2 — INTERACTIVE GUIDE CAROUSEL */}
      {config.slides && <VendorGuideCarousel slides={config.slides} />}

      {/* SECTION 2.5 — QUICK TIPS */}
      {config.quickTips && config.quickTips.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-lg mt-8">
          <h3 className="text-xl font-medium text-white mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Quick Tips
          </h3>
          <ul className="space-y-3">
            {config.quickTips.map((tip, index) => (
              <li key={index} className="flex items-start text-sm text-white/70">
                <span className="text-loverai-gold mr-3 mt-1">•</span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SECTION 3 — HOW IT WORKS */}
      <div className="space-y-6">
        <h2 className="text-2xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.steps.map((step, index) => {
            const icons = [UploadCloud, Wand2, Download];
            const StepIcon = icons[index % icons.length];
            const stepNumber = String(index + 1).padStart(2, '0');

            return (
              <div 
                key={index}
                className="relative glass-card rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 hover-glow overflow-hidden flex flex-col items-center text-center group"
              >
                {/* Background Large Number */}
                <div className="absolute bottom-0 right-2 text-[80px] md:text-[100px] font-bold text-white/5 leading-none pointer-events-none select-none transition-transform group-hover:scale-105 duration-500" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {stepNumber}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mb-6 bg-white/5 relative z-10">
                  <StepIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>

                {/* Step Pill */}
                <div className="border border-white/10 rounded-full px-5 py-1 mb-6 bg-white/5 relative z-10">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase">
                    STEP {index + 1}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl text-white mb-4 relative z-10" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-white/60 leading-relaxed mb-8 flex-grow px-2 font-light relative z-10">
                  {step.description}
                </p>

                {/* Arrow */}
                <div className="mt-auto relative z-10">
                  <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" strokeWidth={1.5} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4 — SUBSCRIPTION PLANS */}
      <div className="space-y-8 pt-8 border-t border-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-light text-white mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Choose Your Plan
          </h2>
          <p className="text-sm text-white/50 max-w-xl mx-auto">
            Select the plan that best fits your needs to unlock the full potential of {config.title}.
          </p>
        </div>
        <PricingCards showOnlyRole="planner" />
      </div>

      {/* SECTION 5 — PROCEED */}
      <div className="pt-12 pb-12 flex justify-center">
        <button
          onClick={handleProceed}
          className="bg-gradient-to-r from-[#e6c6b2] via-[#e8cbba] to-[#d4a878] text-[#201913] font-extrabold text-xs md:text-sm tracking-widest uppercase px-12 py-4 rounded-full hover:brightness-110 shadow-lg shadow-[#d4a878]/25 transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center gap-2.5"
        >
          {config.buttonText}
          <ArrowRight className="w-4.5 h-4.5 text-[#201913]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

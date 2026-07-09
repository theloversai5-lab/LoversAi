import React from "react";
import PricingCards from "../components/PricingCards";

const PricingPage = () => {
  const serif = { fontFamily: "'Cormorant Garamond', serif" };
  const pageStyle = {
    minHeight: "100vh",
    backgroundImage: "linear-gradient(to bottom, rgba(20, 12, 10, 0.65) 0%, rgba(10, 5, 4, 0.85) 100%), url('/images/signup.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div style={pageStyle} className="px-4 pb-24">
      <div className="mx-auto max-w-7xl">
        <div className="pt-32" />

        <h2 className="mb-4 text-center text-4xl md:text-5xl lg:text-[56px] font-light text-white" style={serif}>
          Choose Your Wedding Planning Plan
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/70 text-sm md:text-base leading-relaxed font-light">
          Unlock the full potential of AI-powered moodboards, designer decor visions, and direct planner proposals custom tailored for your special day.
        </p>

        <PricingCards />
      </div>
    </div>
  );
};

export default PricingPage;


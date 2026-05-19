import React from 'react';

const portfolioImages = [
  "/images/0_2.jpg",
  "/images/0_0 (1).jpg",
  "/images/0_1.jpg",
  "/images/0_0.jpg",
  "/images/0_3 (2).jpg",
  "/images/0_1 (1).jpg"
];

const PortfolioSection = () => (
  <section className="relative overflow-hidden py-20 px-4">
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: 'url("/images/signup.png")' }}
    />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,5,4,0.08),rgba(8,5,4,0.28))]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,236,220,0.12),transparent_34%)]" />

    <div className="relative z-10 text-center">
      <h2 className="text-[#fff4e8] heading-font" style={{ fontWeight: 400, fontSize: '72px', letterSpacing: '-0.02em', lineHeight: '1' }}>
        Portfolio
      </h2>
      <p className="text-[#f0e0cf] heading-font" style={{ fontWeight: 400, fontSize: '48px', letterSpacing: '-0.02em', marginTop: '8px' }}>
        ( See Who did it first ? )
      </p>
    </div>

    <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-12">
      {portfolioImages.map((src, index) => (
        <div key={index} className="group relative rounded-[28px] overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))] z-10 pointer-events-none" />
          <img
            src={src}
            alt={`Portfolio ${index + 1}`}
            className="w-full h-[540px] object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  </section>
);

export default PortfolioSection;

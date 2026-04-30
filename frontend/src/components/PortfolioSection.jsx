import React from 'react';

const portfolioImages = [
  "./images/0_2.jpg",
  "./images/0_0 (1).jpg",
  "./images/0_1.jpg",
  "./images/0_0.jpg",
  "./images/0_3 (2).jpg",
  "./images/0_1 (1).jpg"
];

const PortfolioSection = () => (
  <div className="bg-black py-20 text-center px-4">
    <h2 className="text-white heading-font" style={{ fontWeight: 400, fontSize: '72px', letterSpacing: '-0.02em', lineHeight: '1' }}>
      Portfolio
    </h2>
    <p className="text-white heading-font" style={{ fontWeight: 400, fontSize: '48px', letterSpacing: '-0.02em', marginTop: '8px' }}>
      ( See Who did it first ? )
    </p>
    <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-12">
      {portfolioImages.map((src, index) => (
        <div key={index} className="rounded-2xl overflow-hidden aspect-w-4 aspect-h-3">
          <img src={src} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  </div>
);

export default PortfolioSection;
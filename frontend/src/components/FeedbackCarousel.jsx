import React, { useState, useEffect } from 'react';

const FeedbackCarousel = ({ images = [], caption = "Recent Client Love", title = "Lovers AI" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!images || images.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [images, isHovered]);

  if (!images || images.length === 0) return null;

  return (
    <div
      className="relative w-full h-[540px] bg-transparent backdrop-blur-md rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-white/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(230,198,178,0.15)] hover:border-[#e6c6b2]/50 group flex flex-col justify-between"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full h-full bg-transparent overflow-hidden flex items-center justify-center">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${
              idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <img
              src={img}
              alt={caption || `${title} Feedback ${idx + 1}`}
              className="w-full h-full object-contain rounded-[28px] bg-black/40 p-2"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/75 backdrop-blur-xl py-2 px-4 rounded-full border border-white/25 shadow-2xl flex items-center justify-between gap-3 min-w-[180px]">
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
            className="text-white/80 hover:text-[#e6c6b2] transition-colors p-1 hover:scale-110"
            aria-label="Previous Slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div className="flex items-center space-x-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? "w-6 h-1.5 bg-[#e6c6b2] shadow-[0_0_8px_rgba(230,198,178,0.8)]"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
            className="text-white/80 hover:text-[#e6c6b2] transition-colors p-1 hover:scale-110"
            aria-label="Next Slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackCarousel;

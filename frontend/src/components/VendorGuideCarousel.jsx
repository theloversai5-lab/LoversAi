import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function VendorGuideCarousel({ slides }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const totalSlides = slides.length;
  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === totalSlides - 1;

  // Preload next image
  useEffect(() => {
    if (currentIndex < totalSlides - 1) {
      const img = new Image();
      img.src = slides[currentIndex + 1].image;
    }
  }, [currentIndex, slides, totalSlides]);

  const handleNext = useCallback(() => {
    if (!isLastSlide) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastSlide]);

  const handlePrev = useCallback(() => {
    if (!isFirstSlide) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [isFirstSlide]);

  const handleDotClick = (index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "Space" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Framer Motion variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group">
      
      <div className="relative flex flex-col items-center">
        
        {/* Navigation Arrows (Desktop) */}
        <button
          onClick={handlePrev}
          disabled={isFirstSlide}
          className={`absolute left-4 top-[40%] -translate-y-1/2 z-20 p-4 rounded-full border border-white/10 shadow-lg transition-all duration-300 hidden md:flex ${
            isFirstSlide 
              ? "opacity-30 cursor-not-allowed bg-black/20" 
              : "opacity-0 group-hover:opacity-100 hover:bg-white/10 hover-glow cursor-pointer bg-black/50 backdrop-blur-md"
          }`}
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        <button
          onClick={handleNext}
          disabled={isLastSlide}
          className={`absolute right-4 top-[40%] -translate-y-1/2 z-20 p-4 rounded-full border border-white/10 shadow-lg transition-all duration-300 hidden md:flex ${
            isLastSlide 
              ? "opacity-30 cursor-not-allowed bg-black/20" 
              : "opacity-0 group-hover:opacity-100 hover:bg-white/10 hover-glow cursor-pointer bg-black/50 backdrop-blur-md"
          }`}
          aria-label="Next Slide"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>

        {/* Screenshot Container */}
        <div className="relative w-full aspect-[16/9] md:aspect-video overflow-hidden rounded-2xl bg-black/20 border border-white/5 flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x;
                if (swipe < -10000 || offset.x < -50) {
                  handleNext();
                } else if (swipe > 10000 || offset.x > 50) {
                  handlePrev();
                }
              }}
            >
              <img
                src={slides[currentIndex].image}
                alt={slides[currentIndex].title}
                loading="lazy"
                className="w-full h-full object-contain pointer-events-none"
              />
            </motion.div>
          </AnimatePresence>
        </div>


        {/* Progress Indicator */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? "bg-loverai-gold w-6"
                    : "bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-white/40 font-mono tracking-widest">
            {currentIndex + 1} / {totalSlides}
          </div>
        </div>

      </div>
    </div>
  );
}

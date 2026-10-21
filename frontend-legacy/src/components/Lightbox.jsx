import React, { useEffect } from "react";

const Lightbox = ({ images, currentIndex, onClose, onNavigate }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate("prev");
      if (e.key === "ArrowRight") onNavigate("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, onNavigate]);

  if (currentIndex === null || !images[currentIndex]) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-[#e6c6b2] transition-colors z-50 p-2 focus:outline-none"
        aria-label="Close Lightbox"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate("prev"); }}
            className="absolute left-2 md:left-10 text-white/50 hover:text-[#e6c6b2] transition-colors z-50 p-2 md:p-4 focus:outline-none"
            aria-label="Previous Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onNavigate("next"); }}
            className="absolute right-2 md:right-10 text-white/50 hover:text-[#e6c6b2] transition-colors z-50 p-2 md:p-4 focus:outline-none"
            aria-label="Next Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </>
      )}

      <div
        className="relative w-full max-w-7xl h-full max-h-[90vh] px-12 md:px-32 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt={`Gallery item ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain relative"
        />
        <div className="absolute bottom-10 right-10 pointer-events-none z-20 hidden md:flex flex-col items-center opacity-90">
          <span className="text-white text-[18px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider">@lovers ai</span>
          <span className="text-white text-[20px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-widest leading-none mt-1">9821640951</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 w-full text-center text-white/50 text-sm tracking-widest font-serif">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

export default Lightbox;

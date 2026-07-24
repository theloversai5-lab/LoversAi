import React from "react";

const LinkCard = ({ url = "https://lovers-ai-portfolio.vercel.app/" }) => {
  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative group cursor-pointer flex flex-col items-center justify-center p-8 rounded-[28px] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(230,198,178,0.15)] h-[540px] w-full"
    >
      {/* Background Image & Overlays */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: "url('/about/Group2.png')" }}
      ></div>
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      
      {/* Glowing Border */}
      <div className="absolute inset-0 rounded-[28px] border border-white/10 group-hover:border-[#e6c6b2]/50 transition-colors duration-500"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center mb-8 group-hover:bg-[#e6c6b2]/20 group-hover:border-[#e6c6b2]/50 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(230,198,178,0.3)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 group-hover:text-[#e6c6b2] transition-colors">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
        
        <h3 className="text-4xl font-serif text-white group-hover:text-[#e6c6b2] transition-colors text-center tracking-wide leading-tight">
          View Full<br/>Portfolio
        </h3>
        
        <div className="mt-8 flex items-center gap-3">
          <span className="h-[1px] w-8 bg-white/30 group-hover:bg-[#e6c6b2]/50 transition-colors"></span>
          <p className="text-xs text-white/50 uppercase tracking-[0.3em] group-hover:text-white/90 transition-colors font-medium">
            Discover More
          </p>
          <span className="h-[1px] w-8 bg-white/30 group-hover:bg-[#e6c6b2]/50 transition-colors"></span>
        </div>
      </div>
    </a>
  );
};

export default LinkCard;

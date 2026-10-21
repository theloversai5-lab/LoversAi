import React from 'react';

const testimonials = [
  {
    id: 1,
    name: "Priya & Rahul",
    role: "Bride & Groom",
    text: "The LoversAI team completely transformed our wedding vision into reality. The attention to detail in the floral arrangements was breathtaking. Every guest was in awe of the aesthetic.",
    image: "/projects/p1.png",
    rating: 5,
  },
  {
    id: 2,
    name: "Aarav Sharma",
    role: "Lead Event Planner",
    text: "Working with this team is a dream. Their 3D renders matched the final output flawlessly. They bring an unmatched level of professionalism and elegance to luxury weddings.",
    image: "/projects/p2.png",
    rating: 5,
  },
  {
    id: 3,
    name: "Sneha & Varun",
    role: "Bride & Groom",
    text: "From the initial moodboard to the final execution, everything was seamless. The bespoke welcome board and the mandap design were beyond our wildest expectations!",
    image: "/projects/p3.png",
    rating: 5,
  },
  {
    id: 4,
    name: "Nandini Mehta",
    role: "Mother of the Bride",
    text: "I was extremely particular about the color palette, and they nailed it. The fusion of traditional elements with a modern glassmorphism touch made it a truly royal affair.",
    image: "/projects/p4.jpg",
    rating: 5,
  },
  {
    id: 5,
    name: "Karan Singhania",
    role: "Creative Director",
    text: "An absolute masterclass in event styling. The spatial planning and lighting design elevated the entire venue. They are simply the best in the bespoke wedding industry.",
    image: "/about/Group2.png",
    rating: 5,
  },
  {
    id: 6,
    name: "Meera & Rohan",
    role: "Bride & Groom",
    text: "We wanted something minimalist yet luxurious. They understood our aesthetic perfectly and delivered a stunning reception stage that everyone is still talking about.",
    image: "/projects/p1.png",
    rating: 5,
  },
  {
    id: 7,
    name: "Vikram Desai",
    role: "Venue Coordinator",
    text: "I've seen hundreds of decorators at our property, but the LoversAI team brings a completely different level of sophistication and operational excellence.",
    image: "/projects/p2.png",
    rating: 5,
  },
  {
    id: 8,
    name: "Ananya Kapoor",
    role: "Bride",
    text: "The AI tools they used to show us the initial concepts were mind-blowing, and the actual day looked exactly like the renders. Thank you for making my dream day perfect!",
    image: "/projects/p3.png",
    rating: 5,
  }
];

const StarRating = ({ count }) => {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg 
          key={i} 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill={i < count ? "#e6c6b2" : "transparent"}
          stroke={i < count ? "#e6c6b2" : "rgba(255,255,255,0.2)"}
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ))}
    </div>
  );
};

const TestimonialSection = () => {
  // Duplicate the array to create an infinite seamless loop
  const marqueeItems = [...testimonials, ...testimonials];

  return (
    <section 
      className="relative pt-12 pb-24 overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/images/signup.webp')" }}
    >
      {/* Background Dark & Blur Overlay */}
      <div className="absolute inset-0 bg-[#0a0604]/80 backdrop-blur-sm z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0604] via-transparent to-[#0a0604] z-0"></div>

      <style>
        {`
          @keyframes infinite-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc(-50% - 1rem)); } 
          }
          .animate-infinite-scroll {
            display: flex;
            width: max-content;
            animation: infinite-scroll 45s linear infinite;
          }
          .animate-infinite-scroll:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      <div className="relative z-10 container mx-auto px-4 md:px-8 mb-16 text-center">
        <h2 className="text-[#fff4e8] heading-font" style={{ fontWeight: 400, fontSize: '64px', letterSpacing: '-0.02em', lineHeight: '1' }}>
          Client Love
        </h2>
        <p className="text-[#e6c6b2] font-serif text-xl tracking-widest uppercase mt-4">
          Words from our couples & partners
        </p>
      </div>

      <div className="relative z-10 w-full flex overflow-hidden py-10">
        {/* Left/Right Fade Masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0604] to-transparent z-20 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0604] to-transparent z-20 pointer-events-none"></div>

        {/* Marquee Track */}
        <div className="animate-infinite-scroll gap-6 px-4">
          {marqueeItems.map((testimonial, idx) => (
            <div 
              key={`${testimonial.id}-${idx}`}
              className="glass-card w-[350px] min-h-[420px] flex flex-col p-8 rounded-3xl transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_60px_rgba(230,198,178,0.2)] bg-gradient-to-br from-[#2a2119]/90 to-[#140c08]/90 border border-white/5 hover:border-[#e6c6b2]/40 backdrop-blur-xl cursor-pointer group"
            >
              {/* Header: Avatar, Name & Role */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full border-2 border-[#768493]/60 p-[2px] shrink-0">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name} 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-[17px] tracking-wide">
                    {testimonial.name}
                  </h4>
                  <p className="text-white/50 text-[13px] mt-0.5">
                    {testimonial.role}
                  </p>
                </div>
              </div>

              {/* Huge Quotation Icon */}
              <div className="mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-[#e6c6b2]/60">
                  <path d="M11 9.27402C11 11.233 10.3704 12.873 9.11111 14.194C7.92593 15.515 6.44444 16.516 4.66667 17.198L3.11111 14.808C4.51852 14.288 5.62963 13.518 6.44444 12.498C7.33333 11.478 7.77778 10.378 7.77778 9.19802V8.97802C7.77778 8.05802 7.44444 7.28802 6.77778 6.66802C6.18519 6.04802 5.40741 5.73802 4.44444 5.73802C3.48148 5.73802 2.66667 6.08802 2 6.78802C1.40741 7.48802 1.11111 8.35802 1.11111 9.39802C1.11111 11.038 1.62963 12.638 2.66667 14.198C3.77778 15.758 5.37037 17.078 7.44444 18.158L8.77778 15.638C7.51852 14.998 6.44444 14.138 5.55556 13.058C6.66667 12.498 7.55556 11.728 8.22222 10.748C8.96296 9.76802 9.33333 8.65802 9.33333 7.41802C9.33333 5.49802 8.59259 3.86802 7.11111 2.52802C5.7037 1.18802 4.07407 0.518018 2.22222 0.518018L2 1.41802C2 2.05802 2.33333 2.76802 3 3.54802C3.74074 4.32802 4.59259 4.71802 5.55556 4.71802C6.96296 4.71802 8.07407 5.25802 8.88889 6.33802C9.77778 7.33802 10.2222 8.49802 10.2222 9.81802H11V9.27402ZM23 9.27402C23 11.233 22.3704 12.873 21.1111 14.194C19.9259 15.515 18.4444 16.516 16.6667 17.198L15.1111 14.808C16.5185 14.288 17.6296 13.518 18.4444 12.498C19.3333 11.478 19.7778 10.378 19.7778 9.19802V8.97802C19.7778 8.05802 19.4444 7.28802 18.7778 6.66802C18.1852 6.04802 17.4074 5.73802 16.4444 5.73802C15.4815 5.73802 14.6667 6.08802 14 6.78802C13.4074 7.48802 13.1111 8.35802 13.1111 9.39802C13.1111 11.038 13.6296 12.638 14.6667 14.198C15.7778 15.758 17.3704 17.078 19.4444 18.158L20.7778 15.638C19.5185 14.998 18.4444 14.138 17.5556 13.058C18.6667 12.498 19.5556 11.728 20.2222 10.748C20.963 9.76802 21.3333 8.65802 21.3333 7.41802C21.3333 5.49802 20.5926 3.86802 19.1111 2.52802C17.7037 1.18802 16.0741 0.518018 14.2222 0.518018L14 1.41802C14 2.05802 14.3333 2.76802 15 3.54802C15.7407 4.32802 16.5926 4.71802 17.5556 4.71802C18.963 4.71802 20.0741 5.25802 20.8889 6.33802C21.7778 7.33802 22.2222 8.49802 22.2222 9.81802H23V9.27402Z"/>
                </svg>
              </div>

              {/* Review Text */}
              <div className="relative z-10 flex-1 mb-8">
                <p className="text-white/90 text-[15px] leading-relaxed font-medium">
                  {testimonial.text}
                </p>
              </div>

              {/* Bottom: Stars and Badge */}
              <div className="mt-auto">
                <div className="mb-3">
                  <StarRating count={testimonial.rating} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#b58b61]/20 border border-[#b58b61]/30">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#b58b61] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-[#b58b61] text-xs font-semibold tracking-wide">
                    Verified Client
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;

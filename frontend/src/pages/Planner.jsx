import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PortfolioSection from '../components/PortfolioSection';
import TestimonialSection from '../components/TestimonialSection';
import PlannerQuickMenu from '../components/PlannerQuickMenu';
import Footer from '../components/Footer';

const SafePortfolioSection =
  typeof PortfolioSection === 'function' ? PortfolioSection : () => null;
const SafeTestimonialSection =
  typeof TestimonialSection === 'function' ? TestimonialSection : () => null;
const SafePlannerQuickMenu =
  typeof PlannerQuickMenu === 'function' ? PlannerQuickMenu : () => null;

const PlannerPage = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  const handleNavigate = (path) => {
    if (loading) {
      return;
    }

    if (!currentUser) {
      navigate('/login?role=planner', { state: { from: path } });
    } else if (currentUser.role !== 'planner') {
      navigate(`/login?role=planner&mismatch=true`, { state: { from: path } });
    } else {
      navigate(path);
    }
  };

  const scrollToTools = () => {
    document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const tools = [
    {
      title: "Find Leads",
      image: "/images/Occluded text _ Sand dune.gif",
      onClick: () => {},
      badge: "Coming Soon",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      isLocked: true,
    },
    {
      title: "Pitch with AI",
      image: "/images/pitch with ai.gif",
      onClick: () => {
        if (!currentUser) {
          navigate('/planner-ai-tools');
          return;
        }

        handleNavigate('/planner-ai-tools');
      },
      badge: "AI Powered",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    {
      title: "Find Vendors",
      image: "/images/execute.gif",
      onClick: () => handleNavigate('/vendor-ai'),
      badge: "Directory",
      badgeColor: "bg-blue-400/20 text-blue-400 border-blue-400/30",
    },
  ];

  return (
    <>
      <div className="fixed left-6 top-6 z-30 sm:left-8 sm:top-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Lovers AI home"
          className="transition hover:opacity-90"
        >
          <img
            src="/images/LogoLoversai.png"
            alt="Lovers AI"
            className="h-24 w-auto object-contain sm:h-28"
          />
        </button>
      </div>

      <SafePlannerQuickMenu />

      {/* Hero Section */}
      <div className="relative w-full overflow-hidden min-h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center z-0 origin-center"
          style={{
            backgroundImage: 'url("/images/planner.webp")',
            filter: "brightness(1.45) saturate(1.15) contrast(0.95)",
            transform: "rotate(-1.2deg) scale(1.1)",
          }}
        />


        {/* Premium Hero Content */}
        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center px-4 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Small uppercase label */}
            <p 
              className="text-[10px] sm:text-xs font-semibold uppercase tracking-[6px] text-loverai-gold mb-5 animate-fadeInUp"
              style={{ textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)" }}
            >
              LOVERS AI FOR PROFESSIONALS
            </p>

            {/* Main Title with gold text highlight, custom display typography and text-shadow for readability */}
            <h1 
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-heading text-white mb-6 tracking-tight leading-[1.1] animate-fadeInUp stagger-1"
              style={{ textShadow: "0 4px 20px rgba(0, 0, 0, 0.75)" }}
            >
              Where <span className="text-transparent bg-clip-text bg-gradient-to-r from-loverai-gold via-[#f3d4c1] to-white">Artistry</span> Meets <span className="italic font-display text-loverai-gold">Intelligence</span>
            </h1>

            {/* Sub-description with warm text color and shadow */}
            <p 
              className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 max-w-2xl mx-auto mb-10 font-body font-normal leading-relaxed animate-fadeInUp stagger-2"
              style={{ textShadow: "0 2px 12px rgba(0, 0, 0, 0.85)" }}
            >
              Design and coordinate premium weddings, powered by AI.
            </p>

            {/* Call to Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeInUp stagger-3">
              <button
                onClick={scrollToTools}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-loverai-gold text-loverai-deep font-semibold text-sm hover:bg-white hover:text-black transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:scale-105 cursor-pointer"
              >
                Explore Tools
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Planner Tools Section */}
      <div id="tools-section" className="loverai-page-bg py-16 sm:py-20 px-4 sm:px-8">
        <div className="relative z-10">
          <h2 className="text-center text-white mb-4 font-heading text-3xl sm:text-5xl md:text-6xl animate-fadeInUp">
            Planner Tools
          </h2>
          <p className="text-center text-white/40 mb-12 max-w-lg mx-auto animate-fadeInUp stagger-1">
            Everything you need to win more clients and deliver exceptional weddings
          </p>

          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {tools.map((tool, i) => (
              <button
                type="button"
                key={tool.title}
                onClick={tool.isLocked ? undefined : tool.onClick}
                aria-label={tool.title}
                className={`relative h-80 sm:h-96 md:h-[450px] rounded-3xl overflow-hidden group animate-fadeInUp stagger-${i + 2} text-left ${
                  tool.isLocked 
                    ? 'cursor-not-allowed opacity-90' 
                    : loading 
                      ? 'cursor-wait opacity-80' 
                      : 'cursor-pointer hover-lift'
                }`}
              >
                <img
                  src={tool.image}
                  alt={tool.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    tool.isLocked ? 'filter grayscale contrast-75' : 'group-hover:scale-110'
                  }`}
                />
                
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Lock Overlay for locked tools */}
                {tool.isLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10 animate-pulse duration-[3000ms]">
                    <div className="p-4 rounded-full bg-black/40 border border-white/10 backdrop-blur-md mb-3">
                      <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold uppercase tracking-[4px] text-amber-400/90 drop-shadow-md">
                      Coming Soon
                    </span>
                    <span className="text-[10px] text-white/50 mt-1 uppercase tracking-widest">
                      Stay Tuned
                    </span>
                  </div>
                )}

                {/* Badge */}
                <div className="absolute top-4 right-4 z-20">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border backdrop-blur-sm ${tool.badgeColor}`}>
                    {tool.badge}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Section */}
      <SafePortfolioSection />

      {/* Testimonials Section */}
      <SafeTestimonialSection />

      {/* Planner Footer */}
      <Footer />
    </>
  );
};

export default PlannerPage;

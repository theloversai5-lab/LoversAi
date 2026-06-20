import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PortfolioSection from '../components/PortfolioSection';
import PlannerQuickMenu from '../components/PlannerQuickMenu';
import Footer from '../components/Footer';

const SafePortfolioSection =
  typeof PortfolioSection === 'function' ? PortfolioSection : () => null;
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

  const tools = [
    {
      title: "Find Leads",
      image: "/images/Occluded text _ Sand dune.gif",
      onClick: () => handleNavigate('/planner/bids'),
      badge: "Live",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
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
      onClick: () => handleNavigate('/planner/vendors'),
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
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: 'url("/images/planner.png")',
            filter: "brightness(1.08) saturate(1.12) contrast(1.08)",
          }}
        />
        <div className="absolute inset-0 z-[1] bg-transparent"></div>
      </div>

      {/* Planner Tools Section */}
      <div className="loverai-page-bg py-16 sm:py-20 px-4 sm:px-8">
        <div className="relative z-10">
          <h2 className="text-center text-white mb-4 font-heading text-3xl sm:text-5xl md:text-6xl animate-fadeInUp">
            Planner Tools
          </h2>
          <p className="text-center text-white/40 mb-12 max-w-lg mx-auto animate-fadeInUp stagger-1">
            Everything you need to win more clients and deliver exceptional weddings
          </p>

          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {tools.map((tool, i) => (
              <button
                type="button"
                key={tool.title}
                onClick={tool.onClick}
                aria-label={tool.title}
                className={`relative h-64 sm:h-72 md:h-[350px] rounded-2xl overflow-hidden group hover-lift animate-fadeInUp stagger-${i + 2} text-left ${loading ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
              >
                <img
                  src={tool.image}
                  alt={tool.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Badge */}
                <div className="absolute top-4 right-4">
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

      {/* Planner Footer */}
      <Footer />
    </>
  );
};

export default PlannerPage;

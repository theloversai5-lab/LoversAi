import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PortfolioSection from '../components/PortfolioSection';

const PlannerPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleNavigate = (path) => {
    if (!currentUser) {
      // Not logged in - redirect to login with planner role
      navigate('/login?role=planner', { state: { from: path } });
    } else if (currentUser.role !== 'planner') {
      // Logged in but wrong role
      navigate(`/login?role=planner&mismatch=true`, { state: { from: path } });
    } else {
      // Correct role - navigate directly
      navigate(path);
    }
  };

  const tools = [
    {
      title: "Find Leads",
      desc: "Browse live couple bids and pitch your services",
      image: "/images/couple_leads_image.jpeg",
      onClick: () => handleNavigate('/planner/bids'),
      badge: "Live",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Pitch with AI",
      desc: "Use AI tools to create stunning presentations",
      image: "/images/pitch with ai.gif",
      onClick: () => handleNavigate('/planner-ai-tools'),
      badge: "AI Powered",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    {
      title: "Find Vendors",
      desc: "Discover verified vendors for your projects",
      image: "/images/executive_wedding.jpeg",
      onClick: () => handleNavigate('/planner/vendors'),
      badge: "Directory",
      badgeColor: "bg-blue-400/20 text-blue-400 border-blue-400/30",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden min-h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: `url("./images/planner.png")`, filter: "brightness(0.6)" }}
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-loverai-deep/20 via-transparent to-loverai-deep/60"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-loverai-gold/[0.03] rounded-full blur-[150px] z-[1]"></div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <img src="/images/LogoLoversai.png" alt="LoversAI" className="h-16 w-auto mb-6 animate-float" />
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading text-white mb-4 text-center animate-fadeInUp">
            Planner
          </h1>
          <p className="text-white/50 text-lg max-w-lg text-center mb-10 animate-fadeInUp stagger-2">
            Powerful tools to grow your wedding planning business
          </p>
          
          <div className="flex gap-4 animate-fadeInUp stagger-3">
            <button
              onClick={() => handleNavigate('/planner/dashboard')}
              className="loverai-btn-primary text-[15px]"
            >
              Open Dashboard
            </button>
            <button
              onClick={() => handleNavigate('/planner-ai-tools')}
              className="loverai-btn-outline text-[15px]"
            >
              AI Tools
            </button>
          </div>
        </div>
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

          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {tools.map((tool, i) => (
              <div
                key={tool.title}
                onClick={tool.onClick}
                className={`cursor-pointer relative h-72 sm:h-80 md:h-96 rounded-2xl overflow-hidden group hover-lift animate-fadeInUp stagger-${i + 2}`}
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

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="glass-card rounded-xl p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-xl font-heading text-white mb-1">{tool.title}</h3>
                    <p className="text-white/50 text-sm">{tool.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Section */}
      <PortfolioSection />
    </>
  );
};

export default PlannerPage;
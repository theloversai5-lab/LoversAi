import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VendorPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleNavigate = (path) => {
    if (!currentUser) {
      // Redirect to login with vendor role
      navigate('/login?role=vendor', { state: { from: path } });
    } else if (currentUser.role !== 'vendor') {
      // User is logged in but with wrong role
      navigate(`/login?role=vendor&mismatch=true`, { state: { from: path } });
    } else {
      navigate(path);
    }
  };

  const features = [
    {
      title: "Manage Inventory",
      desc: "Showcase your products and services to planners",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "from-emerald-500/20 to-emerald-600/20",
      borderColor: "border-emerald-500/30",
    },
    {
      title: "Receive Requests",
      desc: "Get quote requests from wedding planners",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "from-blue-500/20 to-blue-600/20",
      borderColor: "border-blue-500/30",
    },
    {
      title: "Track Earnings",
      desc: "Monitor your revenue and payout history",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-amber-500/20 to-amber-600/20",
      borderColor: "border-amber-500/30",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden min-h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: `url("./images/planner.png")`, filter: "brightness(0.35)" }}
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-loverai-deep/40 via-transparent to-loverai-deep/90"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-loverai-gold/[0.03] rounded-full blur-[150px] z-[1]"></div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <img src="/images/LogoLoversai.png" alt="LoversAI" className="h-16 w-auto mb-6 animate-float" />
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading text-white mb-4 text-center animate-fadeInUp">
            Vendors
          </h1>
          <p className="text-white/50 text-lg max-w-lg text-center mb-10 animate-fadeInUp stagger-2">
            Connect with wedding planners and grow your business
          </p>
          
          <div className="flex gap-4 animate-fadeInUp stagger-3">
            <button
              onClick={() => handleNavigate('/vendor/dashboard')}
              className="loverai-btn-primary text-[15px]"
            >
              Open Dashboard
            </button>
            <button
              onClick={() => handleNavigate('/vendor/portfolio')}
              className="loverai-btn-outline text-[15px]"
            >
              View Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="loverai-page-bg py-16 sm:py-20 px-4 sm:px-8">
        <div className="relative z-10">
          <h2 className="text-center text-white mb-4 font-heading text-3xl sm:text-5xl md:text-6xl animate-fadeInUp">
            Vendor Features
          </h2>
          <p className="text-center text-white/40 mb-12 max-w-lg mx-auto animate-fadeInUp stagger-1">
            Everything you need to succeed in the wedding industry
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`glass-card rounded-2xl p-8 hover-lift hover-glow animate-fadeInUp`}
                style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} border ${feature.borderColor} flex items-center justify-center text-white mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-heading text-white mb-3">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-loverai-gold/10 to-amber-600/10"></div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-heading text-white mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-white/50 mb-8">
            Join hundreds of vendors already using LoversAI to connect with planners
          </p>
          <button
            onClick={() => handleNavigate('/vendor/onboarding')}
            className="loverai-btn-primary text-[16px] !px-12"
          >
            Get Started Today
          </button>
        </div>
      </div>
    </>
  );
};

export default VendorPage;

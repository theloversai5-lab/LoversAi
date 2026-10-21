import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Wand2 } from "lucide-react";

export default function PlannerVenueOptions() {
  const navigate = useNavigate();

  const options = [
    {
      id: "master-venue",
      title: "MasterVenue AI",
      description: "Generate venue concepts and visualize event spaces using AI.",
      icon: <Wand2 className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/base-venue",
      active: true
    },
    {
      id: "fairmount",
      title: "FairMount Mumbai X Lover's AI",
      description: "Generate venue concepts and visualize event spaces using AI.",
      icon: <Wand2 className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/venue",
      active: true
    },
    {
      id: "taj",
      title: "Taj Agra X Lover's AI",
      description: "Generate venue concepts and visualize event spaces using AI.",
      icon: <Wand2 className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/taj",
      active: true
    },
    {
      id: "itc-mughal",
      title: "ITC Mughal Agra X Lover's AI",
      description: "Generate venue concepts and visualize event spaces using AI.",
      icon: <Wand2 className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/itc-mughal",
      active: true
    },
    {
      id: "jaypee",
      title: "Jaypee Palace Agra X Lover's AI",
      description: "Generate venue concepts and visualize event spaces using AI.",
      icon: <Wand2 className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/jaypee",
      active: true
    }
  ];

  return (
    <div className="space-y-5 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-white/50 hover:text-white transition-colors mb-4"
          >
            ← Back
          </button>
          <h1 className="font-heading text-2xl text-white">Venue AI</h1>
          <p className="text-xs text-white/30 mt-1">Select a venue AI solution to proceed.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {options.map((opt) => (
          <div 
            key={opt.id} 
            className="glass-card rounded-2xl overflow-hidden hover-glow p-5 flex flex-col justify-between min-h-[280px]"
          >
            <div className="relative z-10">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-11 h-11 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold">
                    {opt.icon}
                  </div>
                </div>
                
                {opt.active && (
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5 font-medium badge-open">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI Powered
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 mb-6">
                <h3 className="font-medium text-white text-lg">
                  {opt.title}
                </h3>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-auto pt-4 border-t border-white/5">
              <button
                onClick={() => navigate(opt.path)}
                className="w-full loverai-btn-primary text-xs py-2.5 rounded-lg"
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

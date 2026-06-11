import React from "react";
import { 
  Sparkles, 
  Wand2
} from "lucide-react";

export default function PlannerVenueAI() {
  const launchDesigner = () => {
    window.open(
      "https://venue-ai--sunitakeshari24.replit.app/",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const tools = [
    {
      id: "venue-designer",
      title: "Venue Designer AI",
      description: "Generate luxury wedding venue concepts, stage designs, decor styles and venue visualizations using AI.",
      icon: <Wand2 className="h-6 w-6 text-loverai-gold" />,
      active: true,
      action: launchDesigner,
      buttonText: "Launch Designer"
    }
  ];

  return (
    <div className="space-y-5 animate-fadeInUp">
      {/* Header matching PlannerDeals structure */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">Venue AI</h1>
          <p className="text-xs text-white/30 mt-1">Premium tools to visualize, optimize, and manage luxury wedding venues.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {tools.map((tool) => (
          <div 
            key={tool.id} 
            className="glass-card rounded-2xl overflow-hidden hover-glow p-5 flex flex-col justify-between min-h-[280px]"
          >
            <div className="relative z-10">
              {/* Badges & Icon */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-11 h-11 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold">
                    {tool.icon}
                  </div>
                </div>
                
                {tool.active && (
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5 font-medium badge-open">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI Powered
                    </span>
                    <span className="rounded-full text-[10px] px-2 py-0.5 font-medium border border-loverai-gold/20 bg-loverai-gold/5 text-loverai-gold">
                      Featured
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mt-4 mb-6">
                <h3 className="font-medium text-white text-lg">
                  {tool.title}
                </h3>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="relative z-10 mt-auto pt-4 border-t border-white/5">
              <button
                onClick={tool.active ? tool.action : undefined}
                className="w-full loverai-btn-primary text-xs py-2.5 rounded-lg"
                disabled={!tool.active}
              >
                {tool.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

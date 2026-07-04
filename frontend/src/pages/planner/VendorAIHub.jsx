import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Wand2, Palette, Utensils } from "lucide-react";

export default function VendorAIHub() {
  const navigate = useNavigate();

  const vendors = [
    {
      id: "venue",
      title: "Venue AI",
      description: "Generate venue concepts and visualize event spaces using AI.",
      icon: <Wand2 className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/venue",
      active: true
    },
    {
      id: "decor",
      title: "Decor AI",
      description: "Create personalized décor concepts and styling ideas.",
      icon: <Palette className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/decor",
      active: true
    },
    {
      id: "catering",
      title: "Catering AI",
      description: "Explore AI-assisted catering planning and menu experiences.",
      icon: <Utensils className="h-6 w-6 text-loverai-gold" />,
      path: "/vendor-ai/catering",
      active: true
    }
  ];

  return (
    <div className="space-y-5 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">Vendor AI</h1>
          <p className="text-xs text-white/30 mt-1">Choose the AI solution you would like to use. Each tool is designed to simplify a different part of your event planning workflow.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {vendors.map((vendor) => (
          <div 
            key={vendor.id} 
            className="glass-card rounded-2xl overflow-hidden hover-glow p-5 flex flex-col justify-between min-h-[280px]"
          >
            <div className="relative z-10">
              {/* Badges & Icon */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-11 h-11 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold">
                    {vendor.icon}
                  </div>
                </div>
                
                {vendor.active && (
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5 font-medium badge-open">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI Powered
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mt-4 mb-6">
                <h3 className="font-medium text-white text-lg">
                  {vendor.title}
                </h3>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">
                  {vendor.description}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="relative z-10 mt-auto pt-4 border-t border-white/5">
              <button
                onClick={() => navigate(vendor.path)}
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

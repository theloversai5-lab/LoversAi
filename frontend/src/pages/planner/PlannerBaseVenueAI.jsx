import React from "react";
import VendorAIOnboarding from "../../components/VendorAIOnboarding";
import { vendorGuides } from "../../data/vendorGuides";

export default function PlannerBaseVenueAI() {
  const config = {
    title: "Venue AI",
    description: "Learn how Venue AI works before getting started. This short guide will help you understand the workflow so you can generate better results.",
    slides: vendorGuides.baseVenue.slides,
    quickTips: vendorGuides.baseVenue.quickTips,
    steps: [
      {
        title: "Upload Your Venue",
        description: "Upload venue images or provide venue details to begin your AI journey."
      },
      {
        title: "Generate Concepts",
        description: "Use our AI tools to visualize staging, lighting, and layout possibilities."
      },
      {
        title: "Export & Share",
        description: "Download high-resolution mockups to share with clients or your team."
      }
    ],
    redirectUrl: "https://venue-ai-liart.vercel.app/",
    buttonText: "Proceed to Venue AI"
  };

  return <VendorAIOnboarding config={config} />;
}

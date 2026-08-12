import React from "react";
import VendorAIOnboarding from "../../components/VendorAIOnboarding";
import { vendorGuides } from "../../data/vendorGuides";

export default function PlannerTajAI() {
  const config = {
    title: "Taj Agra X Lover's AI",
    description: "Learn how Taj Agra X Lover's AI works before getting started. This short guide will help you understand the workflow so you can generate better results.",
    slides: vendorGuides.taj.slides,
    quickTips: vendorGuides.taj.quickTips,
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
    redirectUrl: "https://taj-x-lovers-ai.vercel.app/",
    buttonText: "Proceed to Taj Agra X Lover's AI"
  };

  return <VendorAIOnboarding config={config} />;
}

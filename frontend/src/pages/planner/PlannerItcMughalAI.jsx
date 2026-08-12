import React from "react";
import VendorAIOnboarding from "../../components/VendorAIOnboarding";
import { vendorGuides } from "../../data/vendorGuides";

export default function PlannerItcMughalAI() {
  const config = {
    title: "ITC Mughal X Lover's AI",
    description: "Learn how ITC Mughal X Lover's AI works before getting started. This short guide will help you understand the workflow so you can generate better results.",
    slides: vendorGuides.itcMughal.slides,
    quickTips: vendorGuides.itcMughal.quickTips,
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
    redirectUrl: "https://itc-mughal-x-lovers-ai.vercel.app/",
    buttonText: "Proceed to ITC Mughal X Lover's AI"
  };

  return <VendorAIOnboarding config={config} />;
}

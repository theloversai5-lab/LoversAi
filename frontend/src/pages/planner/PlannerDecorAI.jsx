import React from "react";
import VendorAIOnboarding from "../../components/VendorAIOnboarding";
import { vendorGuides } from "../../data/vendorGuides";

export default function PlannerDecorAI() {
  const config = {
    title: "Decor AI",
    description: "Learn how Decor AI works before getting started. This short guide will help you understand the workflow so you can generate better results.",
    slides: vendorGuides.decor.slides,
    quickTips: vendorGuides.decor.quickTips,
    steps: [
      {
        title: "Select a Theme",
        description: "Choose from our curated themes or describe your custom vision."
      },
      {
        title: "Customize Elements",
        description: "Adjust colors, florals, and furniture to match your specific requirements."
      },
      {
        title: "Generate Mockups",
        description: "Create photorealistic renders of your personalized decor setup."
      }
    ],
    redirectUrl: "https://decor.loversai.com",
    buttonText: "Proceed to Decor AI"
  };

  return <VendorAIOnboarding config={config} />;
}


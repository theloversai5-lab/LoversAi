import React from "react";
import VendorAIOnboarding from "../../components/VendorAIOnboarding";
import { vendorGuides } from "../../data/vendorGuides";

export default function PlannerCateringAI() {
  const config = {
    title: "Catering AI",
    description: "Learn how Catering AI works before getting started. This short guide will help you understand the workflow so you can generate better results.",
    slides: vendorGuides.catering.slides,
    quickTips: vendorGuides.catering.quickTips,
    steps: [
      {
        title: "Define Preferences",
        description: "Input dietary requirements, guest count, and cuisine preferences."
      },
      {
        title: "Generate Menus",
        description: "Let AI curate a customized food and beverage experience."
      },
      {
        title: "Finalize & Export",
        description: "Review generated menus and export beautifully formatted cards."
      }
    ],
    redirectUrl: "https://catering-ai.vercel.app/",
    buttonText: "Proceed to Catering AI"
  };

  return <VendorAIOnboarding config={config} />;
}


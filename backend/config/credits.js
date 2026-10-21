// config/credits.js — Centralized pricing and plan configuration for the Credit System

/**
 * Defines the credit allocation for different subscription plans.
 * A newly registered user automatically receives the "free" plan allocation (4 credits).
 */
export const PLAN_CREDITS = {
  free: 4,
  basic: 12,
  premium: 32,
  pro: 64,
  couple_free: 4,
  couple_basic: 12,
  couple_premium: 32,
  couple_pro: 64,
  couple_elite: 64,
  planner_basic: 100,
  planner_premium: 210,
  planner_pro: 400,
};

/**
 * Defines the cost in credits for various AI operations.
 * Future features should add their costs here instead of hardcoding them in endpoints.
 */
export const OPERATION_COSTS = {
  COUPLE_MOODBOARD_GENERATION: 1, // Generate a moodboard
  COUPLE_MOODBOARD_EDIT: 1,       // Edit/modify a moodboard image
  PLANNER_IMAGE_GENERATION: 1,    // Planner AI Image Tools (Angle, Retexture, etc.)
  PLANNER_VIDEO_GENERATION: 5,    // Planner AI Video Generation (Configurable placeholder)
  // Pipeline AI operations (planner wallet)
  PIPELINE_VENUE_360: 3,
  PIPELINE_LAYOUT_PLAN: 1,        // AI zone plan on the venue view (vision model)
  PIPELINE_COMPONENT_SPECS: 1,    // AI size/material/price estimate for one element          // AI 360 eye-level panorama of the decorated venue
  PIPELINE_VENUE_ISOMETRIC: 3,    // Generate isometric drone view from ground + satellite photos
  PIPELINE_COMPONENT_SHEET: 1,    // Generate component characteristic sheet
  PIPELINE_COMPONENT_BOARD: 3,    // Six-view architectural presentation board (high quality)
  PIPELINE_PLACEMENT: 2,          // Place a component into the venue isometric
  PIPELINE_SHOWCASE: 2,           // Full-design venue showcase render
  PIPELINE_REGION_EDIT: 2,        // Numbered ellipse region edit of an approved base image
  PIPELINE_ELEMENT_VIEW: 1,       // Re-render one decor element from a camera angle
};

/**
 * Defines the priority order for consuming credits.
 * The system will consume credits from these buckets in this exact order.
 */
export const CONSUMPTION_PRIORITY = [
  "freeCredits",
  "subscriptionCredits",
  "purchasedCredits",
  "bonusCredits",
  "promotionalCredits",
];

export const TRANSACTION_TYPES = {
  CREDIT: "credit",
  DEBIT: "debit",
};

export const TRANSACTION_SOURCES = {
  FREE_PLAN: "free_plan",
  SUBSCRIPTION: "subscription",
  PURCHASED: "purchased",
  BONUS: "bonus",
  PROMOTIONAL: "promotional",
  REFERRAL: "referral",
  ADMIN: "admin_adjustment",
  AI_GENERATION: "ai_generation",
  REFUND: "refund",
};

export const TRANSACTION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
};

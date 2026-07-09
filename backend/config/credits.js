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
};

/**
 * Defines the cost in credits for various AI operations.
 * Future features should add their costs here instead of hardcoding them in endpoints.
 */
export const OPERATION_COSTS = {
  COUPLE_MOODBOARD_GENERATION: 1, // Generate a moodboard
  COUPLE_MOODBOARD_EDIT: 1,       // Edit/modify a moodboard image
  // Future costs can be added here (e.g. AI_VIDEO: 5)
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

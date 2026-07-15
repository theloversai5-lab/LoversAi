import mongoose from "mongoose";
import { TRANSACTION_TYPES, TRANSACTION_SOURCES, TRANSACTION_STATUS } from "../config/credits.js";

const creditTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productType: {
      type: String,
      enum: ["couple", "planner", "vendor", "decor", "catering", "studio"],
      default: "couple",
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1, // Must be a positive amount
    },
    source: {
      type: String,
      enum: Object.values(TRANSACTION_SOURCES),
      required: true,
    },
    bucketAffected: {
      type: String,
      required: true, // e.g., 'freeCredits', 'subscriptionCredits'
    },
    reference: {
      type: String,
      required: true, // E.g. moodboard generation ID, subscription invoice ID
      index: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.COMPLETED,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to support fast fetching and analytics
creditTransactionSchema.index({ userId: 1, productType: 1, createdAt: -1 });
creditTransactionSchema.index({ type: 1, source: 1, productType: 1, createdAt: -1 });

export default mongoose.model("CreditTransaction", creditTransactionSchema);

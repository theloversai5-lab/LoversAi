import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeCredits: { type: Number, default: 0, min: 0 },
    subscriptionCredits: { type: Number, default: 0, min: 0 },
    purchasedCredits: { type: Number, default: 0, min: 0 },
    bonusCredits: { type: Number, default: 0, min: 0 },
    promotionalCredits: { type: Number, default: 0, min: 0 },
    lifetimeAdded: { type: Number, default: 0 },
    lifetimeUsed: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure a user can only have one wallet per product type
walletSchema.index({ userId: 1, productType: 1 }, { unique: true });

export default mongoose.model("Wallet", walletSchema);

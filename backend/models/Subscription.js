import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    // 🔗 USER
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🧾 Lemon Squeezy identifiers
    lemonSubscriptionId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple nulls
      index: true,
    },

    lemonCustomerId: {
      type: String,
      index: true,
      sparse: true,
    },

    lemonOrderId: {
      type: String,
      index: true,
    },

    lemonOrderNumber: {
      type: String,
    },

    // 📦 PLAN DETAILS
    plan: {
      type: String,
      enum: ["free", "basic", "premium"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "cancelled", "expired", "past_due"],
      default: "pending",
      index: true,
    },

    price: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "USD",
    },

    // 🎟️ CREDIT SYSTEM
    creditsGranted: {
      type: Number,
      required: true,
    },

    creditsUsed: {
      type: Number,
      default: 0,
    },

    // 💳 PAYMENT DETAILS
    paymentMethod: String,
    cardBrand: String,
    cardLastFour: String,

    lastPaymentStatus: {
      type: String,
      enum: ["success", "failed", "pending", "refunded", null],
      default: null,
    },

    lastPaymentAt: {
      type: Date,
      default: null,
    },

    // ⏱️ TIMING
    startsAt: {
      type: Date,
      default: Date.now,
    },

    renewsAt: {
      type: Date,
    },

    endsAt: {
      type: Date,
    },

    cancelled: {
      type: Boolean,
      default: false,
    },

    cancelledAt: {
      type: Date,
    },

    // 🔔 Webhook info
    lastWebhookEvent: String,
    lastWebhookReceivedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ✅ VIRTUAL FIELD – always accurate
subscriptionSchema.virtual("creditsRemaining").get(function () {
  return Math.max(0, this.creditsGranted - (this.creditsUsed || 0));
});

// 🔍 Index for fast lookup of current subscription
subscriptionSchema.index({ userId: 1, createdAt: -1 });
subscriptionSchema.index({ userId: 1, status: 1 });

export default mongoose.model("Subscription", subscriptionSchema);

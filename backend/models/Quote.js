// models/Quote.js — Wedding Quote / Bid Request model
import mongoose from "mongoose";

const quoteImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    label: String,
    prompt: String,
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    // Who submitted the quote request
    couple: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The final hired planner after the couple makes a choice
    hiredPlanner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Array of all planner responses/bids
    responses: [
      {
        planner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        quotedPrice: { type: Number, required: true },
        quotedMessage: String,
        status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Selected AI-generated images from the cart
    images: [quoteImageSchema],

    // Event details captured at submission
    eventDetails: {
      weddingDate: Date,
      budget: String,
      guestCount: Number,
      city: String,
      venue: String,
      tradition: String,
      notes: String,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "viewed", "quoted", "accepted", "rejected", "expired"],
      default: "pending",
      index: true,
    },

    // Couple's final response time when choosing a planner
    respondedAt: Date,

    // Moodboard validity (7 days from creation)
    moodboardExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: true,
    },

    // Quote expiry (auto-expire after 30 days if no response)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient queries
quoteSchema.index({ couple: 1, status: 1 });
quoteSchema.index({ hiredPlanner: 1, status: 1 });
quoteSchema.index({ 'responses.planner': 1 });
quoteSchema.index({ createdAt: -1 });

export default mongoose.model("Quote", quoteSchema);
